"""
Email utility for sending transactional emails via Gmail SMTP or Resend.
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import resend
from app.config import settings


def send_reset_code_email(to_email: str, code: str, full_name: str) -> bool:
    """
    Send a password reset verification code email.
    Supports:
      1. Gmail SMTP (via settings.smtp_email & settings.smtp_password) - sends from wisdomflowai@gmail.com
      2. Resend API (via settings.resend_api_key)
      3. Console fallback for local dev
    Returns True if sent successfully, False otherwise.
    """
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#fcfbf9; font-family:'Courier New', Courier, monospace;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fcfbf9; padding:40px 20px;">
            <tr>
                <td align="center">
                    <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border:2px solid #18181b; box-shadow:3px 3px 0px #18181b;">
                        
                        <!-- Header -->
                        <tr>
                            <td style="padding:28px 32px 16px; border-bottom:1.5px solid #e7e5e4;">
                                <div style="font-size:10px; font-weight:bold; color:#78716c; letter-spacing:2px; text-transform:uppercase;">
                                    [ WISDOMFLOW // SECURITY DISPATCH ]
                                </div>
                                <h1 style="margin:8px 0 0; font-size:18px; font-weight:bold; color:#18181b; letter-spacing:-0.5px;">
                                    Password Reset Code
                                </h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:24px 32px;">
                                <p style="margin:0 0 16px; font-size:13px; color:#44403c; line-height:1.6;">
                                    Hello <strong>{full_name}</strong>,
                                </p>
                                <p style="margin:0 0 24px; font-size:13px; color:#44403c; line-height:1.6;">
                                    A password reset was requested for your WisdomFlow account. Use the verification code below to proceed:
                                </p>

                                <!-- Code Box -->
                                <div style="background-color:#fafaf9; border:2px solid #18181b; padding:20px; text-align:center; margin:0 0 24px; box-shadow:2px 2px 0px #18181b;">
                                    <div style="font-size:10px; font-weight:bold; color:#78716c; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px;">
                                        VERIFICATION CODE
                                    </div>
                                    <div style="font-size:36px; font-weight:bold; color:#18181b; letter-spacing:12px; font-family:'Courier New', Courier, monospace;">
                                        {code}
                                    </div>
                                </div>

                                <p style="margin:0 0 8px; font-size:12px; color:#78716c; line-height:1.5;">
                                    &#8226; This code expires in <strong>10 minutes</strong>.
                                </p>
                                <p style="margin:0; font-size:12px; color:#78716c; line-height:1.5;">
                                    &#8226; If you did not request this, you can safely ignore this email.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding:16px 32px 24px; border-top:1.5px solid #e7e5e4;">
                                <p style="margin:0; font-size:10px; color:#a8a29e; letter-spacing:1px; text-transform:uppercase;">
                                    WisdomFlow AI &mdash; Structured Learning Architecture
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    subject = f"{code} — Your WisdomFlow Password Reset Code"

    # 1. Gmail SMTP (Sends directly from wisdomflowai@gmail.com to ANY email)
    if settings.smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"WisdomFlow AI <{settings.smtp_email}>"
            msg["To"] = to_email

            part = MIMEText(html_body, "html")
            msg.attach(part)

            auth_username = settings.smtp_login or settings.smtp_email
            if settings.smtp_port == 465:
                with smtplib.SMTP_SSL(settings.smtp_server, settings.smtp_port) as server:
                    server.login(auth_username, settings.smtp_password)
                    server.sendmail(settings.smtp_email, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(settings.smtp_server, settings.smtp_port) as server:
                    server.starttls()
                    server.login(auth_username, settings.smtp_password)
                    server.sendmail(settings.smtp_email, [to_email], msg.as_string())

            print(f"[EMAIL] Reset code sent to {to_email} via SMTP ({settings.smtp_server})")
            return True
        except Exception as e:
            print(f"[SMTP ERROR] Failed to send via SMTP ({settings.smtp_server}): {e}")

    # 2. Resend API (Fallback if RESEND_API_KEY is configured)
    if settings.resend_api_key:
        try:
            resend.api_key = settings.resend_api_key
            resend.Emails.send({
                "from": "WisdomFlow AI <onboarding@resend.dev>",
                "to": [to_email],
                "subject": subject,
                "html": html_body,
            })
            print(f"[EMAIL] Reset code sent to {to_email} via Resend")
            return True
        except Exception as e:
            print(f"[RESEND ERROR] Failed to send via Resend to {to_email}: {e}")

    # 3. Dev Fallback: Print to console
    print(f"==== PASSWORD RESET CODE (FALLBACK) ====")
    print(f"Email: {to_email}")
    print(f"Code:  {code}")
    print(f"========================================")
    return False


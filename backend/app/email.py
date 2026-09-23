"""
Email utility for sending transactional emails via Gmail/Brevo SMTP or Resend.
Supports:
  1. Password Reset Verification OTP
  2. Welcome / Onboarding Email for new accounts
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import resend
from app.config import settings


def _dispatch_email(to_email: str, subject: str, html_body: str, fallback_log: str = "") -> bool:
    """
    Internal helper to send an HTML email using configured provider (SMTP -> Resend -> Console).
    """
    # 1. SMTP (Brevo / Gmail / Custom SMTP)
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

            print(f"[EMAIL] Sent '{subject}' to {to_email} via SMTP ({settings.smtp_server})")
            return True
        except Exception as e:
            print(f"[SMTP ERROR] Failed to send via SMTP ({settings.smtp_server}): {e}")

    # 2. Resend API Fallback
    if settings.resend_api_key:
        try:
            resend.api_key = settings.resend_api_key
            resend.Emails.send({
                "from": "WisdomFlow AI <onboarding@resend.dev>",
                "to": [to_email],
                "subject": subject,
                "html": html_body,
            })
            print(f"[EMAIL] Sent '{subject}' to {to_email} via Resend")
            return True
        except Exception as e:
            print(f"[RESEND ERROR] Failed to send via Resend to {to_email}: {e}")

    # 3. Dev Fallback: Print to console
    print(f"==== EMAIL DISPATCH (DEV FALLBACK) ====")
    print(f"To:      {to_email}")
    print(f"Subject: {subject}")
    if fallback_log:
        print(fallback_log)
    print(f"========================================")
    return False


def send_reset_code_email(to_email: str, code: str, full_name: str) -> bool:
    """
    Send a password reset verification code email.
    """
    subject = f"{code} — Your WisdomFlow Password Reset Code"
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
    return _dispatch_email(to_email, subject, html_body, fallback_log=f"Reset Code: {code}")


def send_welcome_email(to_email: str, full_name: str) -> bool:
    """
    Send an onboarding welcome email to newly registered users in WisdomFlow's editorial sketch style.
    """
    subject = f"Welcome to WisdomFlow AI, {full_name} — System Initialized"
    frontend_url = (settings.frontend_url or "https://wisdomflow-ai.vercel.app").rstrip("/")
    if "localhost" in frontend_url:
        frontend_url = "https://wisdomflow-ai.vercel.app"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#fcfbf9; font-family:'Courier New', Courier, monospace; color:#18181b;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fcfbf9; padding:40px 16px;">
            <tr>
                <td align="center">
                    <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border:2px solid #18181b; box-shadow:4px 4px 0px #18181b;">
                        
                        <!-- Header -->
                        <tr>
                            <td style="padding:28px 32px 20px; border-bottom:1.5px solid #e7e5e4;">
                                <div style="font-size:10px; font-weight:bold; color:#78716c; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px;">
                                    [ WISDOMFLOW // ONBOARDING PROTOCOL ]
                                </div>
                                <h1 style="margin:0; font-size:22px; font-weight:bold; color:#18181b; letter-spacing:-0.5px;">
                                    Welcome to WisdomFlow AI
                                </h1>
                                <p style="margin:6px 0 0; font-size:12px; color:#78716c; letter-spacing:0.5px;">
                                    Intelligent Learning Architecture &bull; Account Initialized
                                </p>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:28px 32px;">
                                <p style="margin:0 0 16px; font-size:14px; color:#292524; line-height:1.6;">
                                    Greetings <strong>{full_name}</strong>,
                                </p>
                                <p style="margin:0 0 24px; font-size:13px; color:#44403c; line-height:1.6;">
                                    Your student workspace has been activated. WisdomFlow AI transforms unstructured textbooks, documents, and notes into dynamic, high-retention cognitive workflows.
                                </p>

                                <!-- Module Highlights -->
                                <div style="margin-bottom:28px;">
                                    <div style="font-size:10px; font-weight:bold; color:#78716c; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:12px;">
                                        CORE WORKSPACE CAPABILITIES:
                                    </div>

                                    <!-- Module 1 -->
                                    <div style="background-color:#fafaf9; border:1.5px solid #18181b; padding:12px 16px; margin-bottom:10px; box-shadow:2px 2px 0px #18181b;">
                                        <div style="font-size:11px; font-weight:bold; color:#18181b; text-transform:uppercase; letter-spacing:1px;">
                                            [01] AI DOCUMENT SYNTHESIS
                                        </div>
                                        <div style="font-size:12px; color:#57534e; margin-top:4px; line-height:1.4;">
                                            Upload PDFs and lecture notes to extract structured chapter summaries, formulas, and actionable takeaways.
                                        </div>
                                    </div>

                                    <!-- Module 2 -->
                                    <div style="background-color:#fafaf9; border:1.5px solid #18181b; padding:12px 16px; margin-bottom:10px; box-shadow:2px 2px 0px #18181b;">
                                        <div style="font-size:11px; font-weight:bold; color:#18181b; text-transform:uppercase; letter-spacing:1px;">
                                            [02] ADAPTIVE FLASHCARDS
                                        </div>
                                        <div style="font-size:12px; color:#57534e; margin-top:4px; line-height:1.4;">
                                            Reinforce memory retention using spaced repetition decks generated instantly from your study material.
                                        </div>
                                    </div>

                                    <!-- Module 3 -->
                                    <div style="background-color:#fafaf9; border:1.5px solid #18181b; padding:12px 16px; margin-bottom:10px; box-shadow:2px 2px 0px #18181b;">
                                        <div style="font-size:11px; font-weight:bold; color:#18181b; text-transform:uppercase; letter-spacing:1px;">
                                            [03] INTERACTIVE ROADMAPS
                                        </div>
                                        <div style="font-size:12px; color:#57534e; margin-top:4px; line-height:1.4;">
                                            Generate mastery trees and structured competency checkpoints tailored to your specific academic syllabus.
                                        </div>
                                    </div>

                                    <!-- Module 4 -->
                                    <div style="background-color:#fafaf9; border:1.5px solid #18181b; padding:12px 16px; margin-bottom:10px; box-shadow:2px 2px 0px #18181b;">
                                        <div style="font-size:11px; font-weight:bold; color:#18181b; text-transform:uppercase; letter-spacing:1px;">
                                            [04] VOICE TUTOR
                                        </div>
                                        <div style="font-size:12px; color:#57534e; margin-top:4px; line-height:1.4;">
                                            Engage in real-time spoken dialogue with your personalized AI tutor to talk through tough exam problems.
                                        </div>
                                    </div>
                                </div>

                                <!-- CTA Button -->
                                <div style="text-align:center; margin:32px 0 16px;">
                                    <a href="{frontend_url}/dashboard" 
                                       target="_blank"
                                       style="display:inline-block; background-color:#18181b; color:#ffffff; font-family:'Courier New', Courier, monospace; font-size:13px; font-weight:bold; text-decoration:none; padding:14px 28px; border:2px solid #18181b; box-shadow:3px 3px 0px #78716c; text-transform:uppercase; letter-spacing:1px;">
                                        Launch Workspace &rarr;
                                    </a>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding:20px 32px 24px; border-top:1.5px solid #e7e5e4; background-color:#fafaf9;">
                                <p style="margin:0 0 6px; font-size:11px; font-weight:bold; color:#18181b; letter-spacing:0.5px;">
                                    WISDOMFLOW AI &bull; NEXT-GEN STUDY PLATFORM
                                </p>
                                <p style="margin:0; font-size:10px; color:#a8a29e; line-height:1.4;">
                                    Automated dispatch sent to {to_email}. You are receiving this because an account was initialized with this address.
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
    return _dispatch_email(to_email, subject, html_body, fallback_log=f"Welcome email queued for {to_email}")

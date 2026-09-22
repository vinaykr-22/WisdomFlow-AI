import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ArrowRight, Loader2, CheckCircle2, AlertCircle, KeyRound, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { WisdomFlowLogo } from '../components/ui/WisdomFlowLogo';

export default function ForgotPassword() {
  const navigate = useNavigate();

  // Step 1: email, Step 2: new password
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return;
    setStep(2);
  };

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/direct-reset-password', {
        email: email.trim().toLowerCase(),
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to reset password. Please check the email and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfbf9] dark:bg-stone-950 px-4 py-12 text-stone-900 dark:text-stone-100 font-sans selection:bg-stone-900 selection:text-stone-100">
      <div className="w-full max-w-md space-y-6">

        {/* Editorial Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <WisdomFlowLogo size={44} />
          <div className="flex items-center gap-2 pt-1">
            <span className="font-mono text-lg font-bold tracking-tight uppercase">
              WISDOMFLOW
            </span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 border border-stone-900 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-200">
              RECOVERY
            </span>
          </div>
          <p className="font-mono text-[11px] text-stone-500 uppercase tracking-wide">
            Account Credential Recovery // Security Gateway
          </p>
        </div>

        {/* Technical Outlined Panel */}
        <div className="bg-white dark:bg-stone-900 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 p-6 sm:p-8 shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#0c0a09] space-y-6">
          <div className="space-y-1 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                {step === 1 ? '[ STEP 01 // IDENTIFY ACCOUNT ]' : '[ STEP 02 // NEW CREDENTIAL ]'}
              </span>
              <KeyRound size={14} className="text-stone-400" />
            </div>
            <h1 className="text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              {step === 1 ? 'Identify Your Account' : 'Set New Password'}
            </h1>
            <p className="text-xs text-stone-500">
              {step === 1
                ? 'Enter the email address associated with your account.'
                : <>Resetting password for <span className="font-bold text-stone-700 dark:text-stone-300">{email}</span></>
              }
            </p>
          </div>

          {/* Step progress indicator */}
          <div className="flex items-center gap-2">
            <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-stone-900 dark:bg-stone-100' : 'bg-stone-200 dark:bg-stone-800'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-stone-900 dark:bg-stone-100' : 'bg-stone-200 dark:bg-stone-800'}`} />
          </div>

          {success ? (
            <div className="p-4 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-900 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider">
                    [ PASSWORD UPDATED ]
                  </div>
                  <p className="mt-1 leading-relaxed">
                    Your password has been successfully reset. You can now sign in with your new credentials.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 font-mono text-xs uppercase font-bold text-emerald-900 dark:text-emerald-200 hover:underline"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ) : step === 1 ? (
            /* ───── STEP 1: Email ───── */
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-[2px] bg-rose-50 dark:bg-rose-950/40 border border-rose-900 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-700 dark:text-rose-400" />
                  <div className="space-y-0.5">
                    <span className="font-mono text-[10px] font-bold block uppercase tracking-wider">
                      [ ERROR ]
                    </span>
                    <span className="leading-relaxed">{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-email"
                  className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
                >
                  Account Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full h-10 px-3 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-300 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={!email.trim()}
                className="w-full h-10 mt-2 px-4 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 hover:bg-black dark:hover:bg-white font-mono text-xs uppercase font-bold tracking-wider shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight size={13} />
              </button>
            </form>
          ) : (
            /* ───── STEP 2: New Password ───── */
            <form onSubmit={handleResetSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-[2px] bg-rose-50 dark:bg-rose-950/40 border border-rose-900 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-700 dark:text-rose-400" />
                  <div className="space-y-0.5">
                    <span className="font-mono text-[10px] font-bold block uppercase tracking-wider">
                      [ RESET ERROR ]
                    </span>
                    <span className="leading-relaxed">{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
                >
                  New Password (min. 6 characters)
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    autoFocus
                    className="w-full h-10 pl-3 pr-10 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-300 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
                >
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full h-10 px-3 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-300 transition-colors"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); setNewPassword(''); setConfirmPassword(''); }}
                  className="h-10 px-4 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-700 font-mono text-xs uppercase font-bold tracking-wider shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="flex-1 h-10 px-4 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 hover:bg-black dark:hover:bg-white font-mono text-xs uppercase font-bold tracking-wider shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <>
                      <span>Reset Password</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Navigation Link */}
        <div className="text-center font-mono text-xs text-stone-500 space-x-1">
          <span>Remember your credentials?</span>
          <Link
            to="/login"
            className="font-bold text-stone-900 dark:text-stone-100 underline decoration-stone-400 underline-offset-4 hover:decoration-stone-900"
          >
            Sign In Directly
          </Link>
        </div>

      </div>
    </div>
  );
}

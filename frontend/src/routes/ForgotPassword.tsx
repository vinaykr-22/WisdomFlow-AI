import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { ArrowRight, Loader2, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { WisdomFlowLogo } from '../components/ui/WisdomFlowLogo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch {
      setError('An error occurred while processing recovery request. Please try again.');
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
                [ SECURITY // RESET DISPATCH ]
              </span>
              <KeyRound size={14} className="text-stone-400" />
            </div>
            <h1 className="text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Reset Access Key
            </h1>
            <p className="text-xs text-stone-500">
              Provide your account email to receive a signed cryptographic reset token.
            </p>
          </div>

          {success ? (
            <div className="p-4 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-900 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-700 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider">
                    [ DISPATCH CONFIRMATION ]
                  </div>
                  <p className="mt-1 leading-relaxed">
                    If an account is associated with <span className="font-bold">{email}</span>, a reset token dispatch has been triggered.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 font-mono text-xs uppercase font-bold text-emerald-900 dark:text-emerald-200 hover:underline"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-[2px] bg-rose-50 dark:bg-rose-950/40 border border-rose-900 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-700 dark:text-rose-400" />
                  <div className="space-y-0.5">
                    <span className="font-mono text-[10px] font-bold block uppercase tracking-wider">
                      [ RECOVERY ERROR ]
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
                  Account Electronic Mail
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="scholar@domain.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  required
                  autoComplete="email"
                  className="w-full h-10 px-3 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-300 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full h-10 mt-2 px-4 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 hover:bg-black dark:hover:bg-white font-mono text-xs uppercase font-bold tracking-wider shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Transmitting Dispatch...</span>
                  </>
                ) : (
                  <>
                    <span>Dispatch Recovery Link</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
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

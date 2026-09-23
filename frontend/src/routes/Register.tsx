import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';
import { ArrowRight, Loader2, AlertCircle, UserPlus, Eye, EyeOff } from 'lucide-react';
import { WisdomFlowLogo } from '../components/ui/WisdomFlowLogo';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both password entries.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
      });
      setTokens(data.access_token, data.refresh_token);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed. This email may already have an active profile.';
      setError(msg);
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
              WORKSPACE
            </span>
          </div>
          <p className="font-mono text-[11px] text-stone-500 uppercase tracking-wide">
            Structured Learning Architecture // Account Registration
          </p>
        </div>

        {/* Technical Outlined Registration Panel */}
        <div className="bg-white dark:bg-stone-900 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 p-6 sm:p-8 shadow-[3px_3px_0px_#18181b] dark:shadow-[3px_3px_0px_#0c0a09] space-y-6">
          <div className="space-y-1 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                [ PROVISION // NEW USER PROFILE ]
              </span>
              <UserPlus size={14} className="text-stone-400" />
            </div>
            <h1 className="text-base font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Create Student Profile
            </h1>
            <p className="text-xs text-stone-500">
              Set up your personal learning workspace, document store, and roadmaps.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-[2px] bg-rose-50 dark:bg-rose-950/40 border border-rose-900 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-700 dark:text-rose-400" />
              <div className="space-y-0.5">
                <span className="font-mono text-[10px] font-bold block uppercase tracking-wider">
                  [ REGISTRATION NOTICE ]
                </span>
                <span className="leading-relaxed">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label 
                htmlFor="register-fullname" 
                className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
              >
                Full Legal / Scholar Name
              </label>
              <input
                id="register-fullname"
                type="text"
                placeholder="Alex Mercer"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                className="w-full h-10 px-3 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-300 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label 
                htmlFor="register-email" 
                className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
              >
                Electronic Mail Address
              </label>
              <input
                id="register-email"
                type="email"
                placeholder="scholar@domain.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-10 px-3 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-300 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label 
                htmlFor="register-password" 
                className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
              >
                Secure Password (Min. 6 chars)
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full h-10 pl-3 pr-10 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-300 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-0 top-0 bottom-0 px-3 flex items-center text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label 
                htmlFor="register-confirm-password" 
                className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
              >
                Re-enter Password
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full h-10 pl-3 pr-10 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-300 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-0 top-0 bottom-0 px-3 flex items-center text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password || !confirmPassword || !fullName}
              className="w-full h-10 mt-2 px-4 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 hover:bg-black dark:hover:bg-white font-mono text-xs uppercase font-bold tracking-wider shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Registering Profile...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace Profile</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Navigation Link */}
        <div className="text-center font-mono text-xs text-stone-500 space-x-1">
          <span>Already registered?</span>
          <Link
            to="/login"
            className="font-bold text-stone-900 dark:text-stone-100 underline decoration-stone-400 underline-offset-4 hover:decoration-stone-900"
          >
            Access Existing Account
          </Link>
        </div>

      </div>
    </div>
  );
}

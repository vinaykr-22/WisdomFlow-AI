import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { WisdomFlowLogo } from '../components/ui/WisdomFlowLogo';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
      });
      setTokens(data.access_token, data.refresh_token);
      navigate('/dashboard');
    } catch {
      setError('Registration failed. This email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-100">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-200">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <WisdomFlowLogo size={48} />
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              WisdomFlow
            </span>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 px-1.5 py-0.5 rounded">
              AI
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Intelligent study workspace & personalized learning
          </p>
        </div>

        {/* Focused Registration Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Create your account
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Get started with your personalized learning workspace.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label 
                htmlFor="register-fullname" 
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Full Name
              </label>
              <input
                id="register-fullname"
                type="text"
                placeholder="Alex Mercer"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600/30 dark:focus:ring-indigo-500/30 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label 
                htmlFor="register-email" 
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Email Address
              </label>
              <input
                id="register-email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600/30 dark:focus:ring-indigo-500/30 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label 
                htmlFor="register-password" 
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <input
                id="register-password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full h-10 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600/30 dark:focus:ring-indigo-500/30 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password || !fullName}
              className="w-full h-10 mt-2 px-4 rounded-lg bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 disabled:pointer-events-none transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Navigation Link */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
          >
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}

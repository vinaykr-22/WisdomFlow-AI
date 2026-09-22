import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { BrainCircuit, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !token) {
      setError('Invalid reset link.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { 
        email, 
        token, 
        new_password: newPassword 
      });
      alert('Password reset successfully! Please login with your new password.');
      navigate('/login');
    } catch {
      setError('Invalid or expired reset token. Please request a new one.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-900 selection:bg-blue-200 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-blue-100 font-sans">
      <div className="lg:w-1/2 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white p-12 flex flex-col justify-between relative overflow-hidden hidden lg:flex">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-1/4 right-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-24 left-1/4 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 space-y-6 mt-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20">
              <BrainCircuit size={32} className="text-blue-300" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">WisdomFlow<span className="text-blue-400">AI</span></h1>
          </div>
          
          <h2 className="text-4xl lg:text-6xl font-bold leading-tight">
            Set New <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Password</span>
          </h2>
          <p className="text-lg text-blue-100/80 max-w-md leading-relaxed">
            Create a strong new password for your account to get back into your learning environment.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative">
        <div className="w-full max-w-md space-y-8 animate-in slide-in-from-right-8 duration-700">
          
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Set New Password</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Enter your new password below.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-medium border border-red-100 dark:border-red-900/50 flex items-center justify-center">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value.trim())}
                    required
                    minLength={6}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder-slate-400 dark:placeholder-slate-500 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !newPassword}
              className="w-full bg-slate-900 text-white rounded-2xl py-4 font-bold hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={20} className="animate-spin" /> Resetting...</>
              ) : (
                <>Reset Password <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          <p className="text-center text-slate-600 dark:text-slate-400 font-medium">
            Remembered your password?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
      
    </div>
  );
}

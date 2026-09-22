import { useState, useEffect, useRef, useCallback } from 'react';
import api, { getMediaUrl } from '../api/client';
import { useAuthStore } from '../stores/auth';
import {
  User,
  ShieldCheck,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
  GraduationCap,
  X,
  FileText,
  HelpCircle,
  Layers,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  profile_photo_url?: string;
  bio?: string;
  school?: string;
}

interface UserStats {
  documents: number;
  quizzes: number;
  flashcard_sets: number;
}

type SettingsTab = 'profile' | 'academic' | 'security';

export default function ProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Security password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Academic details state
  const [bio, setBio] = useState('');
  const [school, setSchool] = useState('');
  const [detailsStatus, setDetailsStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, statsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/auth/me/stats'),
      ]);
      setProfile(profileRes.data);
      setBio(profileRes.data.bio || '');
      setSchool(profileRes.data.school || '');
      setStats(statsRes.data);
      setUser(profileRes.data);
    } catch {
      console.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
      setPasswordStatus('idle');
      setDetailsStatus('idle');
      setCurrentPassword('');
      setNewPassword('');
      setErrorMsg('');
    }
  }, [isOpen, loadProfile]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/auth/me/photo', formData);
      setProfile((prev) =>
        prev ? { ...prev, profile_photo_url: data.profile_photo_url } : null
      );
      if (profile) {
        setUser({ ...profile, profile_photo_url: data.profile_photo_url });
      }
    } catch {
      console.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsStatus('loading');
    try {
      const { data } = await api.put('/auth/me', { bio, school });
      setProfile(data);
      setUser(data);
      setDetailsStatus('success');
      setTimeout(() => setDetailsStatus('idle'), 2500);
    } catch {
      setDetailsStatus('idle');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    setPasswordStatus('loading');
    setErrorMsg('');
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordStatus('success');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordStatus('idle'), 3000);
    } catch (err: unknown) {
      setPasswordStatus('error');
      const errorResponse = err as { response?: { data?: { detail?: string } } };
      setErrorMsg(errorResponse?.response?.data?.detail || 'Failed to change password');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Modal Container */}
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="h-14 px-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Account Settings
            </h2>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Manage your profile and study preferences
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body: Sidebar Navigation + Content Section */}
        <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
          
          {/* Left Category Navigation Rail */}
          <div className="w-full sm:w-56 p-2 sm:p-3 sm:border-r border-b sm:border-b-0 border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/30 flex sm:flex-col gap-1 flex-shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <User size={15} className="flex-shrink-0" />
              <span>General Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('academic')}
              className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'academic'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <GraduationCap size={15} className="flex-shrink-0" />
              <span>Academic Details</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer whitespace-nowrap ${
                activeTab === 'security'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Lock size={15} className="flex-shrink-0" />
              <span>Security & Password</span>
            </button>
          </div>

          {/* Right Content Section */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-6">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Loading account information...</span>
              </div>
            ) : profile ? (
              <>
                {/* 1. General Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        General Profile
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Your basic account identity and learning workspace metadata.
                      </p>
                    </div>

                    {/* Avatar and Basic Details */}
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <div className="relative flex-shrink-0">
                        {profile.profile_photo_url ? (
                          <img
                            src={getMediaUrl(profile.profile_photo_url)}
                            alt="Profile"
                            className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xl flex items-center justify-center border-2 border-slate-200 dark:border-slate-700">
                            {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                          title="Upload new photo"
                        >
                          {uploadingPhoto ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Camera size={12} />
                          )}
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {profile.full_name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {profile.email}
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded">
                            <ShieldCheck size={12} /> Active Account
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Clean Learning Resource Summary */}
                    {stats && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Workspace Resources
                        </span>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                            <div className="flex items-center justify-center text-slate-400 mb-1">
                              <FileText size={16} />
                            </div>
                            <span className="block text-base font-bold text-slate-900 dark:text-slate-100">
                              {stats.documents}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Documents
                            </span>
                          </div>

                          <div className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                            <div className="flex items-center justify-center text-slate-400 mb-1">
                              <HelpCircle size={16} />
                            </div>
                            <span className="block text-base font-bold text-slate-900 dark:text-slate-100">
                              {stats.quizzes}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Quizzes
                            </span>
                          </div>

                          <div className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                            <div className="flex items-center justify-center text-slate-400 mb-1">
                              <Layers size={16} />
                            </div>
                            <span className="block text-base font-bold text-slate-900 dark:text-slate-100">
                              {stats.flashcard_sets}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Decks
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Academic Details Tab */}
                {activeTab === 'academic' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Academic Details
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Customize your educational context so AI tutors tailor responses to your level.
                      </p>
                    </div>

                    <form onSubmit={handleSaveDetails} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Institution / School
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Stanford University or MIT"
                          value={school}
                          onChange={(e) => setSchool(e.target.value)}
                          className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600/30 dark:focus:ring-indigo-500/30 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Field of Study / Major
                        </label>
                        <textarea
                          placeholder="e.g. Computer Science student specializing in distributed systems and ML..."
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={3}
                          className="w-full p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600/30 dark:focus:ring-indigo-500/30 transition-colors resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {detailsStatus === 'success' && (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> Changes saved successfully
                          </span>
                        )}
                        <div className="ml-auto">
                          <button
                            type="submit"
                            disabled={detailsStatus === 'loading'}
                            className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                          >
                            {detailsStatus === 'loading' ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <span>Save Details</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* 3. Security & Password Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-5 animate-in fade-in duration-150">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Security & Credentials
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage your account authentication password.
                      </p>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                      {passwordStatus === 'success' && (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                          <CheckCircle2 size={15} />
                          <span>Password updated successfully.</span>
                        </div>
                      )}

                      {passwordStatus === 'error' && (
                        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                          <span>{errorMsg || 'Failed to update password.'}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Current Password
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600/30 dark:focus:ring-indigo-500/30 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          New Password
                        </label>
                        <input
                          type="password"
                          placeholder="Minimum 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600/30 dark:focus:ring-indigo-500/30 transition-colors"
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={
                            passwordStatus === 'loading' || !currentPassword || !newPassword
                          }
                          className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          {passwordStatus === 'loading' ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <span>Update Password</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-xs text-slate-400 py-12">
                Unable to load account information.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

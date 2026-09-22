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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      
      {/* Modal Container */}
      <div className="w-full max-w-3xl bg-white dark:bg-stone-900 rounded-[2px] border-[2px] border-stone-900 dark:border-stone-700 shadow-[6px_6px_0px_#18181b] dark:shadow-[6px_6px_0px_#000] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="h-14 px-5 sm:px-6 border-b-[1.5px] border-stone-900 dark:border-stone-700 flex items-center justify-between flex-shrink-0 bg-stone-100/60 dark:bg-stone-800/60">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
              [ SETTINGS // WORKSPACE & PROFILE CONFIGURATION ]
            </span>
            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 border border-stone-900 dark:border-stone-600 bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-200 hidden sm:inline-block">
              CONFIG
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer shadow-[1.5px_1.5px_0px_#18181b]"
            aria-label="Close settings"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body: Sidebar Navigation + Content Section */}
        <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
          
          {/* Left Category Navigation Rail */}
          <div className="w-full sm:w-56 p-2 sm:p-3 sm:border-r-[1.5px] border-b sm:border-b-0 border-stone-900 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 flex sm:flex-col gap-1.5 flex-shrink-0 overflow-x-auto no-scrollbar font-mono text-xs">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-shrink-0 sm:w-full flex items-center gap-2 px-3 py-2 rounded-[2px] transition-all text-left cursor-pointer whitespace-nowrap uppercase font-bold tracking-wider ${
                activeTab === 'profile'
                  ? 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 shadow-[2px_2px_0px_#18181b]'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 border border-transparent'
              }`}
            >
              <User size={14} className="flex-shrink-0" />
              <span>General Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('academic')}
              className={`flex-shrink-0 sm:w-full flex items-center gap-2 px-3 py-2 rounded-[2px] transition-all text-left cursor-pointer whitespace-nowrap uppercase font-bold tracking-wider ${
                activeTab === 'academic'
                  ? 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 shadow-[2px_2px_0px_#18181b]'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 border border-transparent'
              }`}
            >
              <GraduationCap size={14} className="flex-shrink-0" />
              <span>Academic Context</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex-shrink-0 sm:w-full flex items-center gap-2 px-3 py-2 rounded-[2px] transition-all text-left cursor-pointer whitespace-nowrap uppercase font-bold tracking-wider ${
                activeTab === 'security'
                  ? 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 shadow-[2px_2px_0px_#18181b]'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 border border-transparent'
              }`}
            >
              <Lock size={14} className="flex-shrink-0" />
              <span>Security & Key</span>
            </button>
          </div>

          {/* Right Content Section */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto min-h-0 space-y-6">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-stone-400 text-xs gap-2 font-mono">
                <Loader2 size={22} className="animate-spin text-stone-900 dark:text-stone-100" />
                <span>[ RETRIEVING PROFILE RECORD... ]</span>
              </div>
            ) : profile ? (
              <>
                {/* 1. General Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6 animate-in fade-in duration-150">
                    <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        General Identity Profile
                      </h3>
                      <p className="font-mono text-[11px] text-stone-500 mt-0.5">
                        Account identity parameters and registered workspace credentials.
                      </p>
                    </div>

                    {/* Avatar and Basic Details */}
                    <div className="flex items-center gap-4 p-4 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-[#fcfbf9] dark:bg-stone-950 shadow-[2px_2px_0px_#18181b] dark:shadow-[2px_2px_0px_#000]">
                      <div className="relative flex-shrink-0">
                        {profile.profile_photo_url ? (
                          <img
                            src={getMediaUrl(profile.profile_photo_url)}
                            alt="Profile"
                            className="w-16 h-16 rounded-[2px] object-cover border-[1.5px] border-stone-900 dark:border-stone-700"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-[2px] bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono font-bold text-xl flex items-center justify-center border-[1.5px] border-stone-900 dark:border-stone-700">
                            {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="absolute -bottom-1 -right-1 p-1.5 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 border border-stone-900 dark:border-stone-700 rounded-[2px] shadow-[1px_1px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50 cursor-pointer"
                          title="Upload new photo"
                          aria-label="Upload profile photograph"
                        >
                          {uploadingPhoto ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Camera size={11} />
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
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                          {profile.full_name}
                        </h4>
                        <p className="font-mono text-xs text-stone-600 dark:text-stone-400 truncate">
                          {profile.email}
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-800 dark:border-emerald-700 px-1.5 py-0.5 rounded-[2px]">
                            <ShieldCheck size={11} /> [ STATUS // ACTIVE SESSION ]
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Clean Learning Resource Summary */}
                    {stats && (
                      <div className="space-y-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500">
                          [ WORKSPACE REPOSITORIES ]
                        </span>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-center shadow-[2px_2px_0px_#18181b]">
                            <div className="flex items-center justify-center text-stone-400 mb-1">
                              <FileText size={15} />
                            </div>
                            <span className="block font-mono text-base font-bold text-stone-900 dark:text-stone-100">
                              {stats.documents}
                            </span>
                            <span className="font-mono text-[10px] text-stone-500 uppercase">
                              Documents
                            </span>
                          </div>

                          <div className="p-3 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-center shadow-[2px_2px_0px_#18181b]">
                            <div className="flex items-center justify-center text-stone-400 mb-1">
                              <HelpCircle size={15} />
                            </div>
                            <span className="block font-mono text-base font-bold text-stone-900 dark:text-stone-100">
                              {stats.quizzes}
                            </span>
                            <span className="font-mono text-[10px] text-stone-500 uppercase">
                              Quizzes
                            </span>
                          </div>

                          <div className="p-3 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-center shadow-[2px_2px_0px_#18181b]">
                            <div className="flex items-center justify-center text-stone-400 mb-1">
                              <Layers size={15} />
                            </div>
                            <span className="block font-mono text-base font-bold text-stone-900 dark:text-stone-100">
                              {stats.flashcard_sets}
                            </span>
                            <span className="font-mono text-[10px] text-stone-500 uppercase">
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
                    <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        Academic Context & Discipline
                      </h3>
                      <p className="font-mono text-[11px] text-stone-500 mt-0.5">
                        Contextual parameters enabling the tutor workspace to calibrate study material depth.
                      </p>
                    </div>

                    <form onSubmit={handleSaveDetails} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                          Institution / Academic Affiliation
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Stanford University or MIT"
                          value={school}
                          onChange={(e) => setSchool(e.target.value)}
                          className="w-full h-10 px-3 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-100 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                          Field of Study / Academic Focus
                        </label>
                        <textarea
                          placeholder="e.g. Computer Science scholar specializing in distributed systems and systems architecture..."
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={3}
                          className="w-full p-3 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-100 transition-colors resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {detailsStatus === 'success' && (
                          <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> [ DISPATCH // CHANGES RECORDED ]
                          </span>
                        )}
                        <div className="ml-auto">
                          <button
                            type="submit"
                            disabled={detailsStatus === 'loading'}
                            className="h-9 px-4 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 hover:bg-black dark:hover:bg-white font-mono text-xs uppercase font-bold tracking-wider shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            {detailsStatus === 'loading' ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                <span>Recording...</span>
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
                    <div className="border-b border-stone-200 dark:border-stone-800 pb-3">
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        Security & Access Key
                      </h3>
                      <p className="font-mono text-[11px] text-stone-500 mt-0.5">
                        Manage your workspace authentication passkey and credential rotation.
                      </p>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                      {passwordStatus === 'success' && (
                        <div className="p-3 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-800 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2 font-mono">
                          <CheckCircle2 size={14} className="flex-shrink-0" />
                          <span>[ SUCCESS // KEY ROTATION COMPLETED ]</span>
                        </div>
                      )}

                      {passwordStatus === 'error' && (
                        <div className="p-3 rounded-[2px] bg-rose-50 dark:bg-rose-950/40 border border-rose-800 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2 font-mono">
                          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                          <span>[ ERROR ]: {errorMsg || 'Failed to rotate password key.'}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                          Current Passkey
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="w-full h-10 px-3 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-100 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                          Replacement Passkey (Min. 6 chars)
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full h-10 px-3 font-mono text-xs bg-white dark:bg-stone-950 border-[1.5px] border-stone-900 dark:border-stone-700 rounded-[2px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-0 focus:border-stone-900 dark:focus:border-stone-100 transition-colors"
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={
                            passwordStatus === 'loading' || !currentPassword || !newPassword
                          }
                          className="h-9 px-4 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 hover:bg-black dark:hover:bg-white font-mono text-xs uppercase font-bold tracking-wider shadow-[2px_2px_0px_#18181b] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {passwordStatus === 'loading' ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              <span>Rotating Key...</span>
                            </>
                          ) : (
                            <span>Update Passkey</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center font-mono text-xs text-stone-500 py-12">
                [ UNABLE TO LOAD ACCOUNT RECORD ]
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

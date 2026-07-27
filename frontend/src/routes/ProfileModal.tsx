import { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';
import { User, Mail, ShieldCheck, Lock, Loader2, CheckCircle2, XCircle, Camera, GraduationCap, FileText, Layers, HelpCircle, Activity } from 'lucide-react';

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

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [bio, setBio] = useState('');
  const [school, setSchool] = useState('');
  const [detailsStatus, setDetailsStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const setUser = useAuthStore(s => s.setUser);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
      setPasswordStatus('idle');
      setDetailsStatus('idle');
      setCurrentPassword('');
      setNewPassword('');
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [profileRes, statsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/auth/me/stats')
      ]);
      setProfile(profileRes.data);
      setBio(profileRes.data.bio || '');
      setSchool(profileRes.data.school || '');
      setStats(statsRes.data);
      setUser(profileRes.data);
    } catch {
      console.error("Failed to load profile");
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const { data } = await api.post('/auth/me/photo', formData);
      setProfile(prev => prev ? { ...prev, profile_photo_url: data.profile_photo_url } : null);
      if (profile) {
        setUser({ ...profile, profile_photo_url: data.profile_photo_url });
      }
    } catch (err) {
      console.error('Failed to upload photo');
    }
    setUploadingPhoto(false);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsStatus('loading');
    try {
      const { data } = await api.put('/auth/me', { bio, school });
      setProfile(data);
      setUser(data);
      setDetailsStatus('success');
      setTimeout(() => setDetailsStatus('idle'), 3000);
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
        new_password: newPassword
      });
      setPasswordStatus('success');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordStatus('idle'), 3000);
    } catch (err: any) {
      setPasswordStatus('error');
      setErrorMsg(err.response?.data?.detail || 'Failed to change password');
    }
  };

  return (
    <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`absolute top-0 right-0 w-full h-full sm:w-[500px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 p-2 rounded-xl shadow-inner">
              <User size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">My Profile</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            <XCircle size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500 gap-3">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p className="text-sm font-medium">Loading profile...</p>
            </div>
          ) : profile ? (
            <>
              {/* Profile Photo & Basic Info */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  {profile.profile_photo_url ? (
                    <img src={profile.profile_photo_url} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-lg" />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-slate-800 shadow-lg">
                      {profile.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </div>
                
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{profile.full_name}</h2>
                  <p className="text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 mt-1"><Mail size={14} /> {profile.email}</p>
                </div>
              </div>

              {/* Stats Section */}
              {stats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 p-2 rounded-lg mb-2"><FileText size={18} /></div>
                    <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.documents}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Documents</span>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 p-2 rounded-lg mb-2"><HelpCircle size={18} /></div>
                    <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.quizzes}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quizzes</span>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 p-2 rounded-lg mb-2"><Layers size={18} /></div>
                    <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.flashcard_sets}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Flashcards</span>
                  </div>
                </div>
              )}

              {/* Student Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Activity size={16} /> Student Details
                </h3>
                
                <form onSubmit={handleSaveDetails} className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">School / Institution</label>
                    <div className="relative">
                      <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        placeholder="e.g. Stanford University"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Bio / Major</label>
                    <textarea
                      placeholder="e.g. Computer Science student passionate about AI..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    {detailsStatus === 'success' && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"><CheckCircle2 size={16}/> Saved</span>}
                    <button 
                      type="submit" 
                      disabled={detailsStatus === 'loading'}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {detailsStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : 'Save Details'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Account Status */}
              <div className="bg-white dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Account Status</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                  <ShieldCheck size={14} /> Active
                </span>
              </div>

              {/* Change Password */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Lock size={16} /> Security
                </h3>
                
                <form onSubmit={handleChangePassword} className="bg-white dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  {passwordStatus === 'success' && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 p-3 rounded-xl text-sm font-medium border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-2">
                      <CheckCircle2 size={16} /> Password updated successfully!
                    </div>
                  )}
                  {passwordStatus === 'error' && (
                    <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-3 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/50 flex items-center gap-2">
                      <XCircle size={16} /> {errorMsg}
                    </div>
                  )}

                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Current Password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                    />
                    <input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 transition-all outline-none text-sm"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={passwordStatus === 'loading' || !currentPassword || !newPassword}
                    className="w-full bg-slate-900 dark:bg-blue-600 text-white rounded-xl py-3 font-semibold hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer"
                  >
                    {passwordStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : 'Update Password'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 mt-10">Failed to load profile.</div>
          )}
        </div>
      </div>
    </div>
  );
}

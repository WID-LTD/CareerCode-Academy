import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Camera, Save, Shield, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function StudentProfile() {
  const { user, updateProfile } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    github: user?.github || '',
    twitter: user?.twitter || '',
    avatar: user?.avatar || '',
  });

  const completeness = useMemo(() => {
    const fields = [formData.name, formData.bio, formData.location, formData.website, formData.github, formData.twitter, formData.avatar];
    const filled = fields.filter((v) => String(v || '').trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(formData as any);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/upload', fd);
      const url = data?.data?.url;
      if (!url) throw new Error('Upload failed');
      setFormData((f) => ({ ...f, avatar: url }));
      await updateProfile({ avatar: url } as any);
      toast.success('Photo updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Profile</h1>
        <p className="text-gray-500">Manage the information shown on your CareerCode profile and portfolio.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-6">Personal Information</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt={formData.name} className="w-20 h-20 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-20 h-20 gradient-bg rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
                      {(formData.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-600 transition-colors disabled:opacity-60"
                    aria-label="Upload profile photo"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{formData.name || 'Your name'}</h3>
                  <Badge variant="primary" size="sm">Student</Badge>
                  <p className="text-xs text-gray-500 mt-1">Click the camera icon to upload a photo.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Full Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} icon={<User className="w-4 h-4" />} />
                <Input label="Email" type="email" value={formData.email} disabled icon={<Mail className="w-4 h-4" />} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                <textarea
                  rows={4}
                  placeholder="Tell the community about yourself, your goals and what you're learning."
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                <Input label="Website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="GitHub" value={formData.github} onChange={(e) => setFormData({ ...formData, github: e.target.value })} />
                <Input label="Twitter / X" value={formData.twitter} onChange={(e) => setFormData({ ...formData, twitter: e.target.value })} />
              </div>
              <Button type="submit" icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} disabled={saving || uploading}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-4">Profile completeness</h2>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Completed</span>
              <span className="font-semibold">{completeness}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full gradient-bg transition-all" style={{ width: `${completeness}%` }} />
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                ['Profile photo', formData.avatar],
                ['Bio', formData.bio],
                ['Location', formData.location],
                ['Website', formData.website],
                ['GitHub', formData.github],
                ['Twitter / X', formData.twitter],
              ].map(([label, value]) => (
                <li key={String(label)} className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${value ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`} />
                  <span className={value ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>{label}</span>
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-4">Account & security</h2>
            <div className="space-y-3">
              <Link to="/student/settings" className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <span className="inline-flex items-center gap-2"><Shield className="w-4 h-4" /> Change password</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </Link>
              <Link to="/student/settings" className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <span className="inline-flex items-center gap-2"><Shield className="w-4 h-4" /> Two-factor authentication</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </Link>
              <Link to="/student/portfolio" className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <span className="inline-flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Edit portfolio</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}

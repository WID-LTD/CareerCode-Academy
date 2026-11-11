import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, MapPin, Globe, Github, Twitter, Linkedin,
  Camera, Save, Loader2, BookOpen, Users, DollarSign, Star,
  Pencil, X, Plus, ExternalLink
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import SEO from '@/components/seo/SEO';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface ProfileStats {
  total_courses: number;
  published_courses: number;
  total_students: number;
  total_revenue: number;
  average_rating: number;
}

interface ProfileData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  headline: string | null;
  location: string | null;
  website: string | null;
  github: string | null;
  twitter: string | null;
  linkedin: string | null;
  expertise: string[];
  stats: ProfileStats;
}

export default function InstructorProfile() {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', bio: '', headline: '', location: '',
    website: '', github: '', twitter: '', linkedin: '', avatar: '',
    expertise: [] as string[],
  });
  const [expertiseInput, setExpertiseInput] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/instructor/profile');
      const p = data.data;
      setProfile(p);
      setForm({
        name: p.name || '',
        bio: p.bio || '',
        headline: p.headline || '',
        location: p.location || '',
        website: p.website || '',
        github: p.github || '',
        twitter: p.twitter || '',
        linkedin: p.linkedin || '',
        avatar: p.avatar || '',
        expertise: p.expertise || [],
      });
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    if (profile) {
      setForm({
        name: profile.name || '',
        bio: profile.bio || '',
        headline: profile.headline || '',
        location: profile.location || '',
        website: profile.website || '',
        github: profile.github || '',
        twitter: profile.twitter || '',
        linkedin: profile.linkedin || '',
        avatar: profile.avatar || '',
        expertise: profile.expertise || [],
      });
    }
    setEditing(true);
  };

  const addExpertise = () => {
    const tag = expertiseInput.trim();
    if (tag && !form.expertise.includes(tag)) {
      setForm({ ...form, expertise: [...form.expertise, tag] });
    }
    setExpertiseInput('');
  };

  const removeExpertise = (tag: string) => {
    setForm({ ...form, expertise: form.expertise.filter(t => t !== tag) });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/instructor/profile', form);
      setProfile(prev => prev ? { ...prev, ...data.data } : null);
      setUser({ ...user, name: form.name, bio: form.bio, avatar: form.avatar } as any);
      toast.success('Profile updated');
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const s = profile?.stats;
  const p = profile;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SEO title="Instructor Profile" />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Profile</h1>
          <p className="text-gray-500">Manage your instructor profile and public information.</p>
        </div>
        {!editing && (
          <Button onClick={startEdit}><Pencil className="w-4 h-4 mr-1" /> Edit Profile</Button>
        )}
      </div>

      {/* Profile Header */}
      <GlassCard className="p-6 mb-6" hover={false}>
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="relative">
            {p?.avatar ? (
              <img src={p.avatar} alt={p.name} className="w-24 h-24 rounded-2xl object-cover" />
            ) : (
              <div className="w-24 h-24 gradient-bg rounded-2xl flex items-center justify-center text-3xl font-bold text-white">
                {p?.name?.charAt(0) || 'I'}
              </div>
            )}
            {editing && (
              <>
                <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    try {
                      const fd = new FormData(); fd.append('file', file);
                      const { data } = await api.post('/upload', fd);
                      setForm((f) => ({ ...f, avatar: data.data.url }));
                      setProfile((prev: any) => prev ? { ...prev, avatar: data.data.url } : prev);
                      toast.success('Photo uploaded — save to apply');
                    } catch { toast.error('Upload failed'); }
                  }} />
                </label>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3 max-w-xl">
                <Input
                  label="Full Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  icon={<User className="w-4 h-4" />}
                />
                <Input
                  label="Headline"
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  placeholder="e.g., Senior Software Engineer & Educator"
                />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold">{p?.name}</h2>
                {p?.headline && (
                  <p className="text-gray-500 mt-1">{p.headline}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-400">
                  {p?.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{p.location}</span>
                  )}
                  {p?.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary-500 transition-colors">
                      <Globe className="w-3.5 h-3.5" /> Website
                    </a>
                  )}
                  {p?.github && (
                    <a href={p.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary-500 transition-colors">
                      <Github className="w-3.5 h-3.5" /> GitHub
                    </a>
                  )}
                  {p?.twitter && (
                    <a href={p.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary-500 transition-colors">
                      <Twitter className="w-3.5 h-3.5" /> Twitter
                    </a>
                  )}
                  {p?.linkedin && (
                    <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary-500 transition-colors">
                      <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <GlassCard className="p-4 text-center" hover={false}>
          <BookOpen className="w-5 h-5 text-primary-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{s?.total_courses || 0}</p>
          <p className="text-xs text-gray-500">Courses</p>
        </GlassCard>
        <GlassCard className="p-4 text-center" hover={false}>
          <Users className="w-5 h-5 text-secondary-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{s?.total_students || 0}</p>
          <p className="text-xs text-gray-500">Students</p>
        </GlassCard>
        <GlassCard className="p-4 text-center" hover={false}>
          <DollarSign className="w-5 h-5 text-success-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">${(s?.total_revenue || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500">Revenue</p>
        </GlassCard>
        <GlassCard className="p-4 text-center" hover={false}>
          <Star className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{(s?.average_rating || 0).toFixed(1)}</p>
          <p className="text-xs text-gray-500">Rating</p>
        </GlassCard>
      </div>

      {/* Bio & Expertise */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <GlassCard className="p-6" hover={false}>
            <h3 className="font-semibold mb-3">About</h3>
            {editing ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={5}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/30 transition-all resize-none"
                placeholder="Tell students about yourself, your experience, and teaching philosophy..."
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                {p?.bio || 'No bio yet.'}
              </p>
            )}
          </GlassCard>
        </div>

        <div>
          <GlassCard className="p-6" hover={false}>
            <h3 className="font-semibold mb-3">Expertise</h3>
            {editing ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={expertiseInput}
                    onChange={(e) => setExpertiseInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExpertise())}
                    placeholder="Add a skill..."
                  />
                  <Button variant="outline" size="sm" onClick={addExpertise}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.expertise.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-full">
                      {tag}
                      <button onClick={() => removeExpertise(tag)} className="hover:text-danger-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {p?.expertise && p.expertise.length > 0 ? (
                  p.expertise.map((tag) => (
                    <Badge key={tag} variant="primary" size="sm">{tag}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No expertise listed.</p>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Social & Contact Links (edit mode) */}
      {editing && (
        <GlassCard className="p-6 mb-6" hover={false}>
          <h3 className="font-semibold mb-4">Social & Contact</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} icon={<MapPin className="w-4 h-4" />} placeholder="e.g., Lagos, Nigeria" />
            <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} icon={<Globe className="w-4 h-4" />} placeholder="https://..." />
            <Input label="GitHub" value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} icon={<Github className="w-4 h-4" />} placeholder="https://github.com/..." />
            <Input label="Twitter" value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })} icon={<Twitter className="w-4 h-4" />} placeholder="https://twitter.com/..." />
            <Input label="LinkedIn" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} icon={<Linkedin className="w-4 h-4" />} placeholder="https://linkedin.com/in/..." />
          </div>
        </GlassCard>
      )}

      {/* Edit/Save actions */}
      {editing && (
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4 mr-1" /> Save Changes
          </Button>
          <Button variant="outline" onClick={() => setEditing(false)}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
        </div>
      )}

      {/* View My Courses link */}
      {!editing && (
        <GlassCard className="p-5" hover={false}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">Your Courses</h3>
              <p className="text-sm text-gray-500 mt-1">
                {s?.published_courses || 0} published out of {s?.total_courses || 0} total courses
              </p>
            </div>
            <Link to="/instructor/courses">
              <Button variant="outline" size="sm">
                Manage Courses <ExternalLink className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, BookOpen, Camera, Save, Shield } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';

export default function StudentProfile() {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    name: user?.name || 'Sarah Johnson',
    email: user?.email || 'sarah.johnson@example.com',
    bio: user?.bio || 'Passionate about web development and design. Currently learning full-stack development.',
    location: 'San Francisco, CA',
    website: 'sarahjohnson.dev',
    github: 'sarahjohnson',
    twitter: '@sarahcodes',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-gray-500">Manage your personal information and account settings.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-6">Personal Information</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 gradient-bg rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
                    {formData.name.charAt(0)}
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-600 transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{formData.name}</h3>
                  <Badge variant="primary" size="sm">Student</Badge>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Full Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} icon={<User className="w-4 h-4" />} />
                <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} icon={<Mail className="w-4 h-4" />} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                <textarea
                  rows={4}
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
                <Input label="Twitter" value={formData.twitter} onChange={(e) => setFormData({ ...formData, twitter: e.target.value })} />
              </div>
              <Button type="submit" icon={<Save className="w-4 h-4" />}>Save Changes</Button>
            </form>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-4">Account Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Member since</span>
                <span className="font-medium">January 2025</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Courses enrolled</span>
                <span className="font-medium">4</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Completed courses</span>
                <span className="font-medium">2</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Certificates earned</span>
                <span className="font-medium">2</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total hours learned</span>
                <span className="font-medium">128</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold mb-4">Account Security</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" icon={<Shield className="w-4 h-4" />}>Change Password</Button>
              <Button variant="outline" className="w-full justify-start" icon={<Shield className="w-4 h-4" />}>Two-Factor Auth</Button>
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}

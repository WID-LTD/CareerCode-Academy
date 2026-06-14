import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Globe, Shield, Mail, CreditCard, Bell, Palette, Lock, Smartphone, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAdminStore } from '@/store/adminStore';

const sections = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'branding', label: 'Branding', icon: Palette },
];

export default function AdminSettings() {
  const [activeSection, setActiveSection] = useState('general');
  const { settings, fetchSettings, updateSetting, isLoading } = useAdminStore();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings && settings.length > 0) {
      const settingsMap: Record<string, string> = {};
      settings.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      setLocalSettings(settingsMap);
    }
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const promises = Object.keys(localSettings).map(key => updateSetting(key, localSettings[key]));
      await Promise.all(promises);
    } finally {
      setIsSaving(false);
    }
  };

  const getSetting = (key: string, defaultVal: string = '') => {
    return localSettings[key] !== undefined ? localSettings[key] : defaultVal;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Platform Settings</h1>
          <p className="text-gray-500">Configure platform-wide settings and preferences.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || isLoading} icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeSection === section.id
                  ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          {activeSection === 'general' && (
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold mb-6">General Settings</h2>
              <div className="space-y-4">
                <Input label="Platform Name" value={getSetting('platform_name', 'CareerCode Academy')} onChange={(e) => handleChange('platform_name', e.target.value)} />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platform Description</label>
                  <textarea rows={3} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all" value={getSetting('platform_description', 'Empowering the next generation of developers...')} onChange={(e) => handleChange('platform_description', e.target.value)} />
                </div>
                <Input label="Support Email" type="email" value={getSetting('support_email', 'hello@careercode.academy')} onChange={(e) => handleChange('support_email', e.target.value)} icon={<Mail className="w-4 h-4" />} />
                <Input label="Website URL" value={getSetting('website_url', 'https://careercode.academy')} onChange={(e) => handleChange('website_url', e.target.value)} icon={<Globe className="w-4 h-4" />} />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Language</label>
                  <select className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" value={getSetting('default_language', 'English (US)')} onChange={(e) => handleChange('default_language', e.target.value)}>
                    <option>English (US)</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                  <select className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" value={getSetting('timezone', 'Pacific Time (PT)')} onChange={(e) => handleChange('timezone', e.target.value)}>
                    <option>Pacific Time (PT)</option>
                    <option>Eastern Time (ET)</option>
                    <option>Central European Time (CET)</option>
                    <option>Greenwich Mean Time (GMT)</option>
                  </select>
                </div>
              </div>
            </GlassCard>
          )}

          {activeSection === 'security' && (
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold mb-6">Security Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-sm">Two-Factor Authentication</div>
                      <div className="text-xs text-gray-500">Add an extra layer of security to your account</div>
                    </div>
                  </div>
                  <input type="checkbox" checked={getSetting('2fa_enabled', 'false') === 'true'} onChange={(e) => handleChange('2fa_enabled', e.target.checked.toString())} className="rounded text-primary-500 focus:ring-primary-500" />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-sm">Single Sign-On (SSO)</div>
                      <div className="text-xs text-gray-500">Enable SSO with Google, GitHub, or Microsoft</div>
                    </div>
                  </div>
                  <input type="checkbox" checked={getSetting('sso_enabled', 'false') === 'true'} onChange={(e) => handleChange('sso_enabled', e.target.checked.toString())} className="rounded text-primary-500 focus:ring-primary-500" />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-sm">Device Management</div>
                      <div className="text-xs text-gray-500">Manage active sessions and devices</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Manage</Button>
                </div>
                <Input label="Session Timeout (minutes)" type="number" value={getSetting('session_timeout', '60')} onChange={(e) => handleChange('session_timeout', e.target.value)} />
                <Input label="Max Login Attempts" type="number" value={getSetting('max_login_attempts', '5')} onChange={(e) => handleChange('max_login_attempts', e.target.value)} />
              </div>
            </GlassCard>
          )}

          {activeSection !== 'general' && activeSection !== 'security' && (
            <GlassCard className="p-6">
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                  {activeSection === 'email' && <Mail className="w-8 h-8 text-primary-500" />}
                  {activeSection === 'payments' && <CreditCard className="w-8 h-8 text-primary-500" />}
                  {activeSection === 'notifications' && <Bell className="w-8 h-8 text-primary-500" />}
                  {activeSection === 'branding' && <Palette className="w-8 h-8 text-primary-500" />}
                </div>
                <h3 className="text-lg font-semibold mb-2 capitalize">{activeSection} Settings</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  Configure your {activeSection} preferences here. More options coming soon.
                </p>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </motion.div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Globe, Shield, Mail, CreditCard, Bell, Palette, Lock, Smartphone, Loader2, Upload, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAdminStore } from '@/store/adminStore';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

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
  const [uploadingBranding, setUploadingBranding] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Platform Settings</h1>
          <p className="text-gray-500">Configure platform-wide settings and preferences.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || isLoading} icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                  <textarea rows={3} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all" value={getSetting('platform_description', 'CareerCode Academy is the education venture of WID LTD, delivering practical, project-based technology education.')} onChange={(e) => handleChange('platform_description', e.target.value)} />
                </div>
                <Input label="Support Email" type="email" value={getSetting('support_email', 'hello@careercode.com.ng')} onChange={(e) => handleChange('support_email', e.target.value)} icon={<Mail className="w-4 h-4" />} />
                <Input label="Website URL" value={getSetting('website_url', 'https://careercode.com.ng')} onChange={(e) => handleChange('website_url', e.target.value)} icon={<Globe className="w-4 h-4" />} />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Language</label>
                  <select className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" value={getSetting('default_language', 'English (Nigeria)')} onChange={(e) => handleChange('default_language', e.target.value)}>
                    <option>English (Nigeria)</option>
                    <option>English (US)</option>
                    <option>English (UK)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                  <select className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50" value={getSetting('timezone', 'West Africa Time (WAT)')} onChange={(e) => handleChange('timezone', e.target.value)}>
                    <option>West Africa Time (WAT)</option>
                    <option>UTC</option>
                    <option>Central European Time (CET)</option>
                    <option>Eastern Time (ET)</option>
                    <option>Pacific Time (PT)</option>
                  </select>
                </div>
              </div>
            </GlassCard>
          )}

          {activeSection === 'security' && (
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold mb-6">Security</h2>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <p className="font-medium">Per-user two-factor authentication</p>
                  <p className="text-xs text-gray-500 mt-1">Each user enables TOTP and downloads backup codes from their own Settings page. Admins can reset 2FA from Users.</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <p className="font-medium">Login providers</p>
                  <p className="text-xs text-gray-500 mt-1">Google sign-in is enabled. Other providers are not configured, so no dead buttons are shown.</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Audit trail</p>
                    <p className="text-xs text-gray-500 mt-1">Every admin mutation is recorded with method, path, IP and user agent.</p>
                  </div>
                  <a href="/admin/audit-log" className="text-xs font-medium text-primary-500 hover:underline">Open audit log</a>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Feature controls</p>
                    <p className="text-xs text-gray-500 mt-1">Registration, AI, paid enrolment and other switches live in Feature Flags.</p>
                  </div>
                  <a href="/admin/feature-flags" className="text-xs font-medium text-primary-500 hover:underline">Open flags</a>
                </div>
              </div>
            </GlassCard>
          )}

          {activeSection === 'branding' && (
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold mb-2">Branding Settings</h3>
              <p className="text-sm text-gray-500 mb-6">Upload your organization's stamp and signature for certificate generation.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stamp Upload */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Stamp Image (PNG)</label>
                  <div className="border-2 border-dashed rounded-xl p-4 text-center">
                    {getSetting('certificate_default_stamp_url') ? (
                      <div className="relative inline-block">
                        <img src={getSetting('certificate_default_stamp_url')} alt="Stamp"
                          className="h-24 w-24 object-contain mx-auto" />
                        <button onClick={async () => {
                          const { data } = await api.put('/admin/settings', { key: 'certificate_default_stamp_url', value: '' });
                          fetchSettings();
                        }} className="absolute -top-2 -right-2 p-0.5 bg-red-500 text-white rounded-full">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">No stamp uploaded</p>
                      </div>
                    )}
                    <label className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs cursor-pointer hover:bg-primary-600">
                      <Upload size={12} /> Upload Stamp
                      <input type="file" accept="image/png,image/jpeg" className="hidden"
                        disabled={uploadingBranding === 'stamp'}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingBranding('stamp');
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            const { data: uploadRes } = await api.post('/admin/settings/upload-branding', formData, {
                            });
                            if (uploadRes.data?.url) {
                              await api.put('/admin/settings', { key: 'certificate_default_stamp_url', value: uploadRes.data.url });
                              fetchSettings();
                            }
                          } catch { /* ignore */ }
                          setUploadingBranding(null);
                        }} />
                    </label>
                    {uploadingBranding === 'stamp' && <Loader2 size={14} className="animate-spin inline ml-1" />}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={getSetting('certificate_show_stamp', 'true') === 'true'}
                      onChange={(e) => handleChange('certificate_show_stamp', e.target.checked ? 'true' : 'false')} />
                    Show stamp on certificates
                  </label>
                </div>

                {/* Signature Upload */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Signature Image (PNG)</label>
                  <div className="border-2 border-dashed rounded-xl p-4 text-center">
                    {getSetting('certificate_default_signature_url') ? (
                      <div className="relative inline-block">
                        <img src={getSetting('certificate_default_signature_url')} alt="Signature"
                          className="h-16 w-32 object-contain mx-auto" />
                        <button onClick={async () => {
                          await api.put('/admin/settings', { key: 'certificate_default_signature_url', value: '' });
                          fetchSettings();
                        }} className="absolute -top-2 -right-2 p-0.5 bg-red-500 text-white rounded-full">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">No signature uploaded</p>
                      </div>
                    )}
                    <label className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs cursor-pointer hover:bg-primary-600">
                      <Upload size={12} /> Upload Signature
                      <input type="file" accept="image/png,image/jpeg" className="hidden"
                        disabled={uploadingBranding === 'signature'}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingBranding('signature');
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            const { data: uploadRes } = await api.post('/admin/settings/upload-branding', formData, {
                            });
                            if (uploadRes.data?.url) {
                              await api.put('/admin/settings', { key: 'certificate_default_signature_url', value: uploadRes.data.url });
                              fetchSettings();
                            }
                          } catch { /* ignore */ }
                          setUploadingBranding(null);
                        }} />
                    </label>
                    {uploadingBranding === 'signature' && <Loader2 size={14} className="animate-spin inline ml-1" />}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={getSetting('certificate_show_signature', 'true') === 'true'}
                      onChange={(e) => handleChange('certificate_show_signature', e.target.checked ? 'true' : 'false')} />
                    Show signature on certificates
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <Input label="Organization Name" value={getSetting('certificate_org_name', 'WID LTD')}
                  onChange={(e) => handleChange('certificate_org_name', e.target.value)} />
                <Input label="Organization RC Number" value={getSetting('certificate_org_rc', 'RC 8824091')}
                  onChange={(e) => handleChange('certificate_org_rc', e.target.value)} />
              </div>
            </GlassCard>
          )}

          {activeSection === 'payments' && (
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold mb-1">Payments & XP Business Model</h2>
              <p className="text-sm text-gray-500 mb-6">Configure platform currency (admin-only) + commission and XP conversion. <span className="font-medium">1000 XP = 100 {getSetting('platform_currency','NGN')} default (rate 0.1).</span> All values are live — Save Changes to persist.</p>
              <div className="space-y-5">
                <div className="p-4 rounded-xl border border-primary-500/20 bg-primary-500/5">
                  <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-400 mb-1">Platform Currency (admin-only)</h3>
                  <p className="text-xs text-gray-500 mb-3">All new payments/courses display in this currency. Existing payments keep original. Admin can choose from list.</p>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Currency</label>
                    <select value={getSetting('platform_currency','NGN')} onChange={(e)=>handleChange('platform_currency', e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm">
                      {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]: any) => (
                        <option key={code} value={code}>{code} — {info.name} ({info.symbol}) • {info.locale}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400">Current: {getSetting('platform_currency','NGN')} ({(SUPPORTED_CURRENCIES as any)[getSetting('platform_currency','NGN')]?.symbol || '₦'}) • Locale {(SUPPORTED_CURRENCIES as any)[getSetting('platform_currency','NGN')]?.locale || 'en-NG'} • Supported gateways: {((SUPPORTED_CURRENCIES as any)[getSetting('platform_currency','NGN')]?.gateways || []).join(', ') || 'paystack, flutterwave'}</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">XP Business Model</h3>
                  <p className="text-xs text-gray-500">Admin-customizable. Students redeem XP for discount codes applied at checkout.</p>
                </div>
                <Input label={`XP to ${getSetting('platform_currency','NGN')} Rate (${getSetting('platform_currency','NGN')} per 1 XP)`} type="number" step="0.01" value={getSetting('xp_to_ngn_rate', '0.1')} onChange={(e) => handleChange('xp_to_ngn_rate', e.target.value)} />
                <p className="text-xs text-gray-400 -mt-3">e.g., 0.1 = 1000 XP → {(SUPPORTED_CURRENCIES as any)[getSetting('platform_currency','NGN')]?.symbol || '₦'}100. Example: {getSetting('xp_min_redeem','1000')} XP → {(SUPPORTED_CURRENCIES as any)[getSetting('platform_currency','NGN')]?.symbol || '₦'}{Math.floor(parseInt(getSetting('xp_min_redeem','1000')) * parseFloat(getSetting('xp_to_ngn_rate','0.1')) || 0)}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Minimum Redeem (XP)" type="number" value={getSetting('xp_min_redeem', '1000')} onChange={(e) => handleChange('xp_min_redeem', e.target.value)} />
                  <Input label="Redeem Step (XP increments)" type="number" value={getSetting('xp_redeem_step', '1000')} onChange={(e) => handleChange('xp_redeem_step', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Max Discount % per Course" type="number" value={getSetting('xp_max_discount_percent', '50')} onChange={(e) => handleChange('xp_max_discount_percent', e.target.value)} />
                  <Input label="Discount Code Expiry (days)" type="number" value={getSetting('xp_code_expiry_days', '30')} onChange={(e) => handleChange('xp_code_expiry_days', e.target.value)} />
                </div>
                <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer">
                  <input type="checkbox" checked={getSetting('xp_redeem_enabled', 'true') === 'true'} onChange={(e) => handleChange('xp_redeem_enabled', e.target.checked ? 'true' : 'false')} className="rounded text-primary-500" />
                  <div>
                    <div className="text-sm font-medium">Enable XP Redemption</div>
                    <div className="text-xs text-gray-500">Allow students to redeem XP for discount codes at checkout</div>
                  </div>
                </label>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
                  <h3 className="text-sm font-semibold">General Payments</h3>
                  <Input label="Platform Commission Rate (%)" type="number" value={getSetting('commission_rate', '30')} onChange={(e) => handleChange('commission_rate', e.target.value)} />
                  <Input label="Paystack Public Key" value={getSetting('paystack_public_key', '')} onChange={(e) => handleChange('paystack_public_key', e.target.value)} />
                  <Input label="Flutterwave Public Key" value={getSetting('flutterwave_public_key', '')} onChange={(e) => handleChange('flutterwave_public_key', e.target.value)} />
                </div>
              </div>
            </GlassCard>
          )}

          {activeSection === 'email' && (
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold mb-1">Email Service</h2>
              <p className="text-sm text-gray-500 mb-6">CareerCode sends transactional email through Cloudflare Email Service. SMTP is not used.</p>
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-500/5 p-4">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Provider: Cloudflare Email Service</p>
                  <p className="text-xs text-gray-500 mt-1">Sender: noreply@careercode.com.ng · configured through the EMAIL binding.</p>
                </div>
                <Input label="Support email (shown on public pages)" type="email" value={getSetting('support_email', 'hello@careercode.com.ng')} onChange={(e) => handleChange('support_email', e.target.value)} icon={<Mail className="w-4 h-4" />} />
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
                  <p className="text-sm font-medium">Send a test email</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
                    <Button size="sm" disabled={testingEmail || !testEmail.trim()} onClick={async () => {
                      setTestingEmail(true);
                      try {
                        const { data } = await api.post('/admin/email-test', { to: testEmail.trim() });
                        if (data.success) toast.success('Test email sent'); else toast.error(data.data?.error || 'Email failed');
                      } catch (e: any) { toast.error(e?.response?.data?.message || 'Email failed'); }
                      finally { setTestingEmail(false); }
                    }}>{testingEmail ? 'Sending…' : 'Send test'}</Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {activeSection === 'notifications' && (
            <GlassCard className="p-6">
              <h2 className="text-lg font-semibold mb-1">Notifications</h2>
              <p className="text-sm text-gray-500 mb-6">Notification delivery is controlled by the broadcast composer and each user's browser settings.</p>
              <div className="space-y-4">
                <Input label="Notification Retention (days)" type="number" value={getSetting('notification_retention_days','90')} onChange={(e)=>handleChange('notification_retention_days', e.target.value)} />
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Send a broadcast</p>
                    <p className="text-xs text-gray-500 mt-1">Email + in-app notifications to a role or everyone.</p>
                  </div>
                  <a href="/admin/broadcasts" className="text-xs font-medium text-primary-500 hover:underline">Open broadcasts</a>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Web Push</p>
                    <p className="text-xs text-gray-500 mt-1">Users enable browser notifications from their own Settings page.</p>
                  </div>
                  <a href="/admin/system-health" className="text-xs font-medium text-primary-500 hover:underline">Check status</a>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </motion.div>
  );
}

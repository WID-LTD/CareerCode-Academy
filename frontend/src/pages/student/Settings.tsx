import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Shield, Eye, Volume2, Moon, Sun, KeyRound, UserRound,
  ChevronRight, Loader2, CheckCircle2, X, Monitor,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import QRCodeLib from 'react-qr-code';

const QRCode = QRCodeLib as unknown as React.ComponentType<{ value: string; size?: number }>;
import { disablePush, enablePush, sendTestPush } from '@/lib/push';
import toast from 'react-hot-toast';
import {
  browserNotificationSupport,
  browserNotificationsEnabled,
  setBrowserNotificationsEnabled,
} from '@/lib/notifications';

const NOTIFICATION_TOGGLES = [
  { label: 'Course Updates', description: 'New lessons and course announcements', defaultOn: true },
  { label: 'Assignment Reminders', description: 'Upcoming deadlines and submissions', defaultOn: true },
  { label: 'Certificate Awards', description: 'When you earn a certificate', defaultOn: true },
  { label: 'Community Activity', description: 'Replies, mentions and likes', defaultOn: false },
];

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    setTimeout(() => ctx.close().catch(() => {}), 300);
  } catch { /* audio is best-effort */ }
}

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  const [browserEnabled, setBrowserEnabled] = useState<boolean>(() => browserNotificationsEnabled());
  const [permission, setPermission] = useState<string>(() =>
    browserNotificationSupport() ? Notification.permission : 'unsupported'
  );
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = { 'Sound Effects': false };
    NOTIFICATION_TOGGLES.forEach((t) => { defaults[t.label] = t.defaultOn; });
    try {
      const saved = localStorage.getItem('careercode-settings');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch { return defaults; }
  });
  const [profilePublic, setProfilePublic] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [twoFactor, setTwoFactor] = useState<{ enabled: boolean } | null>(null);
  const [twoFaSetup, setTwoFaSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const twoFaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/users/me/preferences').then(({ data }) => {
      if (data?.data && typeof data.data === 'object') setToggles((t) => ({ ...t, ...data.data }));
    }).catch(() => {});
    api.get('/auth/2fa/status').then(({ data }) => setTwoFactor(data.data)).catch(() => {});
    api.get('/portfolio/site').then(({ data }) => {
      setProfilePublic(data?.data?.user?.portfolio_public !== false);
    }).catch(() => {});
  }, []);

  const savePreferences = async (next: Record<string, boolean>) => {
    setToggles(next);
    try { localStorage.setItem('careercode-settings', JSON.stringify(next)); } catch { /* ignore */ }
    try { await api.put('/users/me/preferences', { data: next }); }
    catch { toast.error('Could not save that preference'); }
  };

  const toggle = (label: string) => {
    const next = { ...toggles, [label]: !toggles[label] };
    if (label === 'Sound Effects' && next[label]) playBeep();
    void savePreferences(next);
  };

  const toggleBrowserNotifications = async () => {
    const next = !browserEnabled;
    if (next) {
      if (!browserNotificationSupport()) {
        toast.error('This browser does not support desktop notifications.');
        return;
      }
      const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setBrowserEnabled(false);
        setBrowserNotificationsEnabled(false);
        toast.error('Notification permission was not granted');
        return;
      }
    }
    setBrowserEnabled(next);
    setBrowserNotificationsEnabled(next);
    try {
      if (next) {
        const ok = await enablePush();
        if (!ok) toast.error('Push subscription was not created');
        else toast.success('Browser notifications enabled');
      } else {
        await disablePush();
        toast.success('Browser notifications disabled');
      }
    } catch {
      toast.error('Could not update the push subscription');
    }
    window.dispatchEvent(new Event('careercode:browser-notifications-changed'));
  };

  const updatePrivacy = async (isPublic: boolean) => {
    setSavingPrivacy(true);
    try {
      await api.patch('/portfolio/privacy', { portfolio_public: isPublic });
      setProfilePublic(isPublic);
      toast.success(isPublic ? 'Profile is now public' : 'Profile is now private');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not update profile visibility');
    } finally { setSavingPrivacy(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return; }
    setPasswordBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed. Other sessions were signed out.');
      setPasswordOpen(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not change password');
    } finally { setPasswordBusy(false); }
  };

  const startTwoFa = async () => {
    setTwoFaBusy(true);
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setTwoFaSetup(data.data);
      setBackupCodes([]);
    } catch { toast.error('Could not start 2FA setup'); }
    finally { setTwoFaBusy(false); }
  };

  const enableTwoFa = async () => {
    setTwoFaBusy(true);
    try {
      const { data } = await api.post('/auth/2fa/enable', { code: twoFaCode });
      setBackupCodes(data.data.backupCodes || []);
      setTwoFactor({ enabled: true });
      setTwoFaSetup(null);
      setTwoFaCode('');
      toast.success('Two-factor authentication enabled');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Invalid code'); }
    finally { setTwoFaBusy(false); }
  };

  const disableTwoFa = async () => {
    const password = window.prompt('Enter your password to disable 2FA');
    if (!password) return;
    setTwoFaBusy(true);
    try {
      await api.post('/auth/2fa/disable', { password });
      setTwoFactor({ enabled: false });
      setBackupCodes([]);
      toast.success('Two-factor authentication disabled');
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to disable 2FA'); }
    finally { setTwoFaBusy(false); }
  };

  const Row = ({ icon: Icon, label, description, children }: { icon: any; label: string; description: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );

  const Toggle = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Toggle ${label}`}
      aria-pressed={on}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account, notifications and security.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <GlassCard className="p-0 overflow-hidden" hover={false}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold">Account</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <Row icon={UserRound} label={user?.name || 'Your account'} description={user?.email || ''}>
              <Button size="sm" variant="outline" onClick={() => navigate('/student/profile')}>Edit profile</Button>
            </Row>
            <Row icon={KeyRound} label="Change Password" description="Update your password and sign out other sessions">
              <Button size="sm" variant="outline" onClick={() => setPasswordOpen(true)}>Change</Button>
            </Row>
          </div>
        </GlassCard>

        <GlassCard className="p-0 overflow-hidden" hover={false}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold">Preferences</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <Row icon={darkMode ? Moon : Sun} label="Dark Mode" description="Use the dark theme across the platform">
              <Toggle on={darkMode} onClick={toggleDarkMode} label="Dark Mode" />
            </Row>
            <Row icon={Volume2} label="Sound Effects" description="Play a short sound for interface feedback">
              <Toggle on={!!toggles['Sound Effects']} onClick={() => toggle('Sound Effects')} label="Sound Effects" />
            </Row>
          </div>
        </GlassCard>

        <GlassCard className="p-0 overflow-hidden" hover={false}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold">Notifications</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <Row icon={Bell} label="Browser Notifications" description="Desktop alerts for new activity">
              <div className="flex items-center gap-2">
                {permission === 'denied' && <span className="text-[10px] text-red-500">Blocked</span>}
                <Toggle on={browserEnabled && permission === 'granted'} onClick={toggleBrowserNotifications} label="Browser Notifications" />
                {browserEnabled && permission === 'granted' && (
                  <button
                    onClick={async () => {
                      try { await sendTestPush(); toast.success('Test push sent'); }
                      catch { toast.error('Push failed'); }
                    }}
                    className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500"
                  >
                    Test
                  </button>
                )}
              </div>
            </Row>
            {NOTIFICATION_TOGGLES.map((item) => (
              <Row key={item.label} icon={Bell} label={item.label} description={item.description}>
                <Toggle on={!!toggles[item.label]} onClick={() => toggle(item.label)} label={item.label} />
              </Row>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-0 overflow-hidden" hover={false}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold">Privacy & Security</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <Row icon={Eye} label="Profile Visibility" description="Control whether your public portfolio is listed">
              <select
                value={profilePublic ? 'public' : 'private'}
                onChange={(e) => void updatePrivacy(e.target.value === 'public')}
                disabled={savingPrivacy}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-2.5 py-1.5 text-xs"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </Row>
            <Row icon={Shield} label="Two-Factor Authentication" description={twoFactor?.enabled ? 'Enabled with an authenticator app' : 'Add an authenticator app'}>
              <Button size="sm" variant="outline" onClick={() => twoFaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                {twoFactor?.enabled ? 'Manage' : 'Set up'}
              </Button>
            </Row>
            <Row icon={Monitor} label="Portfolio" description="Edit your public portfolio site">
              <Button size="sm" variant="outline" onClick={() => navigate('/student/portfolio/site')}>Open builder <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
            </Row>
          </div>
        </GlassCard>

        <div ref={twoFaRef}>
          <GlassCard className="p-5" hover={false}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Two-Factor Authentication</h2>
                <p className="text-xs text-gray-500 mt-0.5">Protect your account with an authenticator app (TOTP).</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg ${twoFactor?.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'}`}>
                {twoFactor?.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {twoFactor?.enabled ? (
              <button onClick={disableTwoFa} disabled={twoFaBusy} className="mt-4 px-3 py-2 rounded-xl border border-red-300 text-red-500 text-sm">
                {twoFaBusy ? 'Working…' : 'Disable 2FA'}
              </button>
            ) : twoFaSetup ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-500">Scan this QR code with your authenticator app:</p>
                <div className="w-fit rounded-xl bg-white p-3">
                  <QRCode value={twoFaSetup.otpauth} size={168} />
                </div>
                <p className="text-xs text-gray-500">Or add this secret manually:</p>
                <code className="block text-sm font-mono break-all rounded-xl bg-gray-100 dark:bg-gray-900 px-3 py-2">{twoFaSetup.secret}</code>
                <a href={twoFaSetup.otpauth} className="text-xs text-primary-500 break-all">Open in authenticator app</a>
                <div className="flex gap-2">
                  <input value={twoFaCode} onChange={(e) => setTwoFaCode(e.target.value)} placeholder="6-digit code" inputMode="numeric"
                    className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
                  <button onClick={enableTwoFa} disabled={twoFaBusy} className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold">
                    {twoFaBusy ? 'Enabling…' : 'Enable'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={startTwoFa} disabled={twoFaBusy} className="mt-4 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold">
                {twoFaBusy ? 'Preparing…' : 'Set up 2FA'}
              </button>
            )}

            {backupCodes.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Backup codes (save these now)</p>
                  <button
                    onClick={() => {
                      const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'careercode-backup-codes.txt'; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-xs text-primary-500 hover:underline"
                  >Download</button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs font-mono">
                  {backupCodes.map((c) => <span key={c} className="rounded bg-gray-100 dark:bg-gray-900 px-2 py-1">{c}</span>)}
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {passwordOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-label="Change password">
          <form onSubmit={changePassword} className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Change password</h2>
              <button type="button" onClick={() => setPasswordOpen(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
            </div>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 characters)" required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setPasswordOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={passwordBusy}>{passwordBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change password'}</Button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
}

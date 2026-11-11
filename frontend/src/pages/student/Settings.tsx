import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Shield, Eye, Globe, Volume2, Palette,
  ChevronRight, Moon, Sun,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useThemeStore } from '@/store/themeStore';
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

const settingsSections = [
  {
    title: 'Preferences',
    items: [
      { icon: Globe, label: 'Language', description: 'English (US)', type: 'select' },
      { icon: Volume2, label: 'Sound Effects', description: 'Play sounds for notifications', type: 'toggle' },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { icon: Bell, label: 'Browser Notifications', description: 'Desktop alerts for new activity', type: 'browser' },
      { icon: Bell, label: 'Course Updates', description: 'New lessons, announcements', type: 'toggle', defaultOn: true },
      { icon: Bell, label: 'Assignment Reminders', description: 'Upcoming deadlines', type: 'toggle', defaultOn: true },
      { icon: Bell, label: 'Certificate Awards', description: 'When you earn a certificate', type: 'toggle', defaultOn: true },
      { icon: Bell, label: 'Community Activity', description: 'Replies, mentions, likes', type: 'toggle', defaultOn: false },
    ],
  },
  {
    title: 'Privacy & Security',
    items: [
      { icon: Eye, label: 'Profile Visibility', description: 'Who can see your profile', type: 'select' },
      { icon: Shield, label: 'Two-Factor Authentication', description: 'Add extra security', type: 'action' },
      { icon: Shield, label: 'Change Password', description: 'Update your password', type: 'action' },
    ],
  },
];

export default function Settings() {
  const { darkMode, toggleDarkMode } = useThemeStore();
  const [browserEnabled, setBrowserEnabled] = useState<boolean>(() => browserNotificationsEnabled());
  const [permission, setPermission] = useState<string>(() =>
    browserNotificationSupport() ? Notification.permission : 'unsupported'
  );

  const toggleBrowserNotifications = async () => {
    const next = !browserEnabled;
    if (next) {
      if (!browserNotificationSupport()) {
        alert('This browser does not support desktop notifications.');
        return;
      }
      const result = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setBrowserEnabled(false);
        setBrowserNotificationsEnabled(false);
        return;
      }
    }
    setBrowserEnabled(next);
    setBrowserNotificationsEnabled(next);
    try {
      if (next) {
        const ok = await enablePush();
        if (!ok) toast.error('Push permission was not granted');
      } else {
        await disablePush();
      }
    } catch {
      toast.error('Could not update push subscription');
    }
    window.dispatchEvent(new Event('careercode:browser-notifications-changed'));
  };

  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('careercode-settings');
      return saved ? JSON.parse(saved) : {
        'Sound Effects': false,
        'Course Updates': true,
        'Assignment Reminders': true,
        'Certificate Awards': true,
        'Community Activity': false,
      };
    } catch {
      return {
        'Sound Effects': false,
        'Course Updates': true,
        'Assignment Reminders': true,
        'Certificate Awards': true,
        'Community Activity': false,
      };
    }
  });

  const toggle = (label: string) => {
    const next = { ...toggles, [label]: !toggles[label] };
    setToggles(next);
    try { localStorage.setItem('careercode-settings', JSON.stringify(next)); } catch {}
    api.put('/users/me/preferences', { data: next }).catch(() => {});
  };

  const [twoFactor, setTwoFactor] = useState<{ enabled: boolean } | null>(null);
  const [twoFaSetup, setTwoFaSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFaBusy, setTwoFaBusy] = useState(false);

  useEffect(() => {
    api.get('/users/me/preferences').then(({ data }) => {
      if (data?.data && typeof data.data === 'object') {
        setToggles((t) => ({ ...t, ...data.data }));
      }
    }).catch(() => {});
    api.get('/auth/2fa/status').then(({ data }) => setTwoFactor(data.data)).catch(() => {});
  }, []);

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {settingsSections.map((section) => (
          <GlassCard key={section.title} className="p-0 overflow-hidden" hover={false}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-semibold">{section.title}</h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>

                  {item.type === 'browser' ? (
                    <div className="flex items-center gap-2">
                      {permission === 'denied' && (
                        <span className="text-[10px] text-red-500">Blocked in browser</span>
                      )}
                      <button
                        onClick={toggleBrowserNotifications}
                        className={`relative w-11 h-6 rounded-full transition-colors ${browserEnabled && permission === 'granted' ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        aria-label="Toggle Browser Notifications"
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${browserEnabled && permission === 'granted' ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                      </button>
                      {browserEnabled && permission === 'granted' && (
                        <button onClick={async () => { try { await sendTestPush(); toast.success('Test push sent'); } catch { toast.error('Push failed'); } }}
                          className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500">
                          Test
                        </button>
                      )}
                    </div>
                  ) : item.type === 'toggle' ? (
                    <button
                      onClick={() => toggle(item.label)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${toggles[item.label] ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      aria-label={`Toggle ${item.label}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${toggles[item.label] ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </button>
                  ) : item.type === 'select' ? (
                    <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                      {item.label === 'Language' ? 'English (US)' : item.label === 'Profile Visibility' ? 'Public' : ''}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <Button variant="ghost" size="sm" icon={<ChevronRight className="w-4 h-4" />} />
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        ))}

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
              Disable 2FA
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
                <button onClick={enableTwoFa} disabled={twoFaBusy} className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold">Enable</button>
              </div>
            </div>
          ) : (
            <button onClick={startTwoFa} disabled={twoFaBusy} className="mt-4 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold">
              Set up 2FA
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
    </motion.div>
  );
}

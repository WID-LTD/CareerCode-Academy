import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Shield, Eye, Globe, Volume2, Palette,
  ChevronRight, Moon, Sun,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useThemeStore } from '@/store/themeStore';
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
      </div>
    </motion.div>
  );
}

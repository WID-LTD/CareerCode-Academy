import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
  BROWSER_NOTIFICATIONS_KEY,
  browserNotificationSupport,
  browserNotificationsEnabled,
  notificationLink,
} from '@/lib/notifications';

const SEEN_KEY = 'careercode-seen-notifications';
const POLL_MS = 45_000;

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>) {
  try {
    // Keep the list bounded — only the most recent ids matter.
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-200)));
  } catch { /* ignore */ }
}

/**
 * Requests browser-notification permission on load (opt-out model) and shows a
 * native notification for every unread notification the user has not seen yet.
 * Clicking it deep-links to the exact page.
 */
export function useBrowserNotifications() {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const seenRef = useRef<Set<string>>(readSeen());
  const primedRef = useRef(false);

  // Ask once per browser session, as early as the app loads.
  useEffect(() => {
    if (!user || !token) return;
    if (!browserNotificationSupport() || !browserNotificationsEnabled()) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [user, token]);

  useEffect(() => {
    if (!user || !token || !browserNotificationSupport()) return;
    let cancelled = false;

    const poll = async () => {
      if (!browserNotificationsEnabled() || Notification.permission !== 'granted') return;
      try {
        const { data } = await api.get('/notifications?limit=20');
        const items = (data?.data || []) as any[];
        if (cancelled) return;

        // First pass only records existing notifications — no backlog spam.
        const fresh = items.filter((n) => !n.read && !seenRef.current.has(n.id));
        items.forEach((n) => seenRef.current.add(n.id));
        writeSeen(seenRef.current);

        if (!primedRef.current) {
          primedRef.current = true;
          return;
        }

        for (const n of fresh.slice(0, 3)) {
          const notification = new Notification(n.title, {
            body: n.message,
            icon: '/favicon.ico',
            tag: n.id,
          });
          notification.onclick = () => {
            window.focus();
            navigate(notificationLink(n));
            notification.close();
          };
        }
      } catch {
        /* offline / token refresh — retry next tick */
      }
    };

    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user, token, navigate]);

  // Allow other components (settings toggle) to reset the "seen" baseline.
  useEffect(() => {
    const handler = () => {
      if (localStorage.getItem(BROWSER_NOTIFICATIONS_KEY) === 'on') {
        primedRef.current = false;
      }
    };
    window.addEventListener('careercode:browser-notifications-changed', handler);
    return () => window.removeEventListener('careercode:browser-notifications-changed', handler);
  }, []);
}

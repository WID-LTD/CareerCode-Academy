import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Send, X } from 'lucide-react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { notificationLink } from '@/lib/notifications';
import toast from 'react-hot-toast';

const SEEN_KEY = 'careercode-inapp-seen';

export function InAppMessagePopup() {
  const { isAuthenticated } = useAuthStore();
  const [item, setItem] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    try { seen.current = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const { data } = await api.get('/notifications?limit=8');
        if (cancelled) return;
        const candidates = (data.data || []).filter((n: any) =>
          !n.read &&
          ['community', 'message'].includes(String(n.type || '')) &&
          !seen.current.has(n.id)
        );
        if (candidates.length) setItem(candidates[0]);
      } catch { /* retry later */ }
    };
    poll();
    const timer = window.setInterval(poll, 25_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [isAuthenticated]);

  const dismiss = () => {
    if (item?.id) {
      seen.current.add(item.id);
      try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current].slice(-100))); } catch { /* ignore */ }
    }
    setItem(null);
    setReply('');
  };

  const channelId = (() => {
    const link = String(item?.link || '');
    const match = link.match(/[?&]channel=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  })();

  const sendReply = async () => {
    if (!channelId || !reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/community/channels/${channelId}/messages`, { content: reply.trim() });
      toast.success('Reply sent');
      dismiss();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not send the reply');
    } finally {
      setSending(false);
    }
  };

  if (!item) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-indigo-200/60 dark:border-indigo-900/60 bg-white dark:bg-gray-950 shadow-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 grid place-items-center flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{item.title || 'New message'}</p>
          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{item.message}</p>
          {channelId ? (
            <div className="flex gap-1.5 mt-3">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void sendReply(); }}
                placeholder="Quick reply…"
                className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={sending || !reply.trim()}
                className="px-2.5 rounded-lg bg-indigo-500 text-white disabled:opacity-40"
                aria-label="Send reply"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
          <div className="flex items-center gap-3 mt-2">
            <Link to={notificationLink(item)} onClick={dismiss} className="text-[11px] font-medium text-indigo-500 hover:underline">Open</Link>
            <button onClick={dismiss} className="text-[11px] text-gray-500 hover:text-gray-700">Dismiss</button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

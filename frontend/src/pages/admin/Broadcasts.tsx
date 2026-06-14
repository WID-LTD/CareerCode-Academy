import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Bell, Clock, CheckCircle, AlertCircle, X, Loader2, Calendar, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAdminStore } from '@/store/adminStore';

const AUDIENCES = ['all', 'students', 'instructors', 'admins'];
const TYPES = ['info', 'warning', 'announcement', 'promotion'];

export default function AdminBroadcasts() {
  const { broadcastNotifications, isLoading, error, fetchBroadcastNotifications, sendBroadcastNotification, deleteBroadcastNotification } = useAdminStore();
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', audience: 'all', type: 'info' as string, scheduleAt: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchBroadcastNotifications();
  }, [fetchBroadcastNotifications]);

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    setSending(true);
    try {
      await sendBroadcastNotification({
        ...form,
        scheduledAt: form.scheduleAt || null,
      });
      setForm({ title: '', message: '', audience: 'all', type: 'info', scheduleAt: '' });
      setShowComposer(false);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this broadcast?')) return;
    await deleteBroadcastNotification(id);
  };

  const statusIcon = (status: string) => {
    if (status === 'sent') return <CheckCircle className="w-4 h-4 text-success-500" />;
    if (status === 'scheduled') return <Clock className="w-4 h-4 text-amber-500" />;
    return <AlertCircle className="w-4 h-4 text-gray-400" />;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
          <p className="text-gray-500 mt-1">Create and manage broadcast notifications.</p>
        </div>
        <Button variant="primary" onClick={() => setShowComposer(!showComposer)} icon={<Bell className="w-4 h-4" />}>
          {showComposer ? 'Cancel' : 'New Broadcast'}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</p>
          <Button size="sm" onClick={() => fetchBroadcastNotifications()}>Retry</Button>
        </div>
      )}

      {/* Composer */}
      {showComposer && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-5" hover={false}>
            <h3 className="font-bold mb-4">Create Broadcast</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                <input
                  type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Notification title..."
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
                <textarea
                  value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Notification content..."
                  rows={4}
                  className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Audience</label>
                  <select
                    value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none text-sm"
                  >
                    {AUDIENCES.map((a) => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select
                    value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none text-sm"
                  >
                    {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Schedule (optional)</label>
                  <input
                    type="datetime-local" value={form.scheduleAt} onChange={(e) => setForm({ ...form, scheduleAt: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="primary" onClick={handleSend} disabled={!form.title.trim() || !form.message.trim() || sending}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Broadcast
                </Button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* History */}
      <GlassCard className="overflow-hidden" hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Audience</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Type</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Created</th>
                <th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {broadcastNotifications.map((n) => (
                <tr key={n._id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="p-3">
                    <p className="font-medium">{n.title}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{n.message}</p>
                  </td>
                  <td className="p-3 capitalize hidden md:table-cell">{n.audience}</td>
                  <td className="p-3 hidden sm:table-cell"><Badge variant={n.type === 'warning' ? 'warning' : n.type === 'announcement' ? 'default' : 'default'}>{n.type}</Badge></td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 capitalize">
                      {statusIcon(n.status)}
                      <span className="text-xs">{n.status}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-500 text-xs hidden lg:table-cell">{new Date(n.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDelete(n._id)} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-gray-400 hover:text-danger-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {broadcastNotifications.length === 0 && (
                <tr><td colSpan={6} className="p-12 text-center text-gray-400">No broadcasts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </motion.div>
  );
}

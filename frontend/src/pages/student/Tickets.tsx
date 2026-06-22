import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, AlertCircle, CheckCircle, Ticket, MessageSquare } from 'lucide-react';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export default function StudentTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium' });
  const [sending, setSending] = useState(false);

  const fetchTickets = async () => {
    try {
      const { data } = await api.get('/tickets');
      setTickets(data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleSubmit = async () => {
    if (!form.subject || !form.description) return;
    setSending(true);
    setError('');
    try {
      await api.post('/tickets', form);
      setForm({ subject: '', description: '', priority: 'medium' });
      setShowForm(false);
      fetchTickets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit ticket');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-gray-500 mt-1">Submit and track support requests.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Ticket className="w-4 h-4 mr-1.5" /> New Ticket
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500" />
          <p className="text-sm text-danger-600">{error}</p>
        </div>
      )}

      {showForm && (
        <GlassCard className="p-5">
          <h2 className="font-semibold mb-4">Create Support Ticket</h2>
          <div className="space-y-3">
            <input
              placeholder="Subject" value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30"
            />
            <textarea
              placeholder="Describe your issue..." rows={4} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
            />
            <select
              value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              {PRIORITIES.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={sending || !form.subject || !form.description}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                Submit
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {loading ? (
        <PageSkeleton />
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No support tickets yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <GlassCard key={ticket.id} className="p-4" hover>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{ticket.subject}</h3>
                    <Badge variant={ticket.status === 'closed' ? 'default' : ticket.status === 'in_progress' ? 'warning' : 'success'}>{ticket.status}</Badge>
                    <Badge variant={ticket.priority === 'urgent' ? 'danger' : ticket.priority === 'high' ? 'warning' : 'default'}>{ticket.priority}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{ticket.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}

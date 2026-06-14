import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, MessageSquare, CheckCircle, RotateCcw, UserCheck, AlertCircle,
  X, Send, Loader2, Clock,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAdminStore } from '@/store/adminStore';

const STATUS_TABS = ['all', 'open', 'in_progress', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export default function AdminTickets() {
  const { tickets, isLoading, error, fetchTickets, replyToTicket, closeTicket, reopenTicket, assignTicket } = useAdminStore();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filtered = tickets
    .filter((t) => tab === 'all' || t.status === tab)
    .filter((t) => !search || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.user_name?.toLowerCase().includes(search.toLowerCase()));

  const priorityColor = (p: string) => {
    const map: Record<string, string> = { low: 'text-blue-500', medium: 'text-amber-500', high: 'text-orange-500', urgent: 'text-danger-500' };
    return map[p] || 'text-gray-500';
  };

  const statusBadge = (s: string) => {
    const map: Record<string, any> = { open: 'warning', in_progress: 'info', closed: 'success' };
    return <Badge variant={map[s] || 'default'}>{s.replace('_', ' ')}</Badge>;
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setActionLoading(true);
    try {
      await replyToTicket(selectedTicket._id, replyText);
      setReplyText('');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Support Tickets</h1>
        <p className="text-gray-500 mt-1">Manage support requests from users.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</p>
          <Button size="sm" onClick={() => fetchTickets()}>Retry</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm" />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {STATUS_TABS.map((s) => (
            <button key={s} onClick={() => setTab(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${tab === s ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>{s.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {filtered.map((ticket) => (
            <motion.div
              key={ticket._id} layout
              className={`p-4 rounded-2xl cursor-pointer transition-all border ${selectedTicket?._id === ticket._id ? 'border-primary-500/50 bg-primary-50 dark:bg-primary-900/20' : 'border-transparent bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex items-start justify-between mb-1">
                <p className="font-semibold text-sm truncate flex-1">{ticket.subject}</p>
                {ticket.priority && <span className={`text-[10px] font-bold uppercase ml-2 ${priorityColor(ticket.priority)}`}>{ticket.priority}</span>}
              </div>
              <p className="text-xs text-gray-500 truncate mb-2">{ticket.description}</p>
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span>{ticket.user_name}</span>
                <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No tickets found.</p>}
        </div>

        <div className="lg:col-span-2">
          {selectedTicket ? (
            <GlassCard className="p-5" hover={false}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold">{selectedTicket.subject}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    From {selectedTicket.user_name} · {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(selectedTicket.status)}
                  {selectedTicket.priority && <Badge variant="default">{selectedTicket.priority}</Badge>}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm mb-4">
                {selectedTicket.description}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {selectedTicket.status !== 'closed' && (
                  <Button size="sm" variant="outline" onClick={async () => { await closeTicket(selectedTicket._id); setSelectedTicket(null); }}>
                    <CheckCircle className="w-3.5 h-3.5" /> Close
                  </Button>
                )}
                {selectedTicket.status === 'closed' && (
                  <Button size="sm" variant="outline" onClick={async () => { await reopenTicket(selectedTicket._id); }}>
                    <RotateCcw className="w-3.5 h-3.5" /> Reopen
                  </Button>
                )}
                <Button size="sm" variant="ghost">
                  <UserCheck className="w-3.5 h-3.5" /> Assign
                </Button>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <label className="block text-xs font-medium text-gray-500 mb-2">Reply to ticket</label>
                <textarea
                  value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" variant="primary" onClick={handleReply} disabled={!replyText.trim() || actionLoading}>
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send Reply
                  </Button>
                </div>
              </div>
            </GlassCard>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a ticket to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

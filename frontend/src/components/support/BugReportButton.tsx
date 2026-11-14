import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bug, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export function BugReportButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const location = useLocation();

  const submit = async () => {
    if (message.trim().length < 3) return;
    setSending(true);
    try {
      await api.post('/telemetry/bug', {
        message: message.trim(),
        route: location.pathname + location.search,
        page: document.title,
      });
      toast.success('Thanks — the team can now see this problem');
      setMessage('');
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not send the report');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || 'p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'}
        aria-label="Report a problem"
        title="Report a problem"
      >
        <Bug className="w-5 h-5" />
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Report a problem" size="md">
        <p className="text-sm text-gray-500 mb-3">
          Tell us what went wrong on this page. The report includes the page address and your browser details.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="What happened? What did you expect instead?"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={sending || message.trim().length < 3}>
            {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Send report
          </Button>
        </div>
      </Modal>
    </>
  );
}

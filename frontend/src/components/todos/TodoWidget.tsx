import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ListChecks, Plus, ArrowRight, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

export function TodoWidget({ basePath = '/student' }: { basePath?: string }) {
  const [todos, setTodos] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/todos', { params: { status: 'open' } });
      setTodos((data.data || []).slice(0, 5));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await api.post('/todos', { title: title.trim(), category: 'personal' });
      setTitle('');
      await load();
    } finally { setBusy(false); }
  };

  const toggle = async (id: string) => {
    setTodos((list) => list.filter((t) => t.id !== id));
    try { await api.patch(`/todos/${id}/toggle`); } catch { await load(); }
  };

  return (
    <GlassCard className="p-4" hover={false}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><ListChecks className="w-4 h-4 text-primary-500" /> To-Do</h2>
        <Link to={`${basePath}/todos`} className="text-xs text-primary-500 inline-flex items-center gap-1">All tasks <ArrowRight className="w-3 h-3" /></Link>
      </div>
      <form onSubmit={add} className="flex gap-1.5 mb-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quick task…" className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary-500/30" />
        <button type="submit" disabled={busy || !title.trim()} className="h-8 w-8 rounded-lg bg-primary-500 text-white grid place-items-center disabled:opacity-40" aria-label="Add task">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </form>
      <div className="space-y-1">
        {todos.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900">
            <button onClick={() => toggle(t.id)} aria-label="Complete task" className="flex-shrink-0">
              {t.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-gray-300 hover:text-primary-500" />}
            </button>
            <span className="text-xs truncate flex-1">{t.title}</span>
            {t.due_at && <span className={cn('text-[10px] flex-shrink-0', new Date(t.due_at) < new Date() ? 'text-rose-500' : 'text-gray-400')}>{new Date(t.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
          </div>
        ))}
        {todos.length === 0 && <p className="text-xs text-gray-500 py-2">No open tasks. Add one above.</p>}
      </div>
    </GlassCard>
  );
}

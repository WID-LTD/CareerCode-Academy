import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Circle, Plus, Trash2, CalendarDays, AlertTriangle,
  RefreshCw, ListChecks, Loader2, Filter, Sparkles,
} from 'lucide-react';
import api from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import SEO from '@/components/seo/SEO';

type Todo = {
  id: string;
  title: string;
  notes?: string | null;
  due_at?: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'done';
  category: string;
  source?: string;
};

const FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'today', label: 'Today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' },
];

const priorityStyle: Record<string, string> = {
  high: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  low: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

function fmtDue(iso?: string | null): { text: string; tone: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const due = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((due - start) / 86400000);
  const text = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days < 0 ? `${Math.abs(days)}d overdue` : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { text, tone: days < 0 ? 'text-rose-500' : days === 0 ? 'text-amber-500' : 'text-gray-500' };
}

export default function Todos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, open: 0, done: 0, overdue: 0, today: 0 });
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('personal');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === 'today') params.due = 'today';
      else if (filter === 'overdue') params.due = 'overdue';
      else if (filter !== 'all') params.status = filter;
      const { data } = await api.get('/todos', { params });
      setTodos(data.data || []);
      setStats(data.stats || {});
    } catch {
      toast.error('Failed to load to-dos');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const add = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await api.post('/todos', {
        title: title.trim(),
        due_at: due || null,
        priority,
        category,
      });
      setTitle('');
      setDue('');
      toast.success('Task added');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add task');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (todo: Todo) => {
    setTodos((list) => list.map((t) => t.id === todo.id ? { ...t, status: t.status === 'open' ? 'done' : 'open' } : t));
    try {
      await api.patch(`/todos/${todo.id}/toggle`);
      await load();
    } catch {
      toast.error('Failed to update task');
      await load();
    }
  };

  const remove = async (id: string) => {
    setTodos((list) => list.filter((t) => t.id !== id));
    try {
      await api.delete(`/todos/${id}`);
      toast.success('Task deleted');
      await load();
    } catch {
      toast.error('Failed to delete task');
      await load();
    }
  };

  const syncAssignments = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/todos/generate/assignments');
      toast.success(data.message || 'Assignments synced');
      await load();
    } catch {
      toast.error('Failed to sync assignments');
    } finally {
      setBusy(false);
    }
  };

  const clearCompleted = async () => {
    const ids = todos.filter((t) => t.status === 'done').map((t) => t.id);
    if (!ids.length) return;
    setBusy(true);
    try {
      await api.post('/todos/bulk', { action: 'delete', ids });
      toast.success('Completed tasks cleared');
      await load();
    } catch {
      toast.error('Failed to clear completed tasks');
    } finally {
      setBusy(false);
    }
  };

  const progress = useMemo(() => {
    const total = Number(stats.total) || 0;
    return total ? Math.round((Number(stats.done) / total) * 100) : 0;
  }, [stats]);

  if (loading && todos.length === 0) return <PageSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-5">
      <SEO title="To-Do" description="Plan your study, career and admin tasks." />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><ListChecks className="w-7 h-7 text-primary-500" /> To-Do</h1>
          <p className="text-gray-500 text-sm mt-1">Your tasks, deadlines and learning-path milestones in one place.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={syncAssignments} disabled={busy} icon={<RefreshCw className={cn('w-4 h-4', busy && 'animate-spin')} />}>Sync assignments</Button>
          <Button size="sm" variant="ghost" onClick={clearCompleted} disabled={busy}>Clear completed</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Open', value: stats.open || 0, tone: 'text-blue-500' },
          { label: 'Due today', value: stats.today || 0, tone: 'text-amber-500' },
          { label: 'Overdue', value: stats.overdue || 0, tone: 'text-rose-500' },
          { label: 'Done', value: stats.done || 0, tone: 'text-emerald-500' },
        ].map((s) => (
          <GlassCard key={s.label} className="p-3" hover={false}>
            <p className={cn('text-xl font-bold tabular-nums', s.tone)}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4" hover={false}>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>Completion</span><span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </GlassCard>

      <form onSubmit={add} className="GlassCard p-3 sm:p-4 space-y-2" >
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task… e.g. Finish Module 3 quiz"
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          <button type="submit" disabled={busy || !title.trim()} className="h-10 w-10 rounded-xl bg-primary-500 text-white grid place-items-center disabled:opacity-40 flex-shrink-0" aria-label="Add task">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <label className="flex items-center gap-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 px-2.5 py-2">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="bg-transparent outline-none flex-1 min-w-0" />
          </label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-2.5 py-2 text-xs outline-none">
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-2.5 py-2 text-xs outline-none">
            <option value="personal">Personal</option>
            <option value="study">Study</option>
            <option value="career">Career</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </form>

      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap', filter === f.id ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500')}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {todos.map((todo) => {
            const dueInfo = fmtDue(todo.due_at);
            return (
              <motion.div key={todo.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
                <GlassCard className={cn('p-3 flex items-start gap-3', todo.status === 'done' && 'opacity-60')} hover={false}>
                  <button onClick={() => toggle(todo)} className="mt-0.5 flex-shrink-0" aria-label={todo.status === 'done' ? 'Mark open' : 'Mark done'}>
                    {todo.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-gray-300 hover:text-primary-500" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium break-words', todo.status === 'done' && 'line-through text-gray-400')}>{todo.title}</p>
                    {todo.notes && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{todo.notes}</p>}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize', priorityStyle[todo.priority])}>{todo.priority}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 capitalize">{todo.category}</span>
                      {dueInfo && <span className={cn('text-[11px] inline-flex items-center gap-1', dueInfo.tone)}>{dueInfo.tone.includes('rose') ? <AlertTriangle className="w-3 h-3" /> : <CalendarDays className="w-3 h-3" />}{dueInfo.text}</span>}
                      {todo.source && todo.source !== 'manual' && <span className="text-[10px] text-gray-400 inline-flex items-center gap-1"><Sparkles className="w-3 h-3" />{todo.source}</span>}
                    </div>
                  </div>
                  <button onClick={() => remove(todo.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 flex-shrink-0" aria-label="Delete task">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {todos.length === 0 && (
          <GlassCard className="p-10 text-center" hover={false}>
            <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-3" />
            <p className="font-medium">Nothing here yet</p>
            <p className="text-sm text-gray-500 mt-1">Add a task above, or sync your assignment deadlines.</p>
          </GlassCard>
        )}
      </div>
    </motion.div>
  );
}

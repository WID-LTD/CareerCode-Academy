import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Archive, CheckCircle, Pencil, Plus, Send, X, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { ProgramWizard, SchoolOption } from '@/components/programs/ProgramWizard';
import { useProgramStore, Program } from '@/store/programStore';
import SEO from '@/components/seo/SEO';

const STATUSES = ['all', 'draft', 'pending_review', 'published', 'rejected', 'archived'];

function statusBadge(status: string) {
  const map: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
    draft: 'default',
    pending_review: 'warning',
    published: 'success',
    rejected: 'danger',
    archived: 'default',
  };
  return <Badge variant={map[status] || 'default'}>{status.replace(/_/g, ' ')}</Badge>;
}

export default function AdminPrograms() {
  const {
    programs,
    isLoading,
    error,
    fetchPrograms,
    submitProgram,
    approveProgram,
    rejectProgram,
    archiveProgram,
    fetchCohorts,
  } = useProgramStore();

  const [statusFilter, setStatusFilter] = useState('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Program | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/schools');
        setSchools((data.data || []).map((s: any) => ({ id: s.id, name: s.name, slug: s.slug })));
      } catch {
        setSchools([]);
      }
    })();
  }, []);

  const schoolNameOf = (p: Program) =>
    p.school_name || schools.find((s) => s.id === p.school_id)?.name || '—';

  const filtered = useMemo(
    () => programs.filter((p) => statusFilter === 'all' || p.status === statusFilter),
    [programs, statusFilter],
  );

  const runAction = async (id: string, fn: () => Promise<void>) => {
    setActionLoading(id);
    try {
      await fn();
      fetchPrograms(statusFilter === 'all' ? undefined : { status: statusFilter });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      toast.error('A rejection reason is required');
      return;
    }
    setActionLoading(rejectTarget.id);
    try {
      await rejectProgram(rejectTarget.id, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      fetchPrograms(statusFilter === 'all' ? undefined : { status: statusFilter });
    } finally {
      setActionLoading(null);
    }
  };

  const openEdit = async (p: Program) => {
    setEditing(p);
    try {
      const cohorts = await fetchCohorts(p.id);
      setEditing({ ...p, cohorts });
    } catch {
      /* cohorts stay as-is; error already toasted */
    }
    setWizardOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setWizardOpen(true);
  };

  const columns: Column<Program>[] = [
    {
      key: 'name',
      label: 'Program',
      render: (p) => (
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-white truncate">{p.name || p.title}</p>
          <p className="text-xs text-gray-500 truncate">{p.slug}</p>
        </div>
      ),
    },
    {
      key: 'school',
      label: 'School',
      render: (p) => <span className="text-sm text-gray-600 dark:text-gray-300">{schoolNameOf(p)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => (
        <div className="flex flex-col gap-1">
          {statusBadge(p.status)}
          {p.status === 'rejected' && p.rejection_reason && (
            <span className="text-xs text-red-500 max-w-[200px] truncate" title={p.rejection_reason}>
              {p.rejection_reason}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'courses',
      label: 'Courses',
      render: (p) => <span className="text-sm">{p.courses?.length ?? 0}</span>,
    },
    {
      key: 'cohorts',
      label: 'Cohorts',
      render: (p) => <span className="text-sm">{p.cohorts?.length ?? 0}</span>,
    },
    {
      key: 'updated',
      label: 'Updated',
      render: (p) => (
        <span className="text-xs text-gray-500">
          {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (p) => {
        const busy = actionLoading === p.id;
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => openEdit(p)}
              title="Edit"
              aria-label={`Edit ${p.name}`}
              className="p-1.5 rounded-lg text-gray-500 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {(p.status === 'draft' || p.status === 'rejected') && (
              <button
                onClick={() => runAction(p.id, () => submitProgram(p.id))}
                disabled={busy}
                title="Submit for review"
                aria-label={`Submit ${p.name} for review`}
                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
            {p.status === 'pending_review' && (
              <>
                <button
                  onClick={() => runAction(p.id, () => approveProgram(p.id))}
                  disabled={busy}
                  title="Approve"
                  aria-label={`Approve ${p.name}`}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setRejectTarget(p); setRejectReason(''); }}
                  disabled={busy}
                  title="Reject with reason"
                  aria-label={`Reject ${p.name}`}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
            {p.status !== 'archived' && (
              <button
                onClick={() => runAction(p.id, () => archiveProgram(p.id))}
                disabled={busy}
                title="Archive"
                aria-label={`Archive ${p.name}`}
                className="p-1.5 rounded-lg text-gray-500 hover:text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <SEO title="Manage Programs" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Programs</h1>
          <p className="text-gray-500 mt-1">Create and moderate learning programs.</p>
          <p className="text-xs text-gray-400 mt-0.5">Status lifecycle: Draft → Pending Review → Published/Rejected → Archived</p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
          Create Program
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
          <Button size="sm" variant="outline" onClick={() => fetchPrograms()}>Retry</Button>
        </div>
      )}

      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto w-fit max-w-full">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              fetchPrograms(s === 'all' ? undefined : { status: s });
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize whitespace-nowrap ${
              statusFilter === s
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        error={null}
        onRetry={() => fetchPrograms()}
        emptyTitle="No programs found"
        emptyDescription={statusFilter === 'all' ? 'Create your first program to get started.' : `No programs with status "${statusFilter.replace(/_/g, ' ')}".`}
        emptyAction={{ label: 'Create Program', onClick: openCreate }}
        mobileCard={(p) => (
          <GlassCard hover={false} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{p.name || p.title}</p>
                <p className="text-xs text-gray-500">{schoolNameOf(p)} · {p.courses?.length ?? 0} courses · {p.cohorts?.length ?? 0} cohorts</p>
              </div>
              {statusBadge(p.status)}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Button size="sm" variant="outline" onClick={() => openEdit(p)} icon={<Pencil className="w-3.5 h-3.5" />}>Edit</Button>
              {(p.status === 'draft' || p.status === 'rejected') && (
                <Button size="sm" variant="outline" disabled={actionLoading === p.id} onClick={() => runAction(p.id, () => submitProgram(p.id))} icon={<Send className="w-3.5 h-3.5" />}>Submit</Button>
              )}
              {p.status === 'pending_review' && (
                <>
                  <Button size="sm" variant="outline" disabled={actionLoading === p.id} onClick={() => runAction(p.id, () => approveProgram(p.id))} icon={<CheckCircle className="w-3.5 h-3.5" />}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={actionLoading === p.id} onClick={() => { setRejectTarget(p); setRejectReason(''); }} icon={<XCircle className="w-3.5 h-3.5" />}>Reject</Button>
                </>
              )}
              {p.status !== 'archived' && (
                <Button size="sm" variant="ghost" disabled={actionLoading === p.id} onClick={() => runAction(p.id, () => archiveProgram(p.id))} icon={<Archive className="w-3.5 h-3.5" />}>Archive</Button>
              )}
            </div>
          </GlassCard>
        )}
      />

      <Modal
        isOpen={wizardOpen}
        onClose={() => { setWizardOpen(false); setEditing(null); }}
        title={editing ? 'Edit Program' : 'Create Program'}
        size="xl"
        className="!max-w-3xl"
      >
        <ProgramWizard
          initial={editing}
          schools={schools}
          onClose={() => { setWizardOpen(false); setEditing(null); }}
          onSaved={() => fetchPrograms(statusFilter === 'all' ? undefined : { status: statusFilter })}
        />
      </Modal>

      <AnimatePresence>
        {rejectTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setRejectTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reject Program</h2>
                <button onClick={() => setRejectTarget(null)} aria-label="Close" className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Rejecting “{rejectTarget.name || rejectTarget.title}” sends it back to draft. A reason is required so the author knows what to fix.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Explain what needs to change…"
                className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 resize-none text-gray-900 dark:text-gray-100"
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancel</Button>
                <Button
                  variant="danger"
                  onClick={handleReject}
                  disabled={actionLoading === rejectTarget.id || !rejectReason.trim()}
                  title={!rejectReason.trim() ? 'A rejection reason is required' : undefined}
                >
                  Reject Program
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Landmark, Users, ScrollText, BookOpenCheck, Plus, Pencil, Trash2, Send,
  CheckCircle2, XCircle, Eye, Camera, UsersRound, Wallet, GraduationCap,
  BadgePercent, FileCheck2, UserPlus, BookMarked, Upload, Loader2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'members' | 'policies' | 'resolutions';

const policyCategories = ['pricing', 'content', 'community', 'data', 'finance', 'operations', 'governance'];

const statusVariant: Record<string, any> = {
  draft: 'default',
  pending_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  archived: 'default',
};

const fmt = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const emptyMember = { name: '', title: '', bio: '', avatar_url: '', sort_order: 0, is_active: true };
const emptyPolicy = { title: '', category: 'governance', summary: '', body: '', status: 'draft' };
const emptyResolution = { title: '', summary: '', body: '', passed: true, meeting_date: new Date().toISOString().slice(0, 10) };

export default function BoardOversight() {
  const [tab, setTab] = useState<Tab>('overview');
  const [summary, setSummary] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // member modal
  const [memberModal, setMemberModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [editingMember, setEditingMember] = useState<any>(null);

  // policy modal
  const [policyModal, setPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState(emptyPolicy);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [fullPolicy, setFullPolicy] = useState<any>(null);

  // resolution modal
  const [resolutionModal, setResolutionModal] = useState(false);
  const [resolutionForm, setResolutionForm] = useState(emptyResolution);

  const [saving, setSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [o, m, p, r] = await Promise.all([
        api.get('/board/oversight').catch(() => ({ data: { data: null } })),
        api.get('/board/members'),
        api.get('/board/policies'),
        api.get('/board/resolutions'),
      ]);
      setSummary(o.data.data);
      setMembers(m.data.data || []);
      setPolicies(p.data.data || []);
      setResolutions(r.data.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load board data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: Landmark },
    { key: 'members', label: 'Members', icon: Users },
    { key: 'policies', label: 'Policies', icon: BookOpenCheck },
    { key: 'resolutions', label: 'Resolutions', icon: ScrollText },
  ];

  // Members
  const openMemberModal = (m?: any) => {
    setEditingMember(m || null);
    setMemberForm(m ? { name: m.name, title: m.title, bio: m.bio || '', avatar_url: m.avatar_url || '', sort_order: m.sort_order ?? 0, is_active: !!m.is_active } : emptyMember);
    setMemberModal(true);
  };

  const saveMember = async () => {
    if (!memberForm.name || !memberForm.title) return toast.error('Name and title are required');
    setSaving(true);
    try {
      if (editingMember) {
        await api.put(`/board/members/${editingMember.id}`, memberForm);
        toast.success('Member updated');
      } else {
        await api.post('/board/members', memberForm);
        toast.success('Member added');
      }
      setMemberModal(false);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (m: any) => {
    if (!window.confirm(`Remove board member "${m.name}"?`)) return;
    try {
      await api.delete(`/board/members/${m.id}`);
      toast.success('Member removed');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to remove member');
    }
  };

  // Policies
  const openPolicyModal = (p?: any) => {
    setEditingPolicy(p || null);
    setPolicyForm(p ? { title: p.title, category: p.category, summary: p.summary || '', body: p.body, status: p.status } : emptyPolicy);
    setPolicyModal(true);
  };

  const savePolicy = async () => {
    if (!policyForm.title || !policyForm.body) return toast.error('Title and body are required');
    setSaving(true);
    try {
      if (editingPolicy) {
        await api.put(`/board/policies/${editingPolicy.id}`, policyForm);
        toast.success('Policy updated');
      } else {
        await api.post('/board/policies', policyForm);
        toast.success('Policy draft created');
      }
      setPolicyModal(false);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const submitPolicy = async (p: any) => {
    try {
      await api.post(`/board/policies/${p.id}/submit`);
      toast.success('Submitted for board review');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit policy');
    }
  };

  const decidePolicy = async (p: any, status: 'approved' | 'rejected') => {
    const notes = window.prompt(`${status === 'approved' ? 'Approve' : 'Reject'} "${p.title}". Decision notes (optional):`);
    if (notes === null) return;
    try {
      await api.post(`/board/policies/${p.id}/decide`, { status, notes: notes || undefined });
      toast.success(`Policy ${status}`);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update policy');
    }
  };

  const removePolicy = async (p: any) => {
    if (!window.confirm(`Delete policy "${p.title}"?`)) return;
    try {
      await api.delete(`/board/policies/${p.id}`);
      toast.success('Policy deleted');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete policy');
    }
  };

  // Resolutions
  const saveResolution = async () => {
    if (!resolutionForm.title) return toast.error('Title is required');
    setSaving(true);
    try {
      await api.post('/board/resolutions', resolutionForm);
      toast.success('Resolution recorded');
      setResolutionModal(false);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save resolution');
    } finally {
      setSaving(false);
    }
  };

  const removeResolution = async (r: any) => {
    if (!window.confirm(`Delete resolution "${r.resolution_number}"?`)) return;
    try {
      await api.delete(`/board/resolutions/${r.id}`);
      toast.success('Resolution deleted');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete resolution');
    }
  };

  if (isLoading) return <PageSkeleton />;

  const ops = summary?.operations || {};
  const counts = summary?.policies || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Landmark className="w-7 h-7 text-primary-500" /> Board Oversight
          </h1>
          <p className="text-gray-500 mt-1">Directors, policy review workflow, resolutions, and operating metrics.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${tab === t.key ? 'bg-primary-500/10 border-primary-500/40 text-primary-600 dark:text-primary-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-primary-400'}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: `₦${(Number(ops.totalRevenue) || 0).toLocaleString()}`, icon: Wallet, tone: 'bg-success-500/10 text-success-500' },
              { label: 'Total Enrollments', value: (ops.totalEnrollments || 0).toLocaleString(), icon: GraduationCap, tone: 'bg-blue-500/10 text-blue-500' },
              { label: 'Active Promotions', value: ops.activePromotions || 0, icon: BadgePercent, tone: 'bg-amber-500/10 text-amber-500' },
              { label: 'Students', value: (ops.totalStudents || 0).toLocaleString(), icon: UsersRound, tone: 'bg-purple-500/10 text-purple-500' },
            ].map((s) => (
              <GlassCard key={s.label} className="p-4 flex items-center gap-3" hover>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.tone}`}><s.icon className="w-5 h-5" /></div>
                <div>
                  <div className="text-lg font-bold leading-none">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GlassCard className="p-5 space-y-3" hover>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300"><UsersRound className="w-4 h-4 text-primary-500" /> Board Composition</div>
              <div className="text-3xl font-bold">{summary?.members?.active || 0}<span className="text-base text-gray-400 font-normal"> / {summary?.members?.total || 0} active</span></div>
              <div className="flex items-center gap-2 text-xs text-gray-500"><FileCheck2 className="w-3.5 h-3.5" /> {counts.published || 0} published policies</div>
            </GlassCard>
            <GlassCard className="p-5 space-y-3" hover>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300"><BookOpenCheck className="w-4 h-4 text-primary-500" /> Policy Queue</div>
              <div className="text-3xl font-bold">{counts.pendingReview || 0}<span className="text-base text-gray-400 font-normal"> awaiting review</span></div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">{counts.approved || 0} approved</Badge>
                <Badge variant="danger">{counts.rejected || 0} rejected</Badge>
              </div>
            </GlassCard>
            <GlassCard className="p-5 space-y-3" hover>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300"><BookMarked className="w-4 h-4 text-primary-500" /> Operations</div>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <div className="flex justify-between"><span>Published courses</span><b>{ops.publishedCourses || 0}</b></div>
                <div className="flex justify-between"><span>Certificates issued</span><b>{ops.certificatesIssued || 0}</b></div>
                <div className="flex justify-between"><span>Pending instructor apps</span><b>{ops.pendingInstructorApplications || 0}</b></div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => openMemberModal()}><Plus className="w-4 h-4" /> Add Member</Button></div>
          <GlassCard className="divide-y divide-gray-100 dark:divide-gray-800" hover={false}>
            {members.length === 0 && <div className="p-8 text-center text-gray-500">No board members yet.</div>}
            {members.map((m) => (
              <div key={m.id} className="p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white flex-shrink-0 overflow-hidden">
                  {m.avatar_url ? <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 opacity-60" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{m.name}</span>
                    {!m.is_active && <Badge variant="default" size="sm">Inactive</Badge>}
                  </div>
                  <div className="text-sm text-primary-600 dark:text-primary-400">{m.title}</div>
                  {m.bio && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{m.bio}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openMemberModal(m)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => removeMember(m)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10" title="Remove"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </GlassCard>
        </div>
      )}

      {tab === 'policies' && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => openPolicyModal()}><Plus className="w-4 h-4" /> New Policy</Button></div>
          <GlassCard className="divide-y divide-gray-100 dark:divide-gray-800" hover={false}>
            {policies.length === 0 && <div className="p-8 text-center text-gray-500">No policies yet.</div>}
            {policies.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold capitalize">{p.title}</span>
                      <Badge variant={statusVariant[p.status] || 'default'} size="sm">{p.status.replace('_', ' ')}</Badge>
                      {p.published && <Badge variant="success" size="sm">Published</Badge>}
                      <span className="text-xs text-gray-400">v{p.version}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{p.summary || p.body}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setFullPolicy(p)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title="View"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openPolicyModal(p)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" title="Edit"><Pencil className="w-4 h-4" /></button>
                    {p.status === 'draft' && (
                      <button onClick={() => submitPolicy(p)} className="p-2 rounded-lg text-amber-500 hover:bg-amber-500/10" title="Submit for review"><Send className="w-4 h-4" /></button>
                    )}
                    {p.status === 'pending_review' && (
                      <>
                        <button onClick={() => decidePolicy(p, 'approved')} className="p-2 rounded-lg text-success-500 hover:bg-success-500/10" title="Approve"><CheckCircle2 className="w-4 h-4" /></button>
                        <button onClick={() => decidePolicy(p, 'rejected')} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10" title="Reject"><XCircle className="w-4 h-4" /></button>
                      </>
                    )}
                    <button onClick={() => removePolicy(p)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 opacity-60" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {p.decision_notes && <p className="text-xs text-gray-500 mt-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2">Notes: {p.decision_notes}</p>}
              </div>
            ))}
          </GlassCard>
        </div>
      )}

      {tab === 'resolutions' && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => { setResolutionForm({ ...emptyResolution, meeting_date: new Date().toISOString().slice(0, 10) }); setResolutionModal(true); }}><Plus className="w-4 h-4" /> Record Resolution</Button></div>
          <GlassCard className="divide-y divide-gray-100 dark:divide-gray-800" hover={false}>
            {resolutions.length === 0 && <div className="p-8 text-center text-gray-500">No resolutions recorded.</div>}
            {resolutions.map((r) => (
              <div key={r.id} className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.title}</span>
                    <Badge variant={r.passed ? 'success' : 'default'} size="sm">{r.passed ? 'Passed' : 'Not passed'}</Badge>
                    <span className="text-xs text-gray-400">{r.resolution_number}</span>
                  </div>
                  {r.summary && <p className="text-sm text-gray-500 mt-1">{r.summary}</p>}
                  <div className="text-xs text-gray-400 mt-1">Meeting: {fmt(r.meeting_date)}</div>
                </div>
                <button onClick={() => removeResolution(r)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 flex-shrink-0" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </GlassCard>
        </div>
      )}

      {/* Member modal */}
      {memberModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary-500" /> {editingMember ? 'Edit Member' : 'Add Member'}</h2>
              <button onClick={() => setMemberModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-500">Name *</label>
                <input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Dr. Ada Lovelace"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" /></div>
              <div><label className="text-xs font-medium text-gray-500">Title *</label>
                <input value={memberForm.title} onChange={(e) => setMemberForm({ ...memberForm, title: e.target.value })} placeholder="Chairman of the Board"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" /></div>
              <div><label className="text-xs font-medium text-gray-500">Title / Full Bio</label>
                <textarea value={memberForm.bio} onChange={(e) => setMemberForm({ ...memberForm, bio: e.target.value })} rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" /></div>
              <div><label className="text-xs font-medium text-gray-500">Avatar URL</label>
                <input value={memberForm.avatar_url} onChange={(e) => setMemberForm({ ...memberForm, avatar_url: e.target.value })} placeholder="https://…"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none" />
                <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs cursor-pointer">
                  {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload photo
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setUploadingAvatar(true);
                    try { const fd = new FormData(); fd.append('file', file); const { data } = await api.post('/upload', fd); setMemberForm((f: any) => ({ ...f, avatar_url: data.data.url })); }
                    finally { setUploadingAvatar(false); }
                  }} />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500">Sort order</label>
                  <input type="number" value={memberForm.sort_order} onChange={(e) => setMemberForm({ ...memberForm, sort_order: Number(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none" /></div>
                <label className="flex items-end gap-2 text-sm cursor-pointer pb-2">
                  <input type="checkbox" checked={memberForm.is_active} onChange={(e) => setMemberForm({ ...memberForm, is_active: e.target.checked })} className="rounded" />
                  Active
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMemberModal(false)}>Cancel</Button>
              <Button onClick={saveMember} disabled={saving}>{saving ? 'Saving…' : editingMember ? 'Save Changes' : 'Add Member'}</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Policy modal */}
      {policyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg glass rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><BookOpenCheck className="w-5 h-5 text-primary-500" /> {editingPolicy ? 'Edit Policy' : 'New Policy'}</h2>
              <button onClick={() => setPolicyModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-500">Title *</label>
                <input value={policyForm.title} onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })} placeholder="Anti-Discrimination Policy"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500">Category</label>
                  <select value={policyForm.category} onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none capitalize">
                    {policyCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label className="text-xs font-medium text-gray-500">Status</label>
                  <select value={policyForm.status} onChange={(e) => setPolicyForm({ ...policyForm, status: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none">
                    <option value="draft">Draft</option>
                    <option value="pending_review">Pending review</option>
                  </select></div>
              </div>
              <div><label className="text-xs font-medium text-gray-500">Summary</label>
                <input value={policyForm.summary} onChange={(e) => setPolicyForm({ ...policyForm, summary: e.target.value })} placeholder="Short summary shown publicly"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none" /></div>
              <div><label className="text-xs font-medium text-gray-500">Body *</label>
                <textarea value={policyForm.body} onChange={(e) => setPolicyForm({ ...policyForm, body: e.target.value })} rows={8} placeholder="Full policy text…"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPolicyModal(false)}>Cancel</Button>
              <Button onClick={savePolicy} disabled={saving}>{saving ? 'Saving…' : editingPolicy ? 'Save Changes' : 'Create Draft'}</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Policy view modal */}
      {fullPolicy && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl glass rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-5 h-5 text-primary-500" />
                <h2 className="text-lg font-bold">{fullPolicy.title}</h2>
              </div>
              <button onClick={() => setFullPolicy(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={statusVariant[fullPolicy.status]} size="sm">{fullPolicy.status.replace('_', ' ')}</Badge>
              {fullPolicy.published && <Badge variant="success" size="sm">Published</Badge>}
              <span className="text-xs text-gray-400">v{fullPolicy.version}</span>
            </div>
            {fullPolicy.summary && <p className="text-sm text-gray-500 mb-3">{fullPolicy.summary}</p>}
            <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{fullPolicy.body}</div>
          </motion.div>
        </div>
      )}

      {/* Resolution modal */}
      {resolutionModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><ScrollText className="w-5 h-5 text-primary-500" /> Record Resolution</h2>
              <button onClick={() => setResolutionModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-500">Title *</label>
                <input value={resolutionForm.title} onChange={(e) => setResolutionForm({ ...resolutionForm, title: e.target.value })} placeholder="Approve 2026 budget"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40" /></div>
              <div><label className="text-xs font-medium text-gray-500">Summary</label>
                <input value={resolutionForm.summary} onChange={(e) => setResolutionForm({ ...resolutionForm, summary: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none" /></div>
              <div><label className="text-xs font-medium text-gray-500">Details</label>
                <textarea value={resolutionForm.body} onChange={(e) => setResolutionForm({ ...resolutionForm, body: e.target.value })} rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500">Meeting date</label>
                  <input type="date" value={resolutionForm.meeting_date} onChange={(e) => setResolutionForm({ ...resolutionForm, meeting_date: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none" /></div>
                <label className="flex items-end gap-2 text-sm cursor-pointer pb-2">
                  <input type="checkbox" checked={resolutionForm.passed} onChange={(e) => setResolutionForm({ ...resolutionForm, passed: e.target.checked })} className="rounded" />
                  Passed
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setResolutionModal(false)}>Cancel</Button>
              <Button onClick={saveResolution} disabled={saving}>{saving ? 'Saving…' : 'Record'}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
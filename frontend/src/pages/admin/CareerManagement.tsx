import { useState, useEffect, FormEvent, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Plus, Power, Pencil, Trash2, Briefcase, FileText, BarChart3, Users, Ban, Check } from 'lucide-react';

const statuses = ['applied', 'reviewing', 'interviewing', 'offered', 'hired', 'rejected'];
const statusVariant: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
  applied: 'default', reviewing: 'primary', interviewing: 'warning', offered: 'success', hired: 'success', rejected: 'danger',
};

type Listing = { id: string; title: string; company: string; description: string; location: string | null; type: string | null; salary_range: string | null; application_url: string | null; skills: string[]; is_active: boolean; expires_at: string | null };

function ListingFormModal({ open, onClose, editing, kind, onSaved }: {
  open: boolean; onClose: () => void; editing: Listing | null; kind: 'job' | 'internship'; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = e.currentTarget;
    const get = (n: string) => (form.elements.namedItem(n) as HTMLInputElement)?.value || '';
    const payload = {
      title: get('title'),
      company: get('company'),
      description: get('description'),
      location: get('location') || null,
      type: get('type') || null,
      salary_range: get('salary_range') || null,
      application_url: get('application_url') || null,
      expires_at: get('expires_at') || null,
      skills: get('skills').split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editing) await api.put(`/career/admin/${kind}s/${editing.id}`, payload);
      else await api.post(`/career/admin/${kind}s`, payload);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save listing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={editing ? `Edit ${kind}` : `Add ${kind}`} size="lg">
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Title" name="title" required defaultValue={editing?.title} placeholder="e.g. Junior Frontend Developer" />
          <Input label="Company" name="company" required defaultValue={editing?.company} placeholder="e.g. Acme Tech" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Location" name="location" defaultValue={editing?.location || ''} placeholder="e.g. Lagos (Remote)" />
          <Input label="Type" name="type" defaultValue={editing?.type || ''} placeholder="full-time, remote, contract..." />
        </div>
        <Input label="Description" name="description" required defaultValue={editing?.description} placeholder="Role overview, requirements..." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Salary Range" name="salary_range" defaultValue={editing?.salary_range || ''} placeholder="e.g. ₦3,000,000 / year" />
          <Input label="Application link (optional)" name="application_url" defaultValue={editing?.application_url || ''} placeholder="Direct external link" />
        </div>
        <Input label="Expires At" name="expires_at" type="datetime-local" defaultValue={editing?.expires_at ? String(editing.expires_at).slice(0, 16) : ''} />
        <Input label="Skills (comma separated)" name="skills" defaultValue={editing?.skills?.join(', ') || ''} placeholder="React, Node.js, product design..." />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{editing ? 'Save' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CareerManagementPage() {
  const [tab, setTab] = useState('jobs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [jobs, setJobs] = useState<Listing[]>([]);
  const [internships, setInternships] = useState<Listing[]>([]);

  const [applications, setApplications] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const [outcomes, setOutcomes] = useState<any>(null);

  const [modal, setModal] = useState<{ open: boolean; kind: 'job' | 'internship'; editing?: Listing }>({ open: false, kind: 'job' });

  const loadJobs = async () => {
    const { data } = await api.get('/career/admin/jobs');
    setJobs(data.data || []);
  };
  const loadInternships = async () => {
    const { data } = await api.get('/career/admin/internships');
    setInternships(data.data || []);
  };
  const loadApplications = useCallback(async () => {
    const { data } = await api.get(`/career/admin/applications${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`);
    setApplications(data.data || []);
  }, [statusFilter]);
  const loadOutcomes = async () => {
    const { data } = await api.get('/career/admin/outcomes');
    setOutcomes(data.data);
  };

  useEffect(() => { (async () => {
    setLoading(true);
    try {
      await Promise.all([loadJobs(), loadInternships(), loadOutcomes()]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load career data');
    } finally {
      setLoading(false);
    }
  })(); }, []);

  useEffect(() => { if (tab === 'applications') loadApplications(); }, [tab, statusFilter, loadApplications]);

  const toggle = async (kind: 'job' | 'internship', item: Listing) => {
    await api.patch(`/career/admin/${kind}s/${item.id}/toggle`, { is_active: !item.is_active });
    if (kind === 'job') loadJobs(); else loadInternships();
  };

  const del = async (kind: 'job' | 'internship', item: Listing) => {
    if (!confirm(`Delete this ${kind}? This cannot be undone.`)) return;
    await api.delete(`/career/admin/${kind}s/${item.id}`);
    if (kind === 'job') loadJobs(); else loadInternships();
  };

  const setAppStatus = async (id: string, status: string, note?: string) => {
    await api.patch(`/career/admin/applications/${id}`, { status, note: note || undefined });
    loadApplications();
  };

  const funnel = outcomes && [
    ['Applied', outcomes.applied],
    ['Reviewing', outcomes.reviewing],
    ['Interviewing', outcomes.interviewing],
    ['Offered', outcomes.offered],
    ['Hired', outcomes.hired],
    ['Rejected', outcomes.rejected],
  ];

  const ListingCard = ({ item, kind }: { item: Listing; kind: 'job' | 'internship' }) => (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium">{item.title}</h3>
            {item.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
          </div>
          <p className="text-sm text-gray-400">{item.company} {item.location ? `· ${item.location}` : ''}</p>
          {Array.isArray(item.skills) && item.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {item.skills.map((s) => <Badge key={s}>{s}</Badge>)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => toggle(kind, item)} title={item.is_active ? 'Deactivate' : 'Activate'}>
            {item.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setModal({ open: true, kind, editing: item })}><Pencil className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => del(kind, item)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
        </div>
      </div>
    </GlassCard>
  );

  if (loading) return <div className="flex justify-center py-20"><Loader size="lg" text="Loading career pipeline..." /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Career Pipeline</h1>
        <p className="text-sm text-gray-400 mt-1">Manage job listings, internships, and the student application funnel.</p>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {outcomes && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {funnel?.map(([label, value]: [string, number]) => (
            <GlassCard key={String(label)} className="p-3 text-center">
              <p className="text-xl font-bold">{value}</p>
              <p className="text-[11px] text-gray-400 truncate">{label}</p>
            </GlassCard>
          ))}
        </div>
      )}

      <Tabs
        tabs={[
          { key: 'jobs', label: 'Jobs', icon: Briefcase },
          { key: 'internships', label: 'Internships', icon: FileText },
          { key: 'applications', label: 'Applications', icon: Users },
          { key: 'outcomes', label: 'Outcomes', icon: BarChart3 },
        ]}
        activeKey={tab}
        onChange={setTab}
        className="mb-6"
      />

      <TabPanel activeKey={tab} tabKey="jobs">
        <div className="flex justify-end mb-4">
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setModal({ open: true, kind: 'job' })}>Add Job</Button>
        </div>
        {jobs.length === 0 ? (
          <EmptyState icon={<Briefcase className="w-8 h-8" />} title="No jobs" description="Create your first job listing to start accepting applications." action={{ label: 'Add Job', onClick: () => setModal({ open: true, kind: 'job' }) }} />
        ) : (
          <div className="space-y-4">{jobs.map((j) => <ListingCard key={j.id} item={j} kind="job" />)}</div>
        )}
      </TabPanel>

      <TabPanel activeKey={tab} tabKey="internships">
        <div className="flex justify-end mb-4">
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setModal({ open: true, kind: 'internship' })}>Add Internship</Button>
        </div>
        {internships.length === 0 ? (
          <EmptyState icon={<FileText className="w-8 h-8" />} title="No internships" description="Create your first internship listing to start accepting applications." action={{ label: 'Add Internship', onClick: () => setModal({ open: true, kind: 'internship' }) }} />
        ) : (
          <div className="space-y-4">{internships.map((j) => <ListingCard key={j.id} item={j} kind="internship" />)}</div>
        )}
      </TabPanel>

      <TabPanel activeKey={tab} tabKey="applications">
        <div className="flex justify-end mb-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: 'all', label: 'All statuses' }, ...statuses.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]}
            className="w-48"
          />
        </div>
        {applications.length === 0 ? (
          <EmptyState icon={<Users className="w-8 h-8" />} title="No applications" description="Student applications will appear here once they apply." />
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <GlassCard key={app.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {app.applicant_avatar ? (
                      <img src={app.applicant_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold shrink-0">
                        {app.applicant_name?.[0] || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-medium">{app.applicant_name}</h3>
                      <p className="text-xs text-gray-400">{app.applicant_email}</p>
                      <p className="text-sm text-gray-500 mt-1.5">{app.role_title} <span className="text-gray-400">· {app.company}</span></p>
                      {app.cover_note && <p className="text-xs text-gray-500 mt-1.5 italic">"{app.cover_note}"</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant={statusVariant[app.status] || 'default'}>{app.status}</Badge>
                        {Array.isArray(app.status_timeline) && app.status_timeline.filter((t: any) => t.note).map((t: any, i: number) => (
                          <span key={i} className="text-xs text-gray-400">{t.note}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:items-end">
                    {statuses
                      .filter((s) => s === 'hired' || s === 'rejected' || (s !== 'applied' && s !== app.status))
                      .map((s) => (
                        <Button key={s} size="sm" variant={s === 'rejected' ? 'danger' : s === 'hired' ? 'primary' : 'outline'} disabled={s === app.status} onClick={() => setAppStatus(app.id, s)}>
                          {s === app.status && <Power className="w-3 h-3" />} {s === app.status ? 'Current' : s[0].toUpperCase() + s.slice(1)}
                        </Button>
                      ))}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </TabPanel>

      <TabPanel activeKey={tab} tabKey="outcomes">
        {!outcomes ? (
          <EmptyState icon={<BarChart3 className="w-8 h-8" />} title="No outcome data yet" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              ['Featured Jobs', outcomes.featuredJobs, Briefcase],
              ['Applications', outcomes.applied, Users],
              ['Alumni', outcomes.alumni, BarChart3],
            ].map(([label, value, Icon]) => (
              <GlassCard key={String(label)} className="p-6">
                <Icon className="w-6 h-6 text-primary-500 mb-3" />
                <p className="text-3xl font-bold">{value}</p>
                <p className="text-sm text-gray-400 mt-1">{label}</p>
              </GlassCard>
            ))}
          </div>
        )}
      </TabPanel>

      <ListingFormModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        editing={modal.editing || null}
        kind={modal.kind}
        onSaved={() => { if (modal.kind === 'job') loadJobs(); else loadInternships(); }}
      />
    </motion.div>
  );
}
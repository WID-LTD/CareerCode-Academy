import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Loader } from '@/components/ui/Loader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Link } from 'react-router-dom';
import { Plus, Link2, Copy, ExternalLink, ShieldCheck, Pencil, Trash2, FolderGit2, Award, Globe, Check } from 'lucide-react';

type Item = { id: string; title: string; description: string | null; url: string | null; skills: string[]; is_public: boolean };
type Project = { id: string; title: string; description: string; source_url: string | null; demo_url: string | null; skills: string[]; status: string; review_feedback: string | null };

export default function PortfolioPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('portfolio');

  const [itemModal, setItemModal] = useState<{ open: boolean; editing?: Item }>({ open: false });
  const [projectModal, setProjectModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/portfolio/me');
      setData({ ...data.data, portfolio_public: data.data.user?.portfolio_public ?? true });
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const togglePrivacy = async () => {
    await api.patch('/portfolio/privacy', { portfolio_public: !data.portfolio_public });
    load();
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/u/${data.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const saveItem = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = {
      title: (form.elements.namedItem('title') as HTMLInputElement).value,
      description: (form.elements.namedItem('description') as HTMLInputElement).value,
      url: (form.elements.namedItem('url') as HTMLInputElement).value || null,
      skills: (form.elements.namedItem('skills') as HTMLInputElement).value.split(',')
        .map((s: string) => s.trim()).filter(Boolean),
    };
    if (itemModal.editing) await api.put(`/portfolio/items/${itemModal.editing.id}`, payload);
    else await api.post('/portfolio/items', payload);
    setItemModal({ open: false });
    load();
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this portfolio item?')) return;
    await api.delete(`/portfolio/items/${id}`);
    load();
  };

  const saveProject = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = {
      title: (form.elements.namedItem('ptitle') as HTMLInputElement).value,
      description: (form.elements.namedItem('pdescription') as HTMLInputElement).value,
      source_url: (form.elements.namedItem('source') as HTMLInputElement).value || null,
      demo_url: (form.elements.namedItem('demo') as HTMLInputElement).value || null,
      skills: (form.elements.namedItem('pskills') as HTMLInputElement).value.split(',')
        .map((s: string) => s.trim()).filter(Boolean),
    };
    await api.post('/portfolio/projects', payload);
    setProjectModal(false);
    load();
  };

  const statusBadge: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  };

  if (loading) return <div className="flex justify-center py-20"><Loader size="lg" text="Loading portfolio..." /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Portfolio</h1>
          <p className="text-sm text-gray-400 mt-1">Show recruiters your projects and certificates.</p>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant={data.portfolio_public ? 'outline' : 'secondary'} onClick={togglePrivacy}>
              {data.portfolio_public ? <ShieldCheck className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              {data.portfolio_public ? 'Public' : 'Private'}
            </Button>
            <Link to="/student/portfolio/site">
              <Button size="sm" icon={<Globe className="w-4 h-4" />}>Portfolio website</Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={copyLink} title="Copy public profile link">
              {copied ? <CheckInline /> : <Copy className="w-4 h-4" />} /u/{data.username}
            </Button>
          </div>
        )}
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {data && (
        <GlassCard className="p-5 mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Link2 className="w-4 h-4 text-primary-500" />
              <span className="text-gray-400">Public profile:</span>
              <Link to={`/u/${data.username}`} className="text-primary-500 hover:text-primary-400 font-medium">
                {window.location.origin}/u/{data.username}
              </Link>
            </div>
            <Badge variant={data.portfolio_public ? 'success' : 'default'}>
              {data.portfolio_public ? 'Visible to everyone' : 'Only visible to you'}
            </Badge>
          </div>
        </GlassCard>
      )}

      <Tabs
        tabs={[
          { key: 'portfolio', label: 'Portfolio', icon: FolderGit2 },
          { key: 'projects', label: 'Projects', icon: Plus },
          { key: 'certificates', label: 'Certificates', icon: Award },
        ]}
        activeKey={tab}
        onChange={setTab}
        className="mb-6"
      />

      <TabPanel activeKey={tab} tabKey="portfolio">
        <div className="flex justify-end mb-4">
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setItemModal({ open: true })}>Add Item</Button>
        </div>
        {!data || data.items.length === 0 ? (
          <EmptyState icon={<FolderGit2 className="w-8 h-8" />} title="No portfolio items yet" description="Add projects you've built — they'll appear on your public profile." action={{ label: 'Add Item', onClick: () => setItemModal({ open: true }) }} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((item: Item) => (
              <GlassCard key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm">{item.title}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1 text-primary-500 hover:text-primary-400"><ExternalLink className="w-4 h-4" /></a>
                    )}
                    <button className="p-1 text-gray-500 hover:text-primary-500" onClick={() => setItemModal({ open: true, editing: item })}><Pencil className="w-4 h-4" /></button>
                    <button className="p-1 text-gray-500 hover:text-red-500" onClick={() => deleteItem(item.id)}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {item.description && <p className="text-xs text-gray-500 mt-1.5">{item.description}</p>}
                {item.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.skills.map((s: string) => <Badge key={s}>{s}</Badge>)}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </TabPanel>

      <TabPanel activeKey={tab} tabKey="projects">
        <div className="flex justify-end mb-4">
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setProjectModal(true)}>Submit Project</Button>
        </div>
        {!data || data.projects.length === 0 ? (
          <EmptyState icon={<FolderGit2 className="w-8 h-8" />} title="No projects submitted" description="Submit a project for review — approved projects are published to your public profile." action={{ label: 'Submit Project', onClick: () => setProjectModal(true) }} />
        ) : (
          <div className="space-y-4">
            {data.projects.map((p: Project) => (
              <GlassCard key={p.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{p.title}</h3>
                      <Badge variant={statusBadge[p.status] || 'default'}>{(p.status || '').toUpperCase()}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1.5">{p.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3 text-xs">
                      {p.source_url && <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="text-primary-500 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Source</a>}
                      {p.demo_url && <a href={p.demo_url} target="_blank" rel="noopener noreferrer" className="text-primary-500 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Live Demo</a>}
                    </div>
                    {p.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {p.skills.map((s: string) => <Badge key={s}>{s}</Badge>)}
                      </div>
                    )}
                  </div>
                </div>
                {p.status === 'rejected' && p.review_feedback && (
                  <Alert variant="error" title="Review feedback" className="mt-3">{p.review_feedback}</Alert>
                )}
                {p.status === 'pending' && (
                  <Alert variant="info" className="mt-3">Pending review by the Career team.</Alert>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </TabPanel>

      <TabPanel activeKey={tab} tabKey="certificates">
        {!data || data.certificates.length === 0 ? (
          <EmptyState icon={<Award className="w-8 h-8" />} title="No certificates yet" description="Earn certificates by completing courses — they'll be displayed here automatically." />
        ) : (
          <div className="space-y-3">
            {data.certificates.map((c: any) => (
              <GlassCard key={c.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-gray-500">Issued {new Date(c.issued_at).toLocaleDateString()}</p>
                </div>
                <Badge variant="success" size="sm">Verified</Badge>
              </GlassCard>
            ))}
          </div>
        )}
      </TabPanel>

      <Modal isOpen={itemModal.open} onClose={() => setItemModal({ open: false })} title={itemModal.editing ? 'Edit Portfolio Item' : 'Add Portfolio Item'}>
        <form onSubmit={saveItem} className="space-y-4">
          <Input label="Title" name="title" required defaultValue={itemModal.editing?.title} placeholder="e.g. Weather App" />
          <Input label="Description" name="description" defaultValue={itemModal.editing?.description || ''} placeholder="What it does, what you learned" />
          <Input label="URL (optional)" name="url" defaultValue={itemModal.editing?.url || ''} placeholder="https://..." />
          <Input label="Skills (comma separated)" name="skills" defaultValue={itemModal.editing?.skills?.join(', ') || ''} placeholder="React, Node.js, PostgreSQL" />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setItemModal({ open: false })}>Cancel</Button>
            <Button type="submit">{itemModal.editing ? 'Save' : 'Add'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={projectModal} onClose={() => setProjectModal(false)} title="Submit Project for Review" size="lg">
        <form onSubmit={saveProject} className="space-y-4">
          <Input label="Project Title" name="ptitle" required placeholder="e.g. E-commerce Storefront" />
          <Input label="Description" name="pdescription" required placeholder="What did you build and how?" />
          <Input label="Source Code URL" name="source" placeholder="https://github.com/..." />
          <Input label="Live Demo URL (optional)" name="demo" placeholder="https://..." />
          <Input label="Skills (comma separated)" name="pskills" placeholder="React, TypeScript, Tailwind" />
          <p className="text-xs text-gray-500">Submitted projects are reviewed by the Career team. Approved work is published to your public profile.</p>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setProjectModal(false)}>Cancel</Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}

function CheckInline() {
  return <Check className="w-4 h-4 text-green-500" />;
}
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Check, ExternalLink, Eye, EyeOff, Loader2, Palette,
  Pencil, Plus, Trash2, Upload, BarChart3,
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  description?: string;
  cover_url?: string;
  gallery?: string[];
  tech?: string[];
  role?: string;
  duration?: string;
  repo_url?: string;
  demo_url?: string;
  featured?: boolean;
}

const emptyProject = { title: '', summary: '', description: '', demo_url: '', repo_url: '', role: '', duration: '', tech: '', cover_url: '', featured: false };

export default function PortfolioBuilder() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [site, setSite] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [modal, setModal] = useState<{ open: boolean; id?: string; form: typeof emptyProject }>({ open: false, form: { ...emptyProject } });
  const [uploading, setUploading] = useState(false);
  const [domain, setDomain] = useState('');
  const [domainStatus, setDomainStatus] = useState('none');
  const [domainMsg, setDomainMsg] = useState('');

  const load = async () => {
    try {
      const [siteRes, analyticsRes] = await Promise.all([
        api.get('/portfolio/site'),
        api.get('/portfolio/site/analytics').catch(() => null),
      ]);
      const d = siteRes.data.data;
      setSite(d.site); setProjects(d.projects || []); setTemplates(d.templates || []); setUser(d.user);
      setDomain(d.site?.custom_domain || ''); setDomainStatus(d.site?.domain_status || 'none');
      if (analyticsRes) setAnalytics(analyticsRes.data.data);
    } catch {
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const saveSite = async (patch: any) => {
    setSaving(true);
    try {
      const { data } = await api.put('/portfolio/site', patch);
      setSite((s: any) => ({ ...s, ...data.data }));
      toast.success('Saved');
    } catch {
      toast.error('Failed to save');
    } finally { setSaving(false); }
  };

  const publish = async () => {
    try {
      const { data } = await api.post(site.is_published ? '/portfolio/site/unpublish' : '/portfolio/site/publish');
      setSite((s: any) => ({ ...s, is_published: data.data.is_published }));
      toast.success(data.data.is_published ? 'Portfolio published' : 'Portfolio unpublished');
    } catch { toast.error('Failed to update visibility'); }
  };

  const saveProject = async () => {
    const f = modal.form;
    if (!f.title.trim()) { toast.error('Title is required'); return; }
    const payload = {
      ...f,
      tech: f.tech.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (modal.id) {
        const { data } = await api.put(`/portfolio/site/projects/${modal.id}`, payload);
        setProjects((p) => p.map((x) => (x.id === modal.id ? { ...x, ...data.data } : x)));
      } else {
        const { data } = await api.post('/portfolio/site/projects', payload);
        setProjects((p) => [data.data, ...p]);
      }
      setModal({ open: false, form: { ...emptyProject } });
      toast.success('Project saved');
    } catch { toast.error('Failed to save project'); }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    try {
      await api.delete(`/portfolio/site/projects/${id}`);
      setProjects((p) => p.filter((x) => x.id !== id));
    } catch { toast.error('Failed to delete project'); }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/upload', form);
      setModal((m) => ({ ...m, form: { ...m.form, cover_url: data.data.url } }));
      toast.success('Image uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  if (loading) return <div className="min-h-[50vh] grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  if (!site) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/student/portfolio" className="text-sm text-gray-500 inline-flex items-center gap-1 mb-2"><ArrowLeft className="w-4 h-4" /> Portfolio</Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Portfolio website</h1>
          <p className="text-gray-500 mt-1">Choose a template, add projects and publish at <code>/u/{user?.username}</code>.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/u/${user?.username}`} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm inline-flex items-center gap-1.5">
            <ExternalLink className="w-4 h-4" /> Preview
          </a>
          <button onClick={publish} className={`px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 text-white ${site.is_published ? 'bg-gray-700' : 'bg-primary-500'}`}>
            {site.is_published ? <><EyeOff className="w-4 h-4" /> Unpublish</> : <><Eye className="w-4 h-4" /> Publish</>}
          </button>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-3 gap-3">
          {[['Views', analytics.views], ['Projects', analytics.projects], ['Status', analytics.published ? 'Live' : 'Draft']].map(([k, v]) => (
            <div key={k as string} className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500">{k}</p>
              <p className="text-xl font-bold mt-1">{v as any}</p>
            </div>
          ))}
        </div>
      )}

      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Palette className="w-4 h-4" /> Template</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t) => (
            <button key={t.id} onClick={() => saveSite({ template: t.id })}
              className={`text-left rounded-2xl border p-4 transition-all ${site.template === t.id ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-200 dark:border-gray-800 hover:border-gray-400'}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t.name}</span>
                {site.template === t.id && <Check className="w-4 h-4 text-primary-500" />}
              </div>
              <p className="text-xs text-gray-500 mt-1">{t.description}</p>
              <div className="mt-3 h-2 rounded-full" style={{ background: t.accent }} />
            </button>
          ))}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Headline</span>
          <input defaultValue={site.headline || ''} onBlur={(e) => saveSite({ headline: e.target.value })}
            className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" placeholder="Full-stack developer" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Location</span>
          <input defaultValue={site.location || ''} onBlur={(e) => saveSite({ location: e.target.value })}
            className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" placeholder="Lagos, Nigeria" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">About</span>
          <textarea defaultValue={site.about || ''} onBlur={(e) => saveSite({ about: e.target.value })} rows={4}
            className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Availability</span>
          <input defaultValue={site.availability || ''} onBlur={(e) => saveSite({ availability: e.target.value })}
            className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" placeholder="Open to freelance" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Contact email</span>
          <input defaultValue={site.contact_email || ''} onBlur={(e) => saveSite({ contact_email: e.target.value })}
            className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" placeholder="you@example.com" />
        </label>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        {(['github', 'linkedin', 'twitter', 'website'] as const).map((key) => (
          <label key={key} className="block">
            <span className="text-sm font-medium capitalize">{key}</span>
            <input defaultValue={(site.socials || {})[key] || ''} onBlur={(e) => saveSite({ socials: { ...(site.socials || {}), [key]: e.target.value } })}
              className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" placeholder={`https://${key}.com/you`} />
          </label>
        ))}
        <label className="block">
          <span className="text-sm font-medium">Accent colour</span>
          <div className="mt-1 flex items-center gap-2">
            <input type="color" defaultValue={site.theme?.accent || '#6366f1'} onChange={(e) => saveSite({ theme: { ...(site.theme || {}), accent: e.target.value } })}
              className="h-10 w-14 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent" />
            <span className="text-xs text-gray-500">{(site.theme || {}).accent || '#6366f1'}</span>
          </div>
        </label>
      </section>

      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
        <h2 className="font-semibold">Custom domain</h2>
        <p className="text-xs text-gray-500 mt-1">Use your own domain (e.g. yourname.com). DNS verification is automatic; serving requires the domain to be attached by an admin.</p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourname.com"
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
          <button onClick={async () => {
            try {
              const { data } = await api.put('/portfolio/site/custom-domain', { domain });
              setDomainStatus(data.data.status); setDomainMsg(data.data.instructions.join(' ')); toast.success('Domain saved');
            } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to save domain'); }
          }} className="px-3 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold">Save</button>
          <button onClick={async () => {
            try {
              const { data } = await api.post('/portfolio/site/custom-domain/verify');
              setDomainStatus(data.data.status); setDomainMsg(data.data.message);
              toast[data.data.verified ? 'success' : 'error'](data.data.message);
            } catch (e: any) { toast.error(e?.response?.data?.message || 'Verification failed'); }
          }} className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm">Verify</button>
        </div>
        {domainStatus !== 'none' && (
          <p className="text-xs mt-2 text-gray-500">Status: <strong className={domainStatus === 'verified' ? 'text-emerald-500' : 'text-amber-500'}>{domainStatus}</strong>{domainMsg ? ` — ${domainMsg}` : ''}</p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Projects</h2>
          <button onClick={() => setModal({ open: true, form: { ...emptyProject } })} className="px-3 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add project
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {projects.map((p) => (
            <div key={p.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {p.cover_url && <img src={p.cover_url} alt={p.title} className="w-full h-32 object-cover" />}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{p.title}</p>
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ open: true, id: p.id, form: { ...emptyProject, ...p, tech: (p.tech || []).join(', ') } })} aria-label="Edit"><Pencil className="w-4 h-4 text-gray-400" /></button>
                    <button onClick={() => deleteProject(p.id)} aria-label="Delete"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
                {p.summary && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.summary}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {modal.open && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-lg mx-auto my-8 rounded-2xl bg-white dark:bg-gray-900 p-5 space-y-3">
            <h3 className="font-bold text-lg">{modal.id ? 'Edit project' : 'New project'}</h3>
            {(['title', 'summary', 'description', 'demo_url', 'repo_url', 'role', 'duration', 'tech'] as const).map((field) => (
              <label key={field} className="block">
                <span className="text-xs font-medium capitalize">{field.replace('_', ' ')}{field === 'tech' ? ' (comma separated)' : ''}</span>
                {field === 'description' || field === 'summary' ? (
                  <textarea rows={field === 'description' ? 4 : 2} value={(modal.form as any)[field]} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, [field]: e.target.value } }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
                ) : (
                  <input value={(modal.form as any)[field]} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, [field]: e.target.value } }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
                )}
              </label>
            ))}
            <div>
              <span className="text-xs font-medium">Cover image</span>
              <div className="mt-1 flex items-center gap-2">
                <input value={modal.form.cover_url} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, cover_url: e.target.value } }))}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" placeholder="https://… or upload" />
                <label className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm cursor-pointer inline-flex items-center gap-1.5">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f); }} />
                </label>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={modal.form.featured} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, featured: e.target.checked } }))} />
              Featured
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal({ open: false, form: { ...emptyProject } })} className="px-3 py-2 rounded-xl text-sm">Cancel</button>
              <button onClick={saveProject} className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}

      {saving && <p className="text-xs text-gray-400">Saving…</p>}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Cookie, Loader2, Plus, Save, Scale, Shield, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const PAGES = [
  { slug: 'terms', label: 'Terms of Service', icon: Scale },
  { slug: 'privacy', label: 'Privacy Policy', icon: Shield },
  { slug: 'cookies', label: 'Cookie Policy', icon: Cookie },
];

const DEFAULTS: Record<string, any> = {
  terms: { title: 'Terms of Service', updated: 'November 11, 2026', intro: 'Please read these Terms of Service carefully before using the CareerCode Academy platform.', sections: [{ title: '1. Acceptance of Terms', content: 'By accessing or using CareerCode Academy, you agree to be bound by these Terms of Service.' }] },
  privacy: { title: 'Privacy Policy', updated: 'November 11, 2026', intro: 'This policy describes how CareerCode Academy collects, uses and protects your personal information.', sections: [{ title: '1. Information We Collect', content: 'We collect information you provide directly, including name, email address and profile details.' }] },
  cookies: { title: 'Cookie Policy', updated: 'November 11, 2026', intro: 'This Cookie Policy explains how CareerCode Academy uses cookies and similar technologies.', sections: [{ title: '1. What Are Cookies', content: 'Cookies are small text files stored on your device by your web browser.' }], cookies: [{ name: 'session_id', purpose: 'Authentication and session management', duration: 'Session', type: 'Essential' }] },
};

function parse(value: any) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch { return null; }
}

export default function LegalEditor({ base = '/admin/crm' }: { base?: string }) {
  const [tab, setTab] = useState('terms');
  const [content, setContent] = useState<Record<string, any>>(DEFAULTS);
  const [existing, setExisting] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all(PAGES.map((p) => api.get(`/pages/${p.slug}`).then(({ data }) => [p.slug, data.data] as const).catch(() => [p.slug, null] as const)))
      .then((rows) => {
        const next = { ...DEFAULTS };
        const has: Record<string, boolean> = {};
        for (const [slug, page] of rows) {
          if (!page) continue;
          has[slug] = true;
          const parsed = parse(page.content);
          if (parsed) next[slug] = { ...DEFAULTS[slug], ...parsed };
        }
        setContent(next);
        setExisting(has);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const current = content[tab] || DEFAULTS[tab];
  const sections = Array.isArray(current.sections) ? current.sections : [];
  const cookieRows = Array.isArray(current.cookies) ? current.cookies : [];

  const update = (path: (string | number)[], value: any) => {
    setContent((all) => {
      const next = JSON.parse(JSON.stringify(all));
      let cur = next[tab];
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { title: current.title, content: current, published: true };
      if (existing[tab]) await api.put(`/pages/${tab}`, payload);
      else await api.post('/pages', { slug: tab, ...payload });
      setExisting((e) => ({ ...e, [tab]: true }));
      toast.success(`${current.title} saved`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save legal page');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">Legal pages</p>
          <h2 className="text-xl font-bold">Terms, privacy and cookies</h2>
          <p className="text-sm text-gray-500 mt-1">These pages are stored in the platform and edited here, not in code.</p>
        </div>
        <Button loading={saving} onClick={save} icon={<Save className="w-4 h-4" />}>Save {current.title}</Button>
      </div>

      <Tabs tabs={PAGES.map((p) => ({ key: p.slug, label: p.label, icon: p.icon })) as any} activeKey={tab} onChange={setTab} variant="pills" />

      {loading ? <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : (
        <GlassCard hover={false} className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Page title" value={current.title || ''} onChange={(e) => update(['title'], e.target.value)} />
            <Input label="Last updated" value={current.updated || ''} onChange={(e) => update(['updated'], e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Introduction</label>
            <textarea rows={3} value={current.intro || ''} onChange={(e) => update(['intro'], e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Sections</h3>
              <Button size="sm" variant="outline" onClick={() => update(['sections'], [...sections, { title: '', content: '' }])} icon={<Plus className="w-3.5 h-3.5" />}>Add section</Button>
            </div>
            {sections.map((section: any, i: number) => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-400">Section {i + 1}</p>
                  <button onClick={() => update(['sections'], sections.filter((_: any, idx: number) => idx !== i))} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
                <Input label="Heading" value={section.title || ''} onChange={(e) => { const next = [...sections]; next[i] = { ...section, title: e.target.value }; update(['sections'], next); }} />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Body</label>
                  <textarea rows={3} value={section.content || ''} onChange={(e) => { const next = [...sections]; next[i] = { ...section, content: e.target.value }; update(['sections'], next); }} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
                </div>
              </div>
            ))}
          </div>

          {tab === 'cookies' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Cookie table</h3>
                <Button size="sm" variant="outline" onClick={() => update(['cookies'], [...cookieRows, { name: '', purpose: '', duration: '', type: 'Essential' }])} icon={<Plus className="w-3.5 h-3.5" />}>Add cookie</Button>
              </div>
              {cookieRows.map((row: any, i: number) => (
                <div key={i} className="grid sm:grid-cols-12 gap-2 items-end rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                  <div className="sm:col-span-3"><Input label="Name" value={row.name || ''} onChange={(e) => { const next = [...cookieRows]; next[i] = { ...row, name: e.target.value }; update(['cookies'], next); }} /></div>
                  <div className="sm:col-span-4"><Input label="Purpose" value={row.purpose || ''} onChange={(e) => { const next = [...cookieRows]; next[i] = { ...row, purpose: e.target.value }; update(['cookies'], next); }} /></div>
                  <div className="sm:col-span-2"><Input label="Duration" value={row.duration || ''} onChange={(e) => { const next = [...cookieRows]; next[i] = { ...row, duration: e.target.value }; update(['cookies'], next); }} /></div>
                  <div className="sm:col-span-2"><Input label="Type" value={row.type || ''} onChange={(e) => { const next = [...cookieRows]; next[i] = { ...row, type: e.target.value }; update(['cookies'], next); }} /></div>
                  <div className="sm:col-span-1"><button onClick={() => update(['cookies'], cookieRows.filter((_: any, idx: number) => idx !== i))} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2"><Button loading={saving} onClick={save} icon={<Save className="w-4 h-4" />}>Save {current.title}</Button></div>
        </GlassCard>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Globe, Home, Info, Mail, HelpCircle, PanelBottom, Plus, Save, Trash2, Loader2, BookOpen, Pencil, Scale } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import SEO from '@/components/seo/SEO';
import LegalEditor from '@/components/crm/LegalEditor';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const DEFAULTS: Record<string, any> = {
  home: {
    hero: { badge: 'Skill-First, Career-Focused', headline: 'Learn to Code,', subheadline: 'Acquire job-ready skills through hands-on projects, guided mentorship, and a curriculum built by industry professionals — skills you can use from day one.', typing: ['Master In-Demand Skills', 'Build Real-World Projects', 'Ship Production Apps', 'Earn Industry Certification'], primaryLabel: 'Start Building Skills', primaryHref: '/signup', secondaryLabel: 'Explore Programs', secondaryHref: '/courses' },
    trust: { heading: 'Built for real outcomes', subheading: 'No invented placement stats or borrowed logos — just the things we actually build into every programme.' },
    faq: { heading: 'Frequently Asked Questions', subheading: 'Got questions? We have answers. Cannot find what you are looking for? Contact our support team.' },
    cta: { heading: 'Build Hire-Ready Skills', body: 'Join thousands of learners turning hands-on practice into a portfolio employers can verify — then apply to roles directly through our in-platform career pipeline.' },
  },
  about: {
    hero: { title: 'Practical Tech Education, Built by WID LTD', paragraph1: 'CareerCode Academy is the education venture of WID LTD, a Nigerian technology company built on the philosophy of Unlimited Capability. We help beginners become job-ready developers through structured curriculum, real projects and human support.', paragraph2: 'We believe technology education should be practical, honest and reachable. Our programmes combine engineering rigour with the support learners need to finish.', location: 'Agbara, Ogun State, Nigeria' },
    mission: 'To engineer dependable systems and learning experiences that institutions and startups alike can stake their growth on.',
    vision: 'A digitally self-reliant Africa delivering technology the world depends on — starting with the people who build it.',
    contact: { email: 'contact@widltd.com.ng', phone: '+234 816 496 1457', office: 'Agbara, Ogun State, Nigeria', hours: 'Mon–Fri, 8:00 AM – 6:00 PM WAT' },
  },
  contact: { heading: 'Get in Touch', subheading: 'Have a question, feedback, or just want to say hello? We would love to hear from you.', email: 'contact@widltd.com.ng', supportEmail: 'hello@careercode.com.ng', phone: '+234 816 496 1457', office: 'Agbara, Ogun State, Nigeria', hours: 'Mon–Fri, 8:00 AM – 6:00 PM WAT', successMessage: 'We will get back to you within 24 hours.' },
  faq: { items: [
    { question: 'Do I need prior coding experience to join?', answer: 'Not at all. Our courses range from beginner to advanced levels. We have structured paths for complete beginners with no prior experience, as well as advanced tracks for experienced developers looking to upskill.' },
    { question: 'How long does it take to complete a course?', answer: 'Course duration varies from 8 to 24 weeks depending on the programme. Most students complete our flagship Full-Stack Web Development course in 16 weeks by dedicating 15 to 20 hours per week.' },
  ] },
  footer: { description: 'CareerCode Academy is the education venture of WID LTD (RC 8824091) — practical, project-based learning for people building technology careers.', tagline: 'WID LTD — The Motivation for Innovation. Registered in Nigeria, September 2025.', copyright: 'CareerCode Academy. All rights reserved.' },
};

const TITLES: Record<string, string> = { home: 'Home', about: 'About', contact: 'Contact', faq: 'FAQ', footer: 'Footer' };

function setPath(obj: any, path: string[], value: any) {
  const next = JSON.parse(JSON.stringify(obj));
  let cur = next;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = value;
  return next;
}

export default function AdminWebsite() {
  const [tab, setTab] = useState('home');
  const [content, setContent] = useState<Record<string, any>>(DEFAULTS);
  const [existing, setExisting] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [blogOpen, setBlogOpen] = useState(false);
  const [blogSaving, setBlogSaving] = useState(false);
  const [blogForm, setBlogForm] = useState<any>({ title: '', excerpt: '', content: '', category: 'Learning', tags: '', imageUrl: '' });
  const [editingBlog, setEditingBlog] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/pages').then(({ data }) => {
      const next = { ...DEFAULTS };
      const has: Record<string, boolean> = {};
      for (const page of data.data || []) {
        if (!next[page.slug]) continue;
        has[page.slug] = true;
        try {
          const parsed = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
          next[page.slug] = { ...next[page.slug], ...parsed };
        } catch { /* keep default */ }
      }
      setContent(next);
      setExisting(has);
      api.get('/blogs?all=true&limit=100').then(({ data }) => setBlogs(data.data || [])).catch(() => {});
    }).catch(() => toast.error('Failed to load website content')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (path: string[], value: any) => setContent((c) => ({ ...c, [tab]: setPath(c[tab], path, value) }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { title: TITLES[tab], content: content[tab], published: true };
      if (existing[tab]) await api.put(`/pages/${tab}`, payload);
      else await api.post('/pages', { slug: tab, ...payload });
      setExisting((e) => ({ ...e, [tab]: true }));
      toast.success(`${TITLES[tab]} page saved`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save page');
    } finally { setSaving(false); }
  };

  const home = content.home;
  const about = content.about;
  const contact = content.contact;
  const footer = content.footer;
  const faqs = content.faq.items || [];

  return (
    <>
      <SEO title="Website" description="Edit public website pages and landing page content." />
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">Public website</p>
            <h1 className="text-2xl sm:text-3xl font-bold">Website content</h1>
            <p className="text-sm text-gray-500 mt-1">Edit the home page, about page, contact details, frequently asked questions and footer without a deployment.</p>
          </div>
          <Button loading={saving} onClick={save} icon={<Save className="w-4 h-4" />}>Save {TITLES[tab]}</Button>
        </div>

        <Tabs
          tabs={[
            { key: 'home', label: 'Home', icon: Home },
            { key: 'about', label: 'About', icon: Info },
            { key: 'contact', label: 'Contact', icon: Mail },
            { key: 'faq', label: 'Questions', icon: HelpCircle },
            { key: 'footer', label: 'Footer', icon: PanelBottom },
            { key: 'blog', label: 'Blog', icon: BookOpen },
            { key: 'legal', label: 'Legal', icon: Scale },
          ]}
          activeKey={tab}
          onChange={setTab}
          variant="pills"
        />

        {loading ? <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div> : (
          <GlassCard hover={false} className="p-5 space-y-4">
            {tab === 'home' && (
              <>
                <Section title="Hero">
                  <Input label="Badge" value={home.hero.badge} onChange={(e) => update(['hero', 'badge'], e.target.value)} />
                  <Input label="Headline" value={home.hero.headline} onChange={(e) => update(['hero', 'headline'], e.target.value)} />
                  <Textarea label="Subheadline" value={home.hero.subheadline} onChange={(e) => update(['hero', 'subheadline'], e.target.value)} />
                  <Input label="Typing phrases (comma separated)" value={(home.hero.typing || []).join(', ')} onChange={(e) => update(['hero', 'typing'], e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input label="Primary button" value={home.hero.primaryLabel} onChange={(e) => update(['hero', 'primaryLabel'], e.target.value)} />
                    <Input label="Primary link" value={home.hero.primaryHref} onChange={(e) => update(['hero', 'primaryHref'], e.target.value)} />
                    <Input label="Secondary button" value={home.hero.secondaryLabel} onChange={(e) => update(['hero', 'secondaryLabel'], e.target.value)} />
                    <Input label="Secondary link" value={home.hero.secondaryHref} onChange={(e) => update(['hero', 'secondaryHref'], e.target.value)} />
                  </div>
                </Section>
                <Section title="Trust section">
                  <Input label="Heading" value={home.trust.heading} onChange={(e) => update(['trust', 'heading'], e.target.value)} />
                  <Textarea label="Subheading" value={home.trust.subheading} onChange={(e) => update(['trust', 'subheading'], e.target.value)} />
                </Section>
                <Section title="Call to action">
                  <Input label="Heading" value={home.cta.heading} onChange={(e) => update(['cta', 'heading'], e.target.value)} />
                  <Textarea label="Body" value={home.cta.body} onChange={(e) => update(['cta', 'body'], e.target.value)} />
                </Section>
              </>
            )}

            {tab === 'about' && (
              <>
                <Section title="About hero">
                  <Input label="Title" value={about.hero.title} onChange={(e) => update(['hero', 'title'], e.target.value)} />
                  <Textarea label="First paragraph" value={about.hero.paragraph1} onChange={(e) => update(['hero', 'paragraph1'], e.target.value)} />
                  <Textarea label="Second paragraph" value={about.hero.paragraph2} onChange={(e) => update(['hero', 'paragraph2'], e.target.value)} />
                  <Input label="Location" value={about.hero.location} onChange={(e) => update(['hero', 'location'], e.target.value)} />
                </Section>
                <Section title="Mission and vision">
                  <Textarea label="Mission" value={about.mission} onChange={(e) => update(['mission'], e.target.value)} />
                  <Textarea label="Vision" value={about.vision} onChange={(e) => update(['vision'], e.target.value)} />
                </Section>
                <Section title="Contact block">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input label="Email" value={about.contact.email} onChange={(e) => update(['contact', 'email'], e.target.value)} />
                    <Input label="Phone" value={about.contact.phone} onChange={(e) => update(['contact', 'phone'], e.target.value)} />
                    <Input label="Office" value={about.contact.office} onChange={(e) => update(['contact', 'office'], e.target.value)} />
                    <Input label="Hours" value={about.contact.hours} onChange={(e) => update(['contact', 'hours'], e.target.value)} />
                  </div>
                </Section>
              </>
            )}

            {tab === 'contact' && (
              <>
                <Section title="Page heading">
                  <Input label="Heading" value={contact.heading} onChange={(e) => update(['heading'], e.target.value)} />
                  <Textarea label="Subheading" value={contact.subheading} onChange={(e) => update(['subheading'], e.target.value)} />
                </Section>
                <Section title="Contact details">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input label="Company email" value={contact.email} onChange={(e) => update(['email'], e.target.value)} />
                    <Input label="Learner support email" value={contact.supportEmail} onChange={(e) => update(['supportEmail'], e.target.value)} />
                    <Input label="Phone" value={contact.phone} onChange={(e) => update(['phone'], e.target.value)} />
                    <Input label="Office" value={contact.office} onChange={(e) => update(['office'], e.target.value)} />
                    <Input label="Hours" value={contact.hours} onChange={(e) => update(['hours'], e.target.value)} />
                    <Input label="Success message" value={contact.successMessage} onChange={(e) => update(['successMessage'], e.target.value)} />
                  </div>
                </Section>
              </>
            )}

            {tab === 'faq' && (
              <Section title="Questions">
                <div className="space-y-3">
                  {faqs.map((item: any, i: number) => (
                    <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-400">Question {i + 1}</p>
                        <button onClick={() => update(['items'], faqs.filter((_: any, idx: number) => idx !== i))} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <Input label="Question" value={item.question} onChange={(e) => { const next = [...faqs]; next[i] = { ...item, question: e.target.value }; update(['items'], next); }} />
                      <Textarea label="Answer" value={item.answer} onChange={(e) => { const next = [...faqs]; next[i] = { ...item, answer: e.target.value }; update(['items'], next); }} />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => update(['items'], [...faqs, { question: '', answer: '' }])} icon={<Plus className="w-4 h-4" />}>Add question</Button>
                </div>
              </Section>
            )}

            {tab === 'legal' && <LegalEditor />}

            {tab === 'blog' && (
              <Section title="Blog posts">
                <div className="flex justify-end"><Button size="sm" onClick={() => { setEditingBlog(null); setBlogForm({ title: '', excerpt: '', content: '', category: 'Learning', tags: '', imageUrl: '' }); setBlogOpen(true); }} icon={<Plus className="w-4 h-4" />}>New post</Button></div>
                <div className="space-y-2">
                  {blogs.length === 0 ? <p className="text-sm text-gray-400">No posts yet.</p> : blogs.map((post) => (
                    <div key={post.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3">
                      <div className="min-w-0"><p className="text-sm font-medium truncate">{post.title}</p><p className="text-xs text-gray-400">{post.category} · {post.author_name || 'Author'} · {post.published ? 'Published' : 'Draft'}</p></div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingBlog(post.id); setBlogForm({ title: post.title, excerpt: post.excerpt || '', content: post.content, category: post.category, tags: Array.isArray(post.tags) ? post.tags.join(', ') : '', imageUrl: post.image_url || '' }); setBlogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={async () => { await api.put(`/blogs/${post.id}`, { published: !post.published }); toast.success(post.published ? 'Unpublished' : 'Published'); load(); }}>{post.published ? 'Unpublish' : 'Publish'}</Button>
                        <Button size="sm" variant="ghost" onClick={async () => { await api.delete(`/blogs/${post.id}`); toast.success('Post deleted'); load(); }}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {tab === 'footer' && (
              <Section title="Footer">
                <Textarea label="Description" value={footer.description} onChange={(e) => update(['description'], e.target.value)} />
                <Input label="Tagline" value={footer.tagline} onChange={(e) => update(['tagline'], e.target.value)} />
                <Input label="Copyright" value={footer.copyright} onChange={(e) => update(['copyright'], e.target.value)} />
              </Section>
            )}

            <div className="flex justify-end pt-2"><Button loading={saving} onClick={save} icon={<Save className="w-4 h-4" />}>Save {TITLES[tab]}</Button></div>
          </GlassCard>
        )}
      </div>

      <Modal isOpen={blogOpen} onClose={() => setBlogOpen(false)} title={editingBlog ? 'Edit blog post' : 'New blog post'} size="lg">
        <div className="space-y-3">
          <Input label="Title" value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })} />
          <Input label="Category" value={blogForm.category} onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })} />
          <Input label="Excerpt" value={blogForm.excerpt} onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })} />
          <Input label="Image link" value={blogForm.imageUrl} onChange={(e) => setBlogForm({ ...blogForm, imageUrl: e.target.value })} />
          <Input label="Tags (comma separated)" value={blogForm.tags} onChange={(e) => setBlogForm({ ...blogForm, tags: e.target.value })} />
          <Textarea label="Content" value={blogForm.content} onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })} />
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setBlogOpen(false)}>Cancel</Button><Button loading={blogSaving} onClick={async () => {
            setBlogSaving(true);
            try {
              const payload = { ...blogForm, tags: String(blogForm.tags || '').split(',').map((t) => t.trim()).filter(Boolean) };
              if (editingBlog) await api.put(`/blogs/${editingBlog}`, payload);
              else await api.post('/blogs', payload);
              toast.success(editingBlog ? 'Post updated' : 'Post created');
              setBlogOpen(false);
              load();
            } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to save post'); }
            finally { setBlogSaving(false); }
          }}>Save post</Button></div>
        </div>
      </Modal>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3"><h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>{children}</div>;
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <textarea rows={3} value={value || ''} onChange={onChange} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50" />
    </div>
  );
}

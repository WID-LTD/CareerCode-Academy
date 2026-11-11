import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowUpRight, Github, Globe, Linkedin, Mail, MapPin, Twitter,
  ExternalLink, ArrowLeft, Loader, Heart, Star,
} from 'lucide-react';
import api from '@/lib/axios';

interface Project {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  cover_url?: string | null;
  gallery?: string[];
  tech?: string[];
  role?: string | null;
  duration?: string | null;
  repo_url?: string | null;
  demo_url?: string | null;
  preview_image_url?: string | null;
  featured?: boolean;
}

interface Site {
  template: string;
  theme: { accent?: string; mode?: 'light' | 'dark' };
  headline?: string | null;
  about?: string | null;
  location?: string | null;
  availability?: string | null;
  contact_email?: string | null;
  socials?: Record<string, string>;
}

const accentOf = (site: Site) => site.theme?.accent || '#6366f1';

function Socials({ site, dark }: { site: Site; dark?: boolean }) {
  const s = site.socials || {};
  const items = [
    { href: s.github, icon: Github, label: 'GitHub' },
    { href: s.linkedin, icon: Linkedin, label: 'LinkedIn' },
    { href: s.twitter, icon: Twitter, label: 'Twitter' },
    { href: s.website, icon: Globe, label: 'Website' },
    { href: site.contact_email ? `mailto:${site.contact_email}` : undefined, icon: Mail, label: 'Email' },
  ].filter((i) => i.href);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map(({ href, icon: Icon, label }) => (
        <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}
          className={`p-2 rounded-xl border transition-colors ${dark ? 'border-white/10 hover:border-white/30 text-gray-300' : 'border-gray-200 hover:border-gray-400 text-gray-600'}`}>
          <Icon className="w-4 h-4" />
        </a>
      ))}
    </div>
  );
}

function Tech({ tech, accent, dark }: { tech: string[]; accent: string; dark?: boolean }) {
  if (!tech?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tech.map((t) => (
        <span key={t} className="text-[11px] px-2 py-0.5 rounded-full"
          style={{ background: `${accent}1a`, color: accent, border: `1px solid ${accent}33` }}>
          {t}
        </span>
      ))}
    </div>
  );
}

function ProjectCard({ project, accent, dark, onOpen }: { project: Project; accent: string; dark?: boolean; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className={`group text-left rounded-2xl overflow-hidden border transition-all hover:-translate-y-0.5 ${dark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
      {project.cover_url && (
        <div className="aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img src={project.cover_url} alt={project.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{project.title}</h3>
          <ArrowUpRight className="w-4 h-4 opacity-40 group-hover:opacity-100" style={{ color: accent }} />
        </div>
        {project.summary && <p className={`text-sm mt-1 line-clamp-2 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{project.summary}</p>}
        <div className="mt-3"><Tech tech={project.tech || []} accent={accent} dark={dark} /></div>
      </div>
    </button>
  );
}

export default function PortfolioSite({ username: forcedUsername, projectSlug: forcedProjectSlug }: { username?: string; projectSlug?: string } = {}) {
  const params = useParams();
  const username = forcedUsername || params.username;
  const projectSlug = forcedProjectSlug ?? params.projectSlug;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSending, setReviewSending] = useState(false);

  useEffect(() => {
    setData(null); setError(false);
    api.get(`/portfolio/site/${username}`)
      .then(({ data }) => {
        setData(data.data);
        setLikes(data.data.likes || 0);
        setLiked(!!data.data.liked);
      })
      .catch(() => setError(true));
    api.get(`/portfolio/site/${username}/reviews`)
      .then(({ data }) => setReviews(data.data || []))
      .catch(() => setReviews([]));
  }, [username]);

  const toggleLike = async () => {
    try {
      const { data } = await api.post(`/portfolio/site/${username}/like`);
      setLiked(data.data.liked);
      setLikes(data.data.likes);
    } catch { /* login required */ }
  };

  const submitReview = async () => {
    setReviewSending(true);
    try {
      await api.post(`/portfolio/site/${username}/review`, { rating: reviewRating, comment: reviewComment });
      const { data } = await api.get(`/portfolio/site/${username}/reviews`);
      setReviews(data.data || []);
      setReviewOpen(false);
      setReviewComment('');
    } catch { /* ignore */ }
    finally { setReviewSending(false); }
  };

  const project = useMemo(() => {
    if (!projectSlug || !data) return null;
    return (data.projects || []).find((p: Project) => p.slug === projectSlug) || null;
  }, [projectSlug, data]);

  const onSubdomain = useMemo(() => {
    const host = window.location.hostname.toLowerCase();
    return host.endsWith('.careercode.com.ng') && !['api', 'www', 'portfolio'].includes(host.split('.')[0]);
  }, []);
  const projectHref = (slug: string) => onSubdomain ? `/${slug}` : `/u/${username}/${slug}`;

  useEffect(() => {
    if (!data) return;
    const prevTitle = document.title;
    const cleanTitle = `${data.user.name}${project ? ` · ${project.title}` : ''} — Portfolio`;
    document.title = cleanTitle;
    const added: HTMLElement[] = [];
    const setMeta = (key: string, content: string, attr: 'name' | 'property' = 'name') => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        el.setAttribute('data-portfolio-meta', '1');
        document.head.appendChild(el);
        added.push(el);
      }
      el.setAttribute('content', content);
    };
    const description = data.site?.headline || data.user.headline || `Portfolio of ${data.user.name}`;
    const canonical = onSubdomain
      ? `https://${username}.careercode.com.ng${projectSlug ? `/${projectSlug}` : '/'}`
      : `${window.location.origin}/u/${username}${projectSlug ? `/${projectSlug}` : ''}`;
    setMeta('description', description);
    setMeta('author', data.user.name);
    setMeta('generator', 'CareerCode Academy');
    setMeta('copyright', 'WID LTD (RC 8824091)');
    setMeta('robots', 'index,follow');
    setMeta('og:title', cleanTitle, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:type', 'profile', 'property');
    setMeta('og:url', canonical, 'property');
    setMeta('twitter:card', 'summary');
    setMeta('twitter:title', cleanTitle);
    setMeta('twitter:description', description);

    let canonicalEl = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      canonicalEl.setAttribute('data-portfolio-meta', '1');
      document.head.appendChild(canonicalEl);
      added.push(canonicalEl);
    }
    canonicalEl.href = canonical;

    let ld = document.getElementById('portfolio-jsonld') as HTMLScriptElement | null;
    if (!ld) {
      ld = document.createElement('script');
      ld.id = 'portfolio-jsonld';
      ld.type = 'application/ld+json';
      ld.setAttribute('data-portfolio-meta', '1');
      document.head.appendChild(ld);
      added.push(ld);
    }
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person',
        name: data.user.name,
        jobTitle: data.user.headline || undefined,
        description,
        url: canonical,
        image: data.user.avatar || undefined,
        sameAs: Object.values(data.site?.socials || {}).filter(Boolean),
      },
      isPartOf: { '@type': 'WebSite', name: 'CareerCode Academy', url: 'https://careercode.com.ng' },
      copyrightHolder: { '@type': 'Organization', name: 'WID LTD', identifier: 'RC 8824091' },
    });

    return () => {
      document.title = prevTitle;
      added.forEach((el) => el.remove());
    };
  }, [data, project, username, projectSlug, onSubdomain]);

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-950 text-gray-200 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Portfolio not found</h1>
          <p className="text-gray-400 mb-5">This portfolio may be private or the link is wrong.</p>
        </div>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen grid place-items-center bg-gray-950"><Loader className="text-indigo-400" /></div>;

  const { user, site, projects } = data as { user: any; site: Site; projects: Project[] };
  const accent = accentOf(site);
  const dark = site.template === 'terminal' || site.template === 'gradient' || site.theme?.mode === 'dark';

  // ── Project detail ────────────────────────────────────────────────────
  if (projectSlug && project) {
    return (
      <div className={dark ? 'min-h-screen bg-gray-950 text-gray-100' : 'min-h-screen bg-white text-gray-900'}>
        <div className="max-w-4xl mx-auto px-5 py-10">
          <Link to={onSubdomain ? '/' : `/u/${username}`} className="inline-flex items-center gap-1.5 text-sm opacity-70 hover:opacity-100">
            <ArrowLeft className="w-4 h-4" /> {user.name}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold mt-6">{project.title}</h1>
          {project.summary && <p className="mt-3 text-lg opacity-70">{project.summary}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm opacity-70">
            {project.role && <span>{project.role}</span>}
            {project.duration && <span>· {project.duration}</span>}
          </div>
          <div className="mt-4"><Tech tech={project.tech || []} accent={accent} dark={dark} /></div>

          <div className="mt-6 flex flex-wrap gap-2">
            {project.demo_url && (
              <a href={project.demo_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ background: accent }}>
                <ExternalLink className="w-4 h-4" /> Live site
              </a>
            )}
            {project.repo_url && (
              <a href={project.repo_url} target="_blank" rel="noreferrer"
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border ${dark ? 'border-white/15' : 'border-gray-300'}`}>
                <Github className="w-4 h-4" /> Source
              </a>
            )}
          </div>

          {(project.gallery?.length ? project.gallery : project.cover_url ? [project.cover_url] : []).map((src: string, i: number) => (
            <img key={i} src={src} alt={`${project.title} ${i + 1}`} loading="lazy" className="mt-6 w-full rounded-2xl border border-black/10" />
          ))}

          {project.demo_url && (
            <div className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Website preview</h2>
                {!showPreview && (
                  <button onClick={() => setShowPreview(true)} className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: accent, color: accent }}>
                    Load live preview
                  </button>
                )}
              </div>
              {showPreview ? (
                <div className="mt-3 rounded-2xl overflow-hidden border" style={{ borderColor: `${accent}44` }}>
                  <iframe
                    src={project.demo_url}
                    title={`${project.title} live preview`}
                    className="w-full h-[70vh] bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="mt-3 rounded-2xl overflow-hidden border border-dashed p-6 text-center text-sm opacity-60">
                  Previews load on demand for safety and speed.
                </div>
              )}
            </div>
          )}

          {project.description && (
            <div className="mt-8 prose dark:prose-invert max-w-none whitespace-pre-line">{project.description}</div>
          )}
        </div>
      </div>
    );
  }

  const shell = dark ? 'min-h-screen bg-gray-950 text-gray-100' : 'min-h-screen bg-white text-gray-900';

  // ── Terminal ──────────────────────────────────────────────────────────
  if (site.template === 'terminal') {
    return (
      <div className={`${shell} font-mono`}>
        <div className="max-w-4xl mx-auto px-5 py-12">
          <p className="text-emerald-400 text-sm">~/portfolio $ whoami</p>
          <h1 className="text-3xl sm:text-5xl font-bold mt-3">{user.name}</h1>
          {site.headline && <p className="text-emerald-300 mt-2">{site.headline}</p>}
          <p className="mt-4 text-gray-400 whitespace-pre-line max-w-2xl">{site.about}</p>
          <div className="mt-4"><Socials site={site} dark /></div>
          <p className="mt-10 text-emerald-400 text-sm">~/portfolio $ ls projects</p>
          <div className="mt-4 space-y-3">
            {projects.map((p) => (
              <Link key={p.id} to={`/u/${username}/${p.slug}`} className="block rounded-xl border border-white/10 p-4 hover:border-emerald-400/50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{p.title}</span>
                  <span className="text-xs text-gray-500">{(p.tech || []).join(' · ')}</span>
                </div>
                {p.summary && <p className="text-sm text-gray-400 mt-1">{p.summary}</p>}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Grid ──────────────────────────────────────────────────────────────
  if (site.template === 'grid') {
    return (
      <div className={shell}>
        <div className="max-w-6xl mx-auto px-5 py-12">
          <header className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold">{user.name}</h1>
            {site.headline && <p className="mt-2 text-lg opacity-70">{site.headline}</p>}
            <div className="mt-4"><Socials site={site} dark={dark} /></div>
          </header>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [&>*]:mb-4">
            {projects.map((p) => (
              <div key={p.id} className="break-inside-avoid">
                <ProjectCard project={p} accent={accent} dark={dark} onOpen={() => (window.location.href = projectHref(p.slug))} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Split ─────────────────────────────────────────────────────────────
  if (site.template === 'split') {
    return (
      <div className={shell}>
        <div className="max-w-6xl mx-auto px-5 py-10 grid lg:grid-cols-[320px_1fr] gap-10">
          <aside className="lg:sticky lg:top-10 self-start">
            {user.avatar && <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-2xl object-cover mb-4" />}
            <h1 className="text-3xl font-bold">{user.name}</h1>
            {site.headline && <p className="mt-2 text-sm" style={{ color: accent }}>{site.headline}</p>}
            {site.location && <p className="mt-3 text-sm opacity-60 inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{site.location}</p>}
            <p className="mt-4 text-sm opacity-75 whitespace-pre-line">{site.about}</p>
            <div className="mt-4"><Socials site={site} dark={dark} /></div>
            {site.availability && <p className="mt-4 text-xs px-2 py-1 rounded-lg inline-block" style={{ background: `${accent}1a`, color: accent }}>{site.availability}</p>}
          </aside>
          <main className="grid sm:grid-cols-2 gap-4">
            {projects.map((p) => <ProjectCard key={p.id} project={p} accent={accent} dark={dark} onOpen={() => (window.location.href = projectHref(p.slug))} />)}
          </main>
        </div>
      </div>
    );
  }

  // ── Timeline ──────────────────────────────────────────────────────────
  if (site.template === 'timeline') {
    return (
      <div className={shell}>
        <div className="max-w-3xl mx-auto px-5 py-12">
          <h1 className="text-4xl font-bold">{user.name}</h1>
          {site.headline && <p className="mt-2 text-lg opacity-70">{site.headline}</p>}
          <div className="mt-4"><Socials site={site} dark={dark} /></div>
          <div className="mt-10 relative border-l pl-6" style={{ borderColor: `${accent}44` }}>
            {projects.map((p) => (
              <div key={p.id} className="relative mb-8">
                <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full" style={{ background: accent }} />
                <Link to={`/u/${username}/${p.slug}`} className="group">
                  <h3 className="font-semibold group-hover:underline">{p.title}</h3>
                  {p.summary && <p className="text-sm opacity-70 mt-1">{p.summary}</p>}
                  <div className="mt-2"><Tech tech={p.tech || []} accent={accent} dark={dark} /></div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Gradient ──────────────────────────────────────────────────────────
  if (site.template === 'gradient') {
    return (
      <div className={shell}>
        <div className="px-5 py-16 text-center" style={{ background: `linear-gradient(135deg, ${accent}33, transparent 60%)` }}>
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-extrabold">{user.name}</h1>
            {site.headline && <p className="mt-3 text-lg opacity-80">{site.headline}</p>}
            <div className="mt-5 flex justify-center"><Socials site={site} dark={dark} /></div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-5 py-10 grid sm:grid-cols-2 gap-4">
          {projects.map((p) => <ProjectCard key={p.id} project={p} accent={accent} dark={dark} onOpen={() => (window.location.href = projectHref(p.slug))} />)}
        </div>
      </div>
    );
  }


  // ── Magazine ──────────────────────────────────────────────────────────
  if (site.template === 'magazine') {
    return (
      <div className={shell}>
        <div className="max-w-5xl mx-auto px-5 py-12">
          <p className="text-xs uppercase tracking-[0.3em] opacity-50">Portfolio</p>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mt-3" style={{ color: accent }}>{user.name}</h1>
          {site.headline && <p className="text-xl sm:text-2xl mt-4 opacity-80 max-w-2xl">{site.headline}</p>}
          <div className="mt-6"><Socials site={site} dark={dark} /></div>
          {site.about && <p className="mt-10 text-base leading-relaxed opacity-75 max-w-3xl whitespace-pre-line">{site.about}</p>}
          <div className="mt-12 border-t" style={{ borderColor: `${accent}33` }}>
            {projects.map((p, i) => (
              <Link key={p.id} to={`/u/${username}/${p.slug}`} className="grid sm:grid-cols-[80px_1fr_auto] gap-4 items-baseline py-6 border-b group" style={{ borderColor: `${accent}22` }}>
                <span className="text-sm font-mono opacity-40">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="text-2xl font-bold group-hover:underline">{p.title}</h3>
                  {p.summary && <p className="text-sm opacity-60 mt-1 max-w-xl">{p.summary}</p>}
                </div>
                <span className="text-xs opacity-50">{(p.tech || []).slice(0, 3).join(' · ')}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Compact ───────────────────────────────────────────────────────────
  if (site.template === 'compact') {
    return (
      <div className={shell}>
        <div className="max-w-2xl mx-auto px-5 py-10 font-mono text-sm">
          <h1 className="text-xl font-bold">{user.name}</h1>
          {site.headline && <p style={{ color: accent }}>{site.headline}</p>}
          {site.about && <p className="mt-3 opacity-70 whitespace-pre-line">{site.about}</p>}
          <div className="mt-4"><Socials site={site} dark={dark} /></div>
          <p className="mt-8 opacity-40">— projects —</p>
          <ul className="mt-2 space-y-2">
            {projects.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3">
                <Link to={`/u/${username}/${p.slug}`} className="hover:underline" style={{ color: accent }}>{p.title}</Link>
                <span className="text-xs opacity-40">{(p.tech || []).slice(0, 2).join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ── Showcase ──────────────────────────────────────────────────────────
  if (site.template === 'showcase') {
    return (
      <div className={shell}>
        <div className="max-w-5xl mx-auto px-5 py-10">
          <h1 className="text-3xl sm:text-5xl font-bold">{user.name}</h1>
          {site.headline && <p className="mt-2 opacity-70">{site.headline}</p>}
          <div className="mt-4"><Socials site={site} dark={dark} /></div>
          <div className="mt-10 space-y-6">
            {projects.map((p) => (
              <Link key={p.id} to={`/u/${username}/${p.slug}`} className="block relative rounded-3xl overflow-hidden group">
                {p.cover_url
                  ? <img src={p.cover_url} alt={p.title} loading="lazy" className="w-full h-[42vh] object-cover group-hover:scale-[1.02] transition-transform duration-700" />
                  : <div className="w-full h-[28vh]" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}44)` }} />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-2xl font-bold">{p.title}</h3>
                  {p.summary && <p className="text-sm text-white/75 mt-1 max-w-xl">{p.summary}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Resume ────────────────────────────────────────────────────────────
  if (site.template === 'resume') {
    return (
      <div className={shell}>
        <div className="max-w-5xl mx-auto px-5 py-10 grid lg:grid-cols-[280px_1fr] gap-10">
          <aside>
            {user.avatar && <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover mb-4" />}
            <h1 className="text-2xl font-bold">{user.name}</h1>
            {site.headline && <p className="text-sm mt-1" style={{ color: accent }}>{site.headline}</p>}
            <div className="mt-4 space-y-1 text-sm opacity-70">
              {site.location && <p>{site.location}</p>}
              {site.contact_email && <p className="break-all">{site.contact_email}</p>}
              {site.availability && <p>{site.availability}</p>}
            </div>
            <div className="mt-4"><Socials site={site} dark={dark} /></div>
            <div className="mt-6">
              <p className="text-xs uppercase tracking-widest opacity-40 mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(projects.flatMap((p) => p.tech || []))].slice(0, 16).map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: `${accent}44`, color: accent }}>{t}</span>
                ))}
              </div>
            </div>
          </aside>
          <main>
            {site.about && (
              <section className="mb-8">
                <h2 className="text-xs uppercase tracking-widest opacity-40 mb-2">Profile</h2>
                <p className="text-sm leading-relaxed opacity-80 whitespace-pre-line">{site.about}</p>
              </section>
            )}
            <section>
              <h2 className="text-xs uppercase tracking-widest opacity-40 mb-3">Selected projects</h2>
              <div className="space-y-4">
                {projects.map((p) => (
                  <Link key={p.id} to={`/u/${username}/${p.slug}`} className="block">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-semibold">{p.title}</h3>
                      <span className="text-xs opacity-40">{p.duration || ''}</span>
                    </div>
                    {p.summary && <p className="text-sm opacity-65 mt-0.5">{p.summary}</p>}
                    {p.tech?.length ? <p className="text-xs opacity-40 mt-1">{p.tech.join(' · ')}</p> : null}
                  </Link>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  // ── Minimal (default) ─────────────────────────────────────────────────
  return (
    <div className={shell}>
      <div className="max-w-3xl mx-auto px-5 py-14">
        <header className="mb-12">
          <div className="flex items-center gap-4">
            {user.avatar && <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full object-cover" />}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">{user.name}</h1>
              {site.headline && <p className="text-sm mt-1" style={{ color: accent }}>{site.headline}</p>}
            </div>
          </div>
          {site.about && <p className="mt-5 opacity-75 leading-relaxed whitespace-pre-line">{site.about}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Socials site={site} dark={dark} />
            {site.location && <span className="text-sm opacity-60 inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{site.location}</span>}
          </div>
          <div className="mt-5 flex items-center gap-2">
            <button onClick={toggleLike} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm" style={{ borderColor: liked ? accent : undefined, color: liked ? accent : undefined }}>
              <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} /> {likes}
            </button>
            <button onClick={() => setReviewOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm">
              <Star className="w-4 h-4" /> {reviews.length} reviews
            </button>
          </div>
        </header>
        <section>
          <h2 className="text-xs uppercase tracking-widest opacity-50 mb-4">Selected work</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {projects.map((p) => <ProjectCard key={p.id} project={p} accent={accent} dark={dark} onOpen={() => (window.location.href = projectHref(p.slug))} />)}
          </div>
        </section>
        {reviews.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xs uppercase tracking-widest opacity-50 mb-4">Reviews</h2>
            <div className="space-y-3">
              {reviews.slice(0, 6).map((r) => (
                <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-amber-500">{'★'.repeat(r.rating)}</span>
                  </div>
                  {r.comment && <p className="text-sm opacity-70 mt-1">{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        <footer className="mt-14 text-xs opacity-40">© {new Date().getFullYear()} WID LTD. All rights reserved.</footer>

        {reviewOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-5">
              <h3 className="font-semibold mb-3">Leave a review</h3>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setReviewRating(n)} aria-label={`${n} stars`}>
                    <Star className={`w-6 h-6 ${n <= reviewRating ? 'text-amber-500 fill-current' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" placeholder="Share your feedback…" />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setReviewOpen(false)} className="px-3 py-2 text-sm">Cancel</button>
                <button onClick={submitReview} disabled={reviewSending} className="px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{ background: accent }}>
                  {reviewSending ? 'Sending…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

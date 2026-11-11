import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Loader2, ArrowUpRight, Sparkles } from 'lucide-react';
import api from '@/lib/axios';
import SEO from '@/components/seo/SEO';

interface Entry {
  username: string;
  name: string;
  avatar: string | null;
  headline: string | null;
  template: string;
  theme: { accent?: string };
  views: number;
  project_count: number;
}

export default function PortfolioDirectory() {
  const [items, setItems] = useState<Entry[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (q = '') => {
    setLoading(true);
    try {
      const { data } = await api.get(`/portfolio/directory${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      setItems(data.data || []);
    } catch {
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <SEO title="Portfolios" description="Explore portfolios built by CareerCode Academy learners." />
      <div className="max-w-6xl mx-auto px-5 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Learner portfolios</h1>
            <p className="text-gray-500 mt-2">Real projects from CareerCode students and graduates.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void load(query); }} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or headline…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </form>
        </div>

        {loading ? (
          <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No published portfolios yet.</p>
            <Link to="/student/portfolio/site" className="text-primary-500 text-sm">Build yours →</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {items.map((item) => {
              const accent = item.theme?.accent || '#6366f1';
              return (
                <Link key={item.username} to={`/u/${item.username}`}
                  className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:-translate-y-0.5 transition-all">
                  <div className="h-24" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}55)` }} />
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {item.avatar
                        ? <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                        : <div className="w-10 h-10 rounded-full grid place-items-center text-white font-bold" style={{ background: accent }}>{item.name?.[0] || 'C'}</div>}
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 truncate">{item.headline || `@${item.username}`}</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 ml-auto text-gray-400 group-hover:text-primary-500" />
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                      <span>{item.project_count} projects</span>
                      <span>·</span>
                      <span className="capitalize">{item.template}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

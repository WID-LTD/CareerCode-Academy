import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, User, Tag, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import api from '@/lib/axios';
import SEO from '@/components/seo/SEO';

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get(`/blogs/${slug}`)
      .then(({ data }) => { if (alive) setPost(data.data); })
      .catch(() => { if (alive) setPost(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug]);

  if (loading) {
    return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>;
  }

  if (!post) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Post Not Found</h2>
          <Link to="/blog"><Button>Back to Blog</Button></Link>
        </div>
      </div>
    );
  }

  const tags: string[] = (() => {
    try { const t = JSON.parse(post.tags || '[]'); return Array.isArray(t) ? t : []; } catch { return []; }
  })();
  const readTime = `${Math.max(1, Math.ceil(String(post.content || '').split(/\s+/).length / 220))} min read`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title={post.title} description={String(post.excerpt || post.content || '').slice(0, 160)} type="article" />
      <div className="relative h-[32vh] min-h-[220px] overflow-hidden">
        {post.image_url ? (
          <img src={post.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-cyan-500/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-950 via-white/40 dark:via-gray-950/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 mb-4 hover:text-primary-500">
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </Link>
            <Badge variant="primary" size="sm" className="mb-3">{post.category}</Badge>
            <h1 className="text-2xl sm:text-4xl font-bold leading-tight">{post.title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            {post.author_name || 'CareerCode Academy'}
          </span>
          <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{formatDate(post.created_at)}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{readTime}</span>
        </div>

        <GlassCard className="p-6 sm:p-8" hover={false}>
          <article className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary-500 prose-img:rounded-xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
          </article>
        </GlassCard>

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-6">
            <Tag className="w-4 h-4 text-gray-400" />
            {tags.map((t) => <span key={t} className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">#{t}</span>)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

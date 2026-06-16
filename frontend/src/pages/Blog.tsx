import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight, User, Tag, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import api from '@/lib/axios';

export default function Blog() {
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const { data } = await api.get('/blogs');
        setPosts(data.data || []);
      } catch {
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPosts();
  }, []);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              CareerCode <span className="gradient-text">Blog</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Insights, tutorials, and career advice from industry experts to help you level up.
            </p>
          </motion.div>

          {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.length === 0 && (
          <div className="col-span-full text-center py-20 text-gray-500">No blog posts yet.</div>
        )}
        {posts.map((post, i) => (
          <motion.div
            key={post.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={`/blog/${post.slug}`}>
              <GlassCard hover className="overflow-hidden h-full">
                <div className="h-48 overflow-hidden">
                  <img src={post.image_url || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=400&fit=crop'} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="primary" size="sm">{post.category}</Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-primary-500 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {post.author_name || 'Author'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(post.created_at)}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </div>
      )}
        </div>
      </section>
    </motion.div>
  );
}

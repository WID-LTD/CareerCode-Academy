import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, ArrowRight, User, Tag } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

const posts = [
  {
    title: 'The Complete Guide to Landing Your First Developer Job in 2025',
    excerpt: 'Learn the proven strategies and skills you need to stand out in today\'s competitive tech job market.',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop',
    author: 'Sarah Mitchell',
    date: '2025-03-15',
    readTime: '8 min read',
    category: 'Career Advice',
    tags: ['job search', 'interviews', 'portfolio'],
    slug: 'landing-first-dev-job',
  },
  {
    title: 'React 19: Everything You Need to Know About the Latest Features',
    excerpt: 'Explore the groundbreaking features in React 19 and how they will change the way you build applications.',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop',
    author: 'David Kim',
    date: '2025-03-10',
    readTime: '6 min read',
    category: 'Technology',
    tags: ['react', 'frontend', 'javascript'],
    slug: 'react-19-features',
  },
  {
    title: 'Building Scalable APIs with Node.js and Express Best Practices',
    excerpt: 'A deep dive into architecting production-ready APIs that can handle millions of requests.',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop',
    author: 'Alex Rivera',
    date: '2025-03-05',
    readTime: '10 min read',
    category: 'Tutorial',
    tags: ['nodejs', 'api', 'backend'],
    slug: 'scalable-apis-nodejs',
  },
  {
    title: 'Why Project-Based Learning is the Fastest Way to Learn Coding',
    excerpt: 'Discover why building real projects accelerates your learning more than traditional methods.',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=400&fit=crop',
    author: 'Maya Patel',
    date: '2025-02-28',
    readTime: '5 min read',
    category: 'Learning',
    tags: ['education', 'project-based', 'tips'],
    slug: 'project-based-learning',
  },
  {
    title: 'Mastering TypeScript: Advanced Patterns for Production Apps',
    excerpt: 'Take your TypeScript skills to the next level with advanced patterns used by top engineering teams.',
    image: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&h=400&fit=crop',
    author: 'David Kim',
    date: '2025-02-20',
    readTime: '7 min read',
    category: 'Tutorial',
    tags: ['typescript', 'patterns', 'advanced'],
    slug: 'advanced-typescript-patterns',
  },
  {
    title: 'The State of Web Development in 2025: Trends to Watch',
    excerpt: 'An overview of the most important trends shaping web development this year and beyond.',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=400&fit=crop',
    author: 'Sarah Mitchell',
    date: '2025-02-15',
    readTime: '6 min read',
    category: 'Industry',
    tags: ['trends', 'webdev', '2025'],
    slug: 'web-dev-trends-2025',
  },
];

export default function Blog() {
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="primary" size="sm">{post.category}</Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" /> {post.readTime}
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-primary-500 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {post.author}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(post.date)}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

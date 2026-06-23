import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Users, ThumbsUp, Eye, Clock, Plus, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

const topics = [
  { id: 1, title: 'Best resources for learning React in 2025?', author: 'SarahDev', replies: 24, views: 342, likes: 15, category: 'Web Development', lastActivity: '2 hours ago', tags: ['react', 'resources', 'beginners'] },
  { id: 2, title: 'How do I optimize MongoDB queries for performance?', author: 'MongoMaster', replies: 18, views: 256, likes: 12, category: 'Backend', lastActivity: '5 hours ago', tags: ['mongodb', 'performance', 'optimization'] },
  { id: 3, title: 'Portfolio review thread - post your projects here!', author: 'CodeReviewer', replies: 47, views: 891, likes: 32, category: 'Career', lastActivity: '1 day ago', tags: ['portfolio', 'review', 'projects'] },
  { id: 4, title: 'Tips for system design interviews at FAANG', author: 'TechLead123', replies: 31, views: 567, likes: 28, category: 'Interviews', lastActivity: '2 days ago', tags: ['interviews', 'system-design', 'faang'] },
  { id: 5, title: 'Python vs JavaScript for beginners in 2025', author: 'NewCoder', replies: 42, views: 723, likes: 20, category: 'General', lastActivity: '3 days ago', tags: ['python', 'javascript', 'beginners'] },
  { id: 6, title: 'Deploying Next.js apps to AWS - step by step guide', author: 'CloudGuru', replies: 15, views: 198, likes: 19, category: 'DevOps', lastActivity: '4 days ago', tags: ['nextjs', 'aws', 'deployment'] },
  { id: 7, title: 'How I landed my first dev job in 3 months', author: 'SuccessStory', replies: 56, views: 1204, likes: 45, category: 'Success Stories', lastActivity: '5 days ago', tags: ['career', 'success', 'job-search'] },
  { id: 8, title: 'Docker vs Kubernetes - when to use which?', author: 'DevOpsNewbie', replies: 22, views: 334, likes: 16, category: 'DevOps', lastActivity: '1 week ago', tags: ['docker', 'kubernetes', 'devops'] },
];

const categories = ['All', 'Web Development', 'Backend', 'DevOps', 'Career', 'Interviews', 'General', 'Success Stories'];

export default function Community() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({ title: '', category: 'General', content: '' });

  const filtered = topics.filter(t => {
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.author.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleNewDiscussion = () => {
    toast.success('Discussion created! (Mock)');
    setShowNewDiscussion(false);
    setNewDiscussion({ title: '', category: 'General', content: '' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-2">Community <span className="gradient-text">Forums</span></h1>
              <p className="text-gray-600 dark:text-gray-400">Join the conversation with 10,000+ fellow developers.</p>
            </div>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowNewDiscussion(true)}>New Discussion</Button>
          </motion.div>

          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => {
              const count = cat === 'All' ? topics.length : topics.filter(t => t.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeCategory === cat
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                      : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No discussions found in this category.</p>
            ) : (
              filtered.map((topic, i) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <GlassCard hover className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link to={`/community/${topic.id}`} className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-500 transition-colors block mb-2">
                          {topic.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {topic.author}</span>
                          <Badge variant="primary" size="sm">{topic.category}</Badge>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {topic.lastActivity}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {topic.tags.map((tag) => (
                            <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                        <div className="flex items-center gap-1"><MessageSquare className="w-4 h-4" /> {topic.replies}</div>
                        <div className="flex items-center gap-1"><Eye className="w-4 h-4" /> {topic.views}</div>
                        <div className="flex items-center gap-1"><ThumbsUp className="w-4 h-4" /> {topic.likes}</div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      <Modal isOpen={showNewDiscussion} onClose={() => setShowNewDiscussion(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">New Discussion</h2>
            <button onClick={() => setShowNewDiscussion(false)} className="p-1 rounded-lg hover:bg-white/5" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <Input label="Title" placeholder="What's on your mind?" value={newDiscussion.title} onChange={e => setNewDiscussion({ ...newDiscussion, title: e.target.value })} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Category</label>
              <select value={newDiscussion.category} onChange={e => setNewDiscussion({ ...newDiscussion, category: e.target.value })} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5">
                {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Content</label>
              <textarea rows={5} placeholder="Write your discussion content..." value={newDiscussion.content} onChange={e => setNewDiscussion({ ...newDiscussion, content: e.target.value })} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5" />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowNewDiscussion(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleNewDiscussion} disabled={!newDiscussion.title}>Post Discussion</Button>
            </div>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

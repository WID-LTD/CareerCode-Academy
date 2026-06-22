import React from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy, BookOpen, MessageCircle, Mail, ArrowRight, Search, FileText, Video, Users, Wrench } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

const helpCategories = [
  { icon: BookOpen, title: 'Getting Started Guide', desc: 'New here? Learn the basics of navigating our platform.', href: '/faq' },
  { icon: FileText, title: 'Documentation', desc: 'Detailed guides for all platform features and tools.', href: '#' },
  { icon: Video, title: 'Video Tutorials', desc: 'Watch step-by-step walkthroughs of common tasks.', href: '#' },
  { icon: Users, title: 'Community Forums', desc: 'Get help from fellow learners and experienced mentors.', href: '/community' },
  { icon: Wrench, title: 'Technical Support', desc: 'Troubleshoot issues with our platform and tools.', href: '#' },
  { icon: MessageCircle, title: 'Live Chat', desc: 'Chat with our support team in real-time.', href: '#' },
];

const popularArticles = [
  { title: 'How to Reset Your Password', views: '12.5K' },
  { title: 'Navigating the Course Dashboard', views: '8.3K' },
  { title: 'How to Download Course Certificates', views: '6.7K' },
  { title: 'Setting Up Your Development Environment', views: '5.9K' },
  { title: 'Understanding Our Pricing Plans', views: '4.8K' },
  { title: 'How to Submit Assignments', views: '4.2K' },
];

export default function Help() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-12">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <LifeBuoy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Help <span className="gradient-text">Center</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Find answers, guides, and support resources all in one place.
            </p>
            <div className="max-w-lg mx-auto relative">
              <input
                type="text"
                placeholder="Search for help articles..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {helpCategories.map((cat, i) => (
              <motion.div
                key={cat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link to={cat.href}>
                  <GlassCard hover className="p-6 h-full">
                    <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4">
                      <cat.icon className="w-6 h-6 text-primary-500" />
                    </div>
                    <h3 className="font-semibold mb-2">{cat.title}</h3>
                    <p className="text-sm text-gray-500">{cat.desc}</p>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <GlassCard className="p-6">
                <h2 className="text-lg font-semibold mb-4">Popular Articles</h2>
                <div className="space-y-3">
                  {popularArticles.map((article) => (
                    <a
                      key={article.title}
                      href="#"
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{article.title}</span>
                      <span className="text-xs text-gray-400">{article.views} views</span>
                    </a>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <GlassCard className="p-6">
                <h2 className="text-lg font-semibold mb-4">Still Need Help?</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Our support team typically responds within 24 hours. We are here to help you succeed.
                </p>
                <div className="space-y-3">
                  <Link to="/contact">
                    <Button className="w-full" variant="outline" icon={<Mail className="w-4 h-4" />}>
                      Email Support
                    </Button>
                  </Link>
                  <Link to="/community">
                    <Button className="w-full" variant="outline" icon={<Users className="w-4 h-4" />}>
                      Ask the Community
                    </Button>
                  </Link>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <GlassCard className="p-8">
              <h2 className="text-xl font-semibold mb-2">Frequently Asked Questions</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Quick answers to the most common questions from our community.
              </p>
              <Link to="/faq">
                <Button icon={<ArrowRight className="w-4 h-4" />}>View FAQ</Button>
              </Link>
            </GlassCard>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}

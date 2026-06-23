import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, MessageCircle, Mail, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const helpTopics = [
  { title: 'Getting Started', description: 'Create your account, choose a course, and begin your learning journey.' },
  { title: 'Account & Billing', description: 'Manage your account settings, subscription, and payment methods.' },
  { title: 'Courses & Curriculum', description: 'Learn about our courses, tracks, and how to navigate the platform.' },
  { title: 'Assignments & Projects', description: 'Submit assignments, get feedback, and build your portfolio.' },
  { title: 'Certificates & Exams', description: 'Understand exam proctoring, certification requirements, and results.' },
  { title: 'Technical Support', description: 'Troubleshoot common issues with the platform, video playback, and code editor.' },
];

export default function Help() {
  const [search, setSearch] = useState('');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-14 h-14 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-primary-500" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Help <span className="gradient-text">Center</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
              Find answers to common questions and learn how to get the most out of CareerCode Academy.
            </p>
            <div className="max-w-lg mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search help articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12"
                aria-label="Search help articles"
              />
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {helpTopics.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())).map((topic, i) => (
              <motion.div
                key={topic.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard className="p-6 h-full hover-lift cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">{topic.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{topic.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 ml-4" />
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <GlassCard className="p-8 max-w-lg mx-auto">
              <MessageCircle className="w-8 h-8 text-primary-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Still Need Help?</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Our support team is available 24/7 to assist you.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="primary">Contact Support</Button>
                <Button variant="ghost">
                  <Mail className="w-4 h-4 mr-2" /> support@careercode.academy
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

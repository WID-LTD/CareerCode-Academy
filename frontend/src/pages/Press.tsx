import React from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Calendar, Download } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

const releases = [
  {
    date: 'March 15, 2026',
    title: 'CareerCode Academy Launches AI-Powered Learning Assistant',
    summary: 'New AI tutor helps students debug code, explain concepts, and get personalized learning recommendations in real-time.',
  },
  {
    date: 'January 10, 2026',
    title: 'CareerCode Expands to 5 African Countries',
    summary: 'With 10,000+ graduates, the academy opens physical hubs in Ghana, Kenya, Rwanda, South Africa, and Egypt.',
  },
  {
    date: 'October 22, 2025',
    title: 'WID LTD Invests $2M in CareerCode Academy',
    summary: 'Strategic investment to scale operations, develop new course tracks, and launch a scholarship program for underprivileged students.',
  },
  {
    date: 'August 5, 2025',
    title: 'CareerCode Partners with 50+ Tech Employers',
    summary: 'New hiring partnerships ensure 95% job placement rate for graduates within 6 months of program completion.',
  },
];

export default function Press() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-14 h-14 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <Newspaper className="w-7 h-7 text-primary-500" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Press <span className="gradient-text">Releases</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Latest news, announcements, and media coverage from CareerCode Academy.
            </p>
          </motion.div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {releases.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 sm:p-8">
                  <p className="flex items-center gap-2 text-sm text-primary-500 font-medium mb-2">
                    <Calendar className="w-4 h-4" /> {item.date}
                  </p>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{item.summary}</p>
                  <Button variant="ghost" size="sm">Read More</Button>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16"
          >
            <GlassCard className="p-8 max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-primary-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Media Kit</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Download our media kit including logos, brand guidelines, and press photos.
              </p>
              <Button variant="primary">Download Media Kit</Button>
            </GlassCard>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}

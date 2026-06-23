import React from 'react';
import { motion } from 'framer-motion';
import { Newspaper, ArrowRight, ExternalLink, Calendar, User, Tag } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Link } from 'react-router-dom';

const pressReleases = [
  {
    title: 'CareerCode Academy Raises $50M Series C to Expand AI-Powered Learning',
    date: 'March 15, 2026',
    author: 'Sarah Mitchell',
    category: 'Funding',
    excerpt: 'CareerCode Academy announced a $50M Series C funding round led by Accel Partners to expand its AI-driven personalized learning platform globally.',
  },
  {
    title: 'CareerCode Launches New Cybersecurity Bootcamp with Google',
    date: 'February 1, 2026',
    author: 'David Kim',
    category: 'Partnership',
    excerpt: 'The new Cybersecurity Analyst Bootcamp, developed in collaboration with Google, addresses the growing demand for security professionals.',
  },
  {
    title: 'CareerCode Reaches 95% Job Placement Rate, Sets Industry Standard',
    date: 'January 10, 2026',
    author: 'Dr. Alex Rivera',
    category: 'Milestone',
    excerpt: 'CareerCode Academy announced a record 95% job placement rate within six months of graduation, setting a new benchmark for coding bootcamps.',
  },
  {
    title: 'CareerCode Academy Named Top 10 EdTech Startup of 2025',
    date: 'December 5, 2025',
    author: 'Maya Patel',
    category: 'Awards',
    excerpt: 'CareerCode was recognized as one of the top 10 EdTech startups globally for its innovative approach to technical education.',
  },
  {
    title: 'CareerCode Partners with Microsoft to Offer Azure Certification Paths',
    date: 'October 20, 2025',
    author: 'Sarah Mitchell',
    category: 'Partnership',
    excerpt: 'Students can now earn Microsoft Azure certifications through CareerCode\'s expanded cloud computing curriculum.',
  },
  {
    title: 'New AI Mentor Feature Helps Students Learn to Code Faster',
    date: 'September 8, 2025',
    author: 'David Kim',
    category: 'Product',
    excerpt: 'CareerCode launched an AI-powered coding mentor that provides real-time feedback and personalized learning recommendations.',
  },
];

const mediaKit = [
  { label: 'Brand Guidelines', description: 'Logos, colors, and brand assets for media use.' },
  { label: 'Press Kit PDF', description: 'Company overview, facts, and executive bios.' },
  { label: 'Product Screenshots', description: 'High-resolution images of the platform.' },
  { label: 'Executive Photos', description: 'Headshots of the leadership team.' },
];

export default function Press() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Newspaper className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Press & <span className="gradient-text">News</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              Stay up to date with the latest news, announcements, and stories from CareerCode Academy.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {pressReleases.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard hover className="p-6 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="primary" size="sm">{item.category}</Badge>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {item.date}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3">{item.excerpt}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <User className="w-3 h-3" /> {item.author}
                    </span>
                    <button className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
                      Read More <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-center mb-4">Media <span className="gradient-text">Kit</span></h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-8">Resources for journalists and media professionals.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {mediaKit.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <GlassCard hover className="p-6 text-center h-full">
                    <h3 className="font-semibold mb-2">{item.label}</h3>
                    <p className="text-sm text-gray-500 mb-4">{item.description}</p>
                    <Button variant="outline" size="sm" icon={<ArrowRight className="w-3 h-3" />}>
                      Download
                    </Button>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="text-center">
            <GlassCard className="p-8">
              <h2 className="text-xl font-semibold mb-2">Media Inquiries</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                For press-related questions, interview requests, or more information.
              </p>
              <Link to="/contact">
                <Button>Contact Press Team</Button>
              </Link>
            </GlassCard>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { Handshake, Building2, GraduationCap, Globe } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

const partners = [
  { name: 'TechCorp Africa', industry: 'Technology', description: 'Leading software company providing internship opportunities for our graduates.' },
  { name: 'FinServe Nigeria', industry: 'Finance', description: 'Financial services firm that recruits our top-performing backend developers.' },
  { name: 'DataDriven Labs', industry: 'Data Science', description: 'Data analytics company collaborating on curriculum design and project mentorship.' },
  { name: 'CloudBase Systems', industry: 'Cloud Infrastructure', description: 'Cloud platform provider offering free credits and training for our students.' },
  { name: 'DevHub Community', industry: 'Developer Tools', description: 'Developer community platform hosting our hackathons and coding challenges.' },
  { name: 'GlobalTech Recruit', industry: 'HR & Recruitment', description: 'Talent placement agency connecting our graduates with global employers.' },
];

export default function Partners() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-14 h-14 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <Handshake className="w-7 h-7 text-primary-500" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Our <span className="gradient-text">Partners</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              We work with industry-leading companies to ensure our curriculum stays relevant and our graduates get hired.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {partners.map((partner, i) => (
              <motion.div
                key={partner.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard className="p-6 h-full hover-lift">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4">
                    <Building2 className="w-6 h-6 text-primary-500" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">{partner.name}</h3>
                  <p className="text-xs text-primary-500 font-medium uppercase tracking-wider mb-3">{partner.industry}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{partner.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-16"
          >
            <GlassCard className="p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Become a Partner</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Interested in partnering with CareerCode Academy? Let&apos;s discuss how we can work together to build Africa&apos;s tech talent pipeline.
              </p>
              <Button variant="primary">Contact Our Partnerships Team</Button>
            </GlassCard>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}

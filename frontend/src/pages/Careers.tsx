import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, Clock, DollarSign, Heart, ArrowRight, Globe, Users, Zap, Star } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

const perks = [
  { icon: Globe, title: 'Remote-First', desc: 'Work from anywhere in the world. Our team spans 15+ countries.' },
  { icon: Users, title: 'Amazing Team', desc: 'Collaborate with talented, passionate people from diverse backgrounds.' },
  { icon: Zap, title: 'Growth Opportunities', desc: 'Annual learning budget, mentorship programs, and career development.' },
  { icon: Star, title: 'Great Benefits', desc: 'Competitive salary, equity, health insurance, and unlimited PTO.' },
];

const openPositions = [
  {
    title: 'Senior Full-Stack Developer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-Time',
    salary: '$120K - $180K',
  },
  {
    title: 'Curriculum Designer',
    department: 'Education',
    location: 'San Francisco, CA',
    type: 'Full-Time',
    salary: '$90K - $140K',
  },
  {
    title: 'Community Manager',
    department: 'Community',
    location: 'Remote',
    type: 'Full-Time',
    salary: '$70K - $100K',
  },
  {
    title: 'Data Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-Time',
    salary: '$110K - $170K',
  },
  {
    title: 'UX Designer',
    department: 'Design',
    location: 'New York, NY',
    type: 'Full-Time',
    salary: '$85K - $130K',
  },
  {
    title: 'Technical Writer',
    department: 'Education',
    location: 'Remote',
    type: 'Contract',
    salary: '$60K - $90K',
  },
];

const values = [
  'Put students first in every decision we make',
  'Embrace diversity and foster inclusion',
  'Learn continuously and share knowledge',
  'Move fast and iterate with purpose',
  'Be transparent and communicate openly',
];

export default function Careers() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Join the Team at <span className="gradient-text">CareerCode</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              Help us transform tech education and empower the next generation of developers.
              We are building a diverse, passionate team committed to making a real impact.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {perks.map((perk, i) => (
              <motion.div
                key={perk.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 text-center h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                    <perk.icon className="w-6 h-6 text-primary-500" />
                  </div>
                  <h3 className="font-semibold mb-2">{perk.title}</h3>
                  <p className="text-sm text-gray-500">{perk.desc}</p>
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
            <h2 className="text-3xl font-bold text-center mb-4">Our <span className="gradient-text">Values</span></h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-8">What drives us every day.</p>
            <div className="max-w-2xl mx-auto space-y-3">
              {values.map((value, i) => (
                <motion.div
                  key={value}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800"
                >
                  <Heart className="w-5 h-5 text-primary-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-center mb-4">Open <span className="gradient-text">Positions</span></h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-8">Join us in shaping the future of education.</p>
            <div className="max-w-4xl mx-auto space-y-3">
              {openPositions.map((job, i) => (
                <motion.div
                  key={job.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard hover className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                        <p className="text-sm text-primary-500 mb-2">{job.department}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {job.type}</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {job.salary}</span>
                        </div>
                      </div>
                      <Button size="sm">Apply Now</Button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="mt-12 text-center">
            <GlassCard className="p-8">
              <h2 className="text-xl font-semibold mb-2">Do Not See Your Role?</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We are always looking for talented people. Send us your resume.
              </p>
              <Link to="/contact">
                <Button icon={<ArrowRight className="w-4 h-4" />}>Get in Touch</Button>
              </Link>
            </GlassCard>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

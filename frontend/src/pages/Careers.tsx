import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, Clock, DollarSign } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

const openPositions = [
  {
    title: 'Senior Full-Stack Developer',
    department: 'Engineering',
    location: 'Remote (Nigeria)',
    type: 'Full-Time',
    salary: '₦8M - ₦12M / year',
    description: 'Build and maintain our learning platform, mentor junior developers, and drive technical architecture decisions.',
  },
  {
    title: 'Curriculum Designer (Python)',
    department: 'Education',
    location: 'Lagos, Nigeria',
    type: 'Full-Time',
    salary: '₦5M - ₦8M / year',
    description: 'Design and update our Python curriculum, create engaging projects, and ensure industry alignment.',
  },
  {
    title: 'Student Success Manager',
    department: 'Operations',
    location: 'Remote',
    type: 'Full-Time',
    salary: '₦3M - ₦5M / year',
    description: 'Guide students through their learning journey, provide support, and track progress metrics.',
  },
  {
    title: 'Marketing Lead',
    department: 'Growth',
    location: 'Lagos, Nigeria',
    type: 'Full-Time',
    salary: '₦4M - ₦7M / year',
    description: 'Lead our marketing strategy, manage brand presence, and drive student enrollment growth.',
  },
];

export default function Careers() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="w-14 h-14 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-7 h-7 text-primary-500" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Join the <span className="gradient-text">CareerCode</span> Team
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Help us build Africa&apos;s best tech education platform. We&apos;re looking for passionate people who believe in the power of learning.
            </p>
          </motion.div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {openPositions.map((job, i) => (
              <motion.div
                key={job.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{job.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{job.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" /> {job.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" /> {job.type}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4" /> {job.salary}
                        </span>
                      </div>
                    </div>
                    <Button variant="primary" className="shrink-0">Apply Now</Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

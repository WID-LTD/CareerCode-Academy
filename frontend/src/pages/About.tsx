import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Heart, Users, Award, Globe, Code2, BookOpen, Lightbulb, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

const team = [
  {
    name: 'Dr. Alex Rivera',
    role: 'CEO & Co-Founder',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    bio: 'Former Engineering Director at Google with 15+ years in tech education.',
  },
  {
    name: 'Maya Patel',
    role: 'CTO & Co-Founder',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    bio: 'Full-stack developer turned educator. Previously led curriculum at Codecademy.',
  },
  {
    name: 'David Kim',
    role: 'Head of Curriculum',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    bio: 'PhD in Computer Science, designed programs for MIT and Stanford Online.',
  },
  {
    name: 'Sarah Mitchell',
    role: 'VP of Student Success',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
    bio: 'Passionate about making tech education accessible. Former COO at Lambda School.',
  },
];

const values = [
  { icon: Lightbulb, title: 'Innovation', desc: 'We constantly update our curriculum to reflect the latest industry trends and technologies.' },
  { icon: Users, title: 'Community', desc: 'Learning is better together. We foster a supportive, collaborative environment for all students.' },
  { icon: Award, title: 'Excellence', desc: 'We hold ourselves to the highest standards in education, mentorship, and student outcomes.' },
  { icon: Globe, title: 'Accessibility', desc: 'Technology education should be available to everyone, regardless of background or location.' },
];

const milestones = [
  { year: '2020', event: 'CareerCode Academy founded with a mission to transform tech education' },
  { year: '2021', event: 'Launched first 5 courses, enrolled 500+ students in the first quarter' },
  { year: '2022', event: 'Expanded to 50+ courses, partnered with 200+ hiring companies' },
  { year: '2023', event: 'Reached 10,000 graduates with 92% job placement rate' },
  { year: '2024', event: 'Launched AI-powered learning platform, expanded to 15 countries' },
  { year: '2025', event: 'Named Top 10 EdTech Startup, 95% job placement, 500+ partners' },
];

export default function About() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Code2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Our Mission is to Make Tech Careers <span className="gradient-text">Accessible to All</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              We believe that anyone with the drive to learn can become a successful software developer.
              Our platform combines structured curriculum, hands-on projects, and expert mentorship to
              bridge the gap between learning and landing your dream job.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <GlassCard className="p-8">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Our Vision</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                To create a world where quality tech education is accessible to everyone, regardless of
                their background, location, or financial situation. We envision a future where CareerCode
                Academy graduates are shaping the technology of tomorrow.
              </p>
            </GlassCard>
            <GlassCard className="p-8">
              <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-accent-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Our Approach</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We combine structured online learning with real-world projects, personalized mentorship,
                and career support. Our curriculum is designed in collaboration with industry experts to
                ensure you learn the skills that employers actually need.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Our <span className="gradient-text">Values</span></h2>
            <p className="text-gray-600 dark:text-gray-400">The principles that guide everything we do.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 text-center h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                    <v.icon className="w-6 h-6 text-primary-500" />
                  </div>
                  <h3 className="font-semibold mb-2">{v.title}</h3>
                  <p className="text-sm text-gray-500">{v.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Our <span className="gradient-text">Journey</span></h2>
            <p className="text-gray-600 dark:text-gray-400">Key milestones that shaped CareerCode Academy.</p>
          </motion.div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary-500/50 via-primary-500/20 to-transparent hidden md:block" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <motion.div
                  key={m.year}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-6"
                >
                  <div className="hidden md:flex w-16 h-16 rounded-2xl gradient-bg flex-shrink-0 items-center justify-center text-white font-bold text-sm">
                    {m.year}
                  </div>
                  <GlassCard className="flex-1 p-6">
                    <div className="md:hidden text-sm font-bold gradient-text mb-2">{m.year}</div>
                    <p className="text-gray-700 dark:text-gray-300">{m.event}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Meet the <span className="gradient-text">Team</span></h2>
            <p className="text-gray-600 dark:text-gray-400">Passionate people building the future of tech education.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 text-center h-full">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4"
                  />
                  <h3 className="font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                  <p className="text-sm text-primary-500 mb-3">{member.role}</p>
                  <p className="text-sm text-gray-500">{member.bio}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <GlassCard className="p-12 text-center">
            <Heart className="w-12 h-12 text-primary-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
              Join thousands of successful graduates who have transformed their careers through our programs.
            </p>
            <Link to="/signup">
              <Button size="lg">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </GlassCard>
        </div>
      </section>
    </motion.div>
  );
}

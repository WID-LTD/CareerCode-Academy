import React from 'react';
import { motion } from 'framer-motion';
import { Handshake, ArrowRight, Star, Users, TrendingUp, Building2, Award, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

const benefits = [
  { icon: Users, title: 'Access Top Talent', desc: 'Connect with our pool of job-ready graduates who have mastered the latest technologies.' },
  { icon: TrendingUp, title: 'Custom Training', desc: 'We design tailored bootcamps to upskill your existing engineering teams.' },
  { icon: Building2, title: 'Brand Visibility', desc: 'Showcase your company as a tech industry leader among 10K+ active learners.' },
  { icon: Award, title: 'Certification Programs', desc: 'Co-create certified programs that align with your technology stack.' },
];

const partners = [
  { name: 'Google', tier: 'Platinum', description: 'Cloud certification pathways and curriculum partnership.' },
  { name: 'Microsoft', tier: 'Platinum', description: 'Azure cloud training and .NET curriculum development.' },
  { name: 'Amazon', tier: 'Gold', description: 'AWS certification prep and cloud architecture courses.' },
  { name: 'Meta', tier: 'Gold', description: 'React ecosystem curriculum and engineering mentorship.' },
  { name: 'Stripe', tier: 'Silver', description: 'Payment integration courses and fintech curriculum.' },
  { name: 'Netflix', tier: 'Silver', description: 'System design and streaming technology workshops.' },
];

export default function Partners() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Handshake className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Partner with <span className="gradient-text">CareerCode</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              Join 500+ leading companies that partner with us to find top talent, 
              upskill teams, and shape the future of tech education.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 text-center h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-6 h-6 text-primary-500" />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-gray-500">{benefit.desc}</p>
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
            <h2 className="text-3xl font-bold text-center mb-4">Our <span className="gradient-text">Partners</span></h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-8">Leading companies that trust CareerCode Academy.</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map((partner, i) => (
                <motion.div
                  key={partner.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <GlassCard className="p-6 h-full">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold">{partner.name}</h3>
                      <span className={cn(
                        'px-2 py-1 rounded-lg text-xs font-medium',
                        partner.tier === 'Platinum' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                        partner.tier === 'Gold' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
                        partner.tier === 'Silver' && 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      )}>
                        {partner.tier}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{partner.description}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid md:grid-cols-2 gap-6 mb-16">
              <GlassCard className="p-8">
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Hire Our Graduates</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Our graduates are job-ready, having completed 500+ hours of hands-on projects.
                  They know modern stacks, follow best practices, and are eager to contribute.
                </p>
                <Button variant="outline" icon={<ArrowRight className="w-4 h-4" />}>Start Hiring</Button>
              </GlassCard>
              <GlassCard className="p-8">
                <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-accent-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Corporate Training</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Upgrade your teams skills with custom bootcamps designed around your 
                  technology stack. Delivered live by industry experts.
                </p>
                <Button variant="outline" icon={<ArrowRight className="w-4 h-4" />}>Explore Training</Button>
              </GlassCard>
            </div>
          </motion.div>

          <div className="text-center">
            <GlassCard className="p-8">
              <Star className="w-10 h-10 text-primary-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Become a Partner</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
                Let us create a partnership that drives impact. Whether hiring, training, or co-creating curriculum, we would love to collaborate.
              </p>
              <Link to="/contact">
                <Button>Partner With Us</Button>
              </Link>
            </GlassCard>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

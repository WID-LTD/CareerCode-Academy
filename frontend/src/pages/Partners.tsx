import React from 'react';
import { motion } from 'framer-motion';
import { Handshake, ArrowRight, Users, TrendingUp, Building2, Award, Mail } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

const benefits = [
  { icon: Users, title: 'Meet learners', desc: 'Connect with learners who have completed practical, project-based work in their track.' },
  { icon: TrendingUp, title: 'Team training', desc: 'Discuss a tailored training plan for your team, built around the skills you actually need.' },
  { icon: Building2, title: 'Curriculum input', desc: 'Help shape a course or path so it reflects the tools and practices your team uses.' },
  { icon: Award, title: 'Verified learning', desc: 'Explore co-branded programmes with assessments and verifiable certificates.' },
];

export default function Partners() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Handshake className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Partner with <span className="gradient-text">CareerCode</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              CareerCode Academy is a venture of WID LTD (RC 8824091). We work with employers, training teams and
              educators on practical learning and hiring outcomes.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
            {benefits.map((benefit, i) => (
              <motion.div key={benefit.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
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

          <GlassCard className="p-8 text-center max-w-2xl mx-auto" hover={false}>
            <h2 className="text-2xl font-bold mb-2">Start a conversation</h2>
            <p className="text-sm text-gray-500 mb-6">
              We do not publish a partner logo wall unless the partner has agreed to it. Tell us what you want to build
              and we will be straight about whether we are the right fit.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="mailto:partners@careercode.com.ng">
                <Button><Mail className="w-4 h-4 mr-2" /> partners@careercode.com.ng</Button>
              </a>
              <Link to="/contact">
                <Button variant="outline">Contact us <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>
    </motion.div>
  );
}

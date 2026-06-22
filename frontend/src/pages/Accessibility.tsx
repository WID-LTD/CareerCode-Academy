import React from 'react';
import { motion } from 'framer-motion';
import { AccessibilityIcon, Eye, Keyboard, FileText, Monitor, Headphones } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const commitments = [
  { icon: Eye, title: 'Visual Design', desc: 'High contrast color schemes, scalable text, and support for screen readers throughout the platform.' },
  { icon: Keyboard, title: 'Keyboard Navigation', desc: 'All features are accessible via keyboard. Clear focus indicators and logical tab order for seamless navigation.' },
  { icon: Monitor, title: 'Screen Reader Support', desc: 'ARIA labels, semantic HTML, and proper heading structures ensure compatibility with popular screen readers.' },
  { icon: Headphones, title: 'Captions & Transcripts', desc: 'All video content includes closed captions. Written transcripts are available for every lesson.' },
];

const standards = [
  'We aim to conform to WCAG 2.2 Level AA standards',
  'Regular accessibility audits are conducted by internal and external teams',
  'Our development team follows inclusive design principles',
  'We test with multiple assistive technologies including JAWS, NVDA, and VoiceOver',
  'Accessibility is considered at every stage of our product development lifecycle',
];

export default function Accessibility() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-12">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <AccessibilityIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="gradient-text">Accessibility</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              CareerCode Academy is committed to making our platform accessible to everyone, 
              regardless of ability. We continuously work to improve the user experience for all learners.
            </p>
          </motion.div>

          <GlassCard className="p-8 mb-12">
            <h2 className="text-xl font-semibold mb-4">Our Commitment</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              We believe that quality tech education should be accessible to everyone. Our accessibility 
              efforts are guided by the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA standards. 
              We are dedicated to ensuring that our platform is usable by people with diverse abilities, 
              including those who rely on assistive technologies.
            </p>
          </GlassCard>

          <div className="grid sm:grid-cols-2 gap-6 mb-12">
            {commitments.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary-500" />
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-center mb-6">Our <span className="gradient-text">Standards</span></h2>
            <div className="space-y-3 max-w-2xl mx-auto">
              {standards.map((standard, i) => (
                <motion.div
                  key={standard}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800"
                >
                  <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{standard}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <GlassCard className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Report an Accessibility Issue</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
                If you encounter any accessibility barriers on our platform, please let us know. 
                We take all reports seriously and will work to address them promptly.
              </p>
              <p className="text-sm text-gray-500">
                Email us at{' '}
                <a href="mailto:accessibility@careercode.academy" className="text-primary-500 hover:text-primary-600 font-medium">
                  accessibility@careercode.academy
                </a>
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}

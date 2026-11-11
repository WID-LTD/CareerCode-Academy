import React from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Mail, Building2, MapPin, FileText } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

const facts = [
  { icon: Building2, label: 'Company', value: 'WID LTD (RC 8824091)' },
  { icon: Newspaper, label: 'Product', value: 'CareerCode Academy' },
  { icon: MapPin, label: 'Location', value: 'Agbara, Ogun State, Nigeria' },
  { icon: FileText, label: 'Focus', value: 'Project-based tech education, learning paths and verifiable certificates' },
  { icon: Building2, label: 'Registered', value: 'September 2025 · Federal Republic of Nigeria (CAC)' },
  { icon: FileText, label: 'Chief Executive', value: 'Ike Wisdom Okemsinachi' },
];

export default function Press() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-14">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Newspaper className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Press & <span className="gradient-text">Media</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              For interviews, company information or media enquiries, contact the CareerCode Academy team.
              We publish announcements only when they are confirmed.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto mb-12">
            {facts.map((f) => (
              <GlassCard key={f.label} className="p-5 flex items-start gap-3" hover={false}>
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 grid place-items-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">{f.label}</p>
                  <p className="text-sm mt-1">{f.value}</p>
                </div>
              </GlassCard>
            ))}
          </div>

          <GlassCard className="p-8 text-center max-w-2xl mx-auto" hover={false}>
            <Mail className="w-10 h-10 text-primary-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Media enquiries</h2>
            <p className="text-sm text-gray-500 mb-6">
              Email us with your outlet, deadline and the topic you want to cover. We will respond if we can help.
            </p>
            <a href="mailto:contact@widltd.com.ng">
              <Button><Mail className="w-4 h-4 mr-2" /> contact@widltd.com.ng</Button>
            </a>
          </GlassCard>
        </div>
      </section>
    </motion.div>
  );
}

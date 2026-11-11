import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, MapPin, Heart, ArrowRight, Globe, Users, Zap, Star, Mail } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

const values = [
  { icon: Users, title: 'Learners first', desc: 'Every product and curriculum decision starts with what helps a learner make real progress.' },
  { icon: Zap, title: 'Practical work', desc: 'We favour projects, feedback and evidence of skill over passive content.' },
  { icon: Globe, title: 'Access', desc: 'We build for learners who are starting from wherever they are, not only those with a head start.' },
  { icon: Star, title: 'Integrity', desc: 'We do not invent outcomes, credentials or partnerships. We say what we can prove.' },
];

export default function Careers() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Work with <span className="gradient-text">WID LTD</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              CareerCode Academy is the education venture of WID LTD (RC 8824091), based in Agbara, Ogun State, Nigeria.
              We hire when a role genuinely needs filling — not to keep a permanent list of invented openings.
            </p>
            <p className="text-sm text-gray-500 mt-4 inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Agbara, Ogun State, Nigeria</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
            {values.map((v, i) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <GlassCard className="p-6 h-full">
                  <div className="w-11 h-11 rounded-xl bg-primary-500/10 grid place-items-center mb-4">
                    <v.icon className="w-5 h-5 text-primary-500" />
                  </div>
                  <h3 className="font-semibold mb-1.5">{v.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <GlassCard className="p-8 text-center max-w-2xl mx-auto" hover={false}>
            <Heart className="w-10 h-10 text-primary-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No public openings right now</h2>
            <p className="text-gray-500 text-sm mb-6">
              We are not advertising specific roles at the moment. If you want to be considered when something opens,
              send a short introduction, your portfolio and the kind of work you want to do.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="mailto:contact@widltd.com.ng">
                <Button><Mail className="w-4 h-4 mr-2" /> contact@widltd.com.ng</Button>
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

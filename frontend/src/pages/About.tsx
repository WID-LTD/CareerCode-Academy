import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, Heart, Users, Award, Globe, Code2, BookOpen, Lightbulb, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import SEO from '@/components/seo/SEO';
import { usePublicStats } from '@/hooks/usePublicStats';

const team = [
  {
    name: 'Dev Chris',
    role: 'CEO & Co-Founder',
    image: '/ceo-dev-chris.png',
    bio: 'Leads product, partnerships and the overall direction of CareerCode Academy at WID LTD.',
  },
  {
    name: 'Ike Wisdom',
    role: 'CTO & Co-Founder',
    image: '/wisdom.jpg',
    bio: 'Leads engineering, the learning platform and the systems that run CareerCode Academy.',
  },
  {
    name: 'Success Chukwu',
    role: 'Head of Curriculum',
    image: '/success.jpg',
    bio: 'Leads course design, learning paths and the quality of the learner experience.',
  },
];

const values = [
  { icon: Lightbulb, title: 'Practical first', desc: 'We teach by building. Every course is designed around work a learner can actually produce.' },
  { icon: Users, title: 'Community', desc: 'Learning is better with people around you. We invest in mentorship, discussion and peer support.' },
  { icon: Award, title: 'Excellence', desc: 'We keep curriculum current and hold course quality, assessment and certification to a high standard.' },
  { icon: Globe, title: 'Accessibility', desc: 'Tech education should be reachable regardless of background, location or starting point.' },
];

const pillars = [
  { icon: BookOpen, title: 'Structured learning paths', desc: 'Beginner to advanced routes that connect courses in the right order, with clear outcomes.' },
  { icon: Code2, title: 'Real projects', desc: 'Portfolio projects, code challenges and guided builds that turn theory into evidence of skill.' },
  { icon: ShieldCheck, title: 'Verifiable proof', desc: 'Course completion, certificates and public portfolios that employers can check.' },
];

export default function About() {
  const stats = usePublicStats();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="About" description="CareerCode Academy is the education venture of WID LTD, helping beginners become job-ready software developers through practical, project-based learning." />
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-16">
            <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
              <Code2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Our Mission is to Make Tech Careers <span className="gradient-text">Accessible to All</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              CareerCode Academy is the education venture of <strong>WID LTD (RC 8824091)</strong>, based in Agbara, Ogun State, Nigeria.
              We combine structured curriculum, hands-on projects and human support to help beginners become job-ready developers.
            </p>
            <p className="text-sm text-gray-500 mt-4 inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Agbara, Ogun State, Nigeria</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <GlassCard className="p-8">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Our Vision</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                A world where quality tech education is reachable regardless of background, location or finances.
                We want CareerCode graduates to be shaping the technology of tomorrow — starting from where they are today.
              </p>
            </GlassCard>
            <GlassCard className="p-8">
              <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-accent-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Our Approach</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Structured online learning, real-world projects, mentorship and career support.
                Our curriculum is built around the skills employers ask for, and every path connects courses in a sensible order.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Learners', value: stats.students },
              { label: 'Published courses', value: stats.courses },
              { label: 'Certificates issued', value: stats.certificates },
              { label: 'Alumni', value: stats.alumni },
            ].filter((s) => s.value > 0).map((s) => (
              <GlassCard key={s.label} className="p-5 text-center" hover={false}>
                <p className="text-3xl font-bold gradient-text font-display tabular-nums">{s.value.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our <span className="gradient-text">Values</span></h2>
            <p className="text-gray-600 dark:text-gray-400">The principles that guide everything we do.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
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
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What we're <span className="gradient-text">building</span></h2>
            <p className="text-gray-600 dark:text-gray-400">Three things every CareerCode learner should be able to point to.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {pillars.map((p, i) => (
              <motion.div key={p.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <GlassCard className="p-6 h-full">
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4">
                    <p.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Meet the <span className="gradient-text">Team</span></h2>
            <p className="text-gray-600 dark:text-gray-400">The people building CareerCode Academy.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {team.map((member, i) => (
              <motion.div key={member.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <GlassCard className="p-6 text-center h-full">
                  <img src={member.image} alt={member.name} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4" />
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
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <GlassCard className="p-6 sm:p-8 md:p-12 text-center">
            <Heart className="w-12 h-12 text-primary-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
              Start with a course or a learning path, build real projects, and track your progress as you go.
            </p>
            <Link to="/signup">
              <Button size="lg">Get Started Free <ArrowRight className="w-5 h-5" /></Button>
            </Link>
          </GlassCard>
        </div>
      </section>
    </motion.div>
  );
}

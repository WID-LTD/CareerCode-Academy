import { motion } from 'framer-motion';
import { Award, Briefcase, FolderGit2, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Link } from 'react-router-dom';

const pillars = [
  {
    icon: FolderGit2,
    title: 'Project-based learning',
    desc: 'Every path ends with real work you can show: apps, dashboards, analyses and case studies — not just certificates.',
    badge: 'Portfolio-ready',
  },
  {
    icon: Users,
    title: 'Human support',
    desc: 'Instructors, mentors and a learner community help you when you get stuck, instead of leaving you with videos alone.',
    badge: 'Mentorship',
  },
  {
    icon: Award,
    title: 'Verifiable certificates',
    desc: 'Certificates can be checked on a public verification page, so employers can confirm what you completed.',
    badge: 'Verifiable',
  },
  {
    icon: Briefcase,
    title: 'Career preparation',
    desc: 'CV and portfolio guidance, interview practice and job listings help you move from learning to applying.',
    badge: 'Career support',
  },
];

export function TrustSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <Badge variant="primary" size="sm" className="mb-3"><ShieldCheck className="w-3 h-3" /> Why learners choose CareerCode</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built for <span className="gradient-text">real outcomes</span></h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">No invented placement stats or borrowed logos — just the things we actually build into every programme.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p, i) => (
            <motion.div key={p.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <GlassCard className="p-5 h-full" hover>
                <div className="w-11 h-11 rounded-xl bg-primary-500/10 grid place-items-center mb-4">
                  <p.icon className="w-5 h-5 text-primary-500" />
                </div>
                <Badge variant="default" size="sm" className="mb-2">{p.badge}</Badge>
                <h3 className="font-semibold mb-1.5">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/courses" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline">
            Browse courses and learning paths <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

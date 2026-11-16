import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, BookOpen, MessageSquare, Briefcase, Sparkles } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { usePageContent } from '@/hooks/usePageContent';

const valueProps = [
  { icon: BookOpen, title: 'Project-Based Learning', desc: 'Build real-world projects that prove what you can do' },
  { icon: MessageSquare, title: '1-on-1 Mentorship', desc: 'Get guidance from industry experts at every step' },
  { icon: Briefcase, title: 'Career Support', desc: 'In-platform job applications, role matching, and a public portfolio to get discovered' },
];

const defaultCta = { heading: 'Build Hire-Ready Skills', body: 'Join thousands of learners turning hands-on practice into a portfolio employers can verify — then apply to roles directly through our in-platform career pipeline.' };

export function CTASection() {
  const page = usePageContent('home', { cta: defaultCta });
  const cta = { ...defaultCta, ...((page as any)?.cta || {}) };
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 gradient-bg opacity-5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(99,102,241,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(34,197,94,0.08),transparent_50%)]" />

      <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              {cta.heading}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-4">
              {cta.body}
            </p>

            <div className="flex items-center justify-center gap-2 mb-10 text-sm text-gray-500">
              <CheckCircle2 className="w-4 h-4 text-success-500" />
              <span>Portfolio you can show</span>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <CheckCircle2 className="w-4 h-4 text-success-500" />
              <span>Verified certificates</span>
              <span className="text-gray-300 dark:text-gray-700">·</span>
              <CheckCircle2 className="w-4 h-4 text-success-500" />
              <span>Money-back guarantee</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
              {valueProps.map((prop) => (
                <div key={prop.title} className="p-4 rounded-xl bg-white/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
                  <prop.icon className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{prop.title}</h3>
                  <p className="text-xs text-gray-500">{prop.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <NeonButton color="blue" size="lg" className="px-10 py-4 text-lg">
                  Start Building Skills
                  <ArrowRight className="w-5 h-5" />
                </NeonButton>
              </Link>
              <Link to="/contact">
                <NeonButton color="purple" size="lg" className="px-10 py-4 text-lg">
                  Talk to an Advisor
                </NeonButton>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

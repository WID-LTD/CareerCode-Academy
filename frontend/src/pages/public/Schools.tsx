import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Code2, Database, Palette, Briefcase, GraduationCap, ArrowRight, BookOpen, Clock, TrendingUp, Award, Sparkles } from 'lucide-react';
import SEO from '@/components/seo/SEO';

const iconMap: Record<string, any> = {
  Code2, Database, Palette, Briefcase, GraduationCap, BookOpen,
};

const schoolCareers: Record<string, { careers: string[] }> = {
  'School of Software Development': { careers: ['Frontend Developer', 'Backend Developer', 'Full-Stack Engineer'] },
  'School of Data & Artificial Intelligence': { careers: ['Data Scientist', 'ML Engineer', 'Data Analyst'] },
  'School of Design & Creative Technology': { careers: ['UI/UX Designer', 'Product Designer', 'Visual Designer'] },
  'School of Business & Digital Careers': { careers: ['Product Manager', 'Business Analyst', 'Tech Consultant'] },
  'School of Career Readiness': { careers: ['Career Coach', 'Talent Specialist', 'HR Coordinator'] },
};

const defaultCareers = { careers: ['Software Developer'] };

export default function Schools() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/schools');
        setSchools(data.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load schools');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="Schools" description="Explore CareerCode Academy's schools — Software Development, Data & AI, Design, Business, and Career Readiness." />
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Our <span className="gradient-text">Schools</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Choose your path from our career-focused schools. Each school offers industry-aligned programs designed to make you job-ready.
            </p>
          </motion.div>

          {error && (
            <Alert variant="error" className="mb-6" action={<Button size="sm" variant="outline" onClick={() => window.location.reload()}>Retry</Button>}>
              {error}
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-20"><Loader size="lg" text="Loading schools..." /></div>
          ) : schools.length === 0 ? (
            <EmptyState icon={<BookOpen className="w-8 h-8" />} title="No schools available yet" description="Schools are being set up. Check back soon." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {schools.map((school, i) => {
                const Icon = iconMap[school.icon] || BookOpen;
                const careers = schoolCareers[school.name] || defaultCareers;
                const gradientFrom = school.color?.split(' ')[0]?.replace('from-', '') || 'primary-500';
                return (
                  <motion.div key={school.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <Link to={`/schools/${school.slug}`}>
                      <GlassCard hover className="h-full p-0 group flex flex-col overflow-hidden relative">
                        <div className={`absolute inset-0 bg-gradient-to-br from-${gradientFrom}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                        <div className="p-6 relative z-10 flex flex-col h-full">
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${school.color || 'from-primary-500 to-accent-500'} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                              <Icon className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h2 className="text-lg font-bold text-white group-hover:text-primary-500 transition-colors">{school.name}</h2>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="default" size="sm">{school.program_count || 0} programs</Badge>
                                <Badge variant="primary" size="sm">Self-paced</Badge>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-400 leading-relaxed flex-1 mb-4">{school.description}</p>

                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Self-paced learning path</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {careers.careers.map((career) => (
                              <span key={career} className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
                                {career}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-1 text-sm text-primary-500 font-medium group-hover:gap-2 transition-all mt-auto">
                            Explore Programs <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}

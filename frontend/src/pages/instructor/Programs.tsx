import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Users, RefreshCw, School, Plus } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useInstructorStore } from '@/store/instructorStore';
import { useProgramStore } from '@/store/programStore';
import { ProgramWizard, SchoolOption } from '@/components/programs/ProgramWizard';
import { api } from '@/lib/axios';
import SEO from '@/components/seo/SEO';

const programGradients = [
  'from-blue-600 to-cyan-500',
  'from-purple-600 to-pink-500',
  'from-emerald-600 to-teal-500',
  'from-orange-600 to-rose-500',
  'from-indigo-600 to-violet-500',
  'from-green-600 to-lime-500',
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Programs() {
  const { programs, isLoading, error, fetchPrograms } = useInstructorStore();
  const { programs: authored, fetchPrograms: fetchAuthored } = useProgramStore();
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [schools, setSchools] = React.useState<SchoolOption[]>([]);

  React.useEffect(() => {
    fetchPrograms();
    fetchAuthored();
  }, [fetchPrograms, fetchAuthored]);

  React.useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/schools');
        setSchools((data.data || []).map((s: any) => ({ id: s.id, name: s.name, slug: s.slug })));
      } catch {
        setSchools([]);
      }
    })();
  }, []);

  // Limit the school select to schools the instructor is already part of.
  // Falls back to the full list when the instructor has no programs yet.
  const instructorSchools = React.useMemo(() => {
    if (programs.length === 0) return schools;
    const names = new Set(programs.map((p) => p.school).filter(Boolean));
    const limited = schools.filter((s) => names.has(s.name));
    return limited.length > 0 ? limited : schools;
  }, [programs, schools]);

  const statusBySlug = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of authored) {
      if (p.slug) map.set(p.slug, p.status);
    }
    return map;
  }, [authored]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SEO title="My Programs" />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Programs</h1>
          <p className="text-gray-500">View and manage the programs you are part of.</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Propose Program
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200/60 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 p-5 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Failed to Load Programs</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchPrograms()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </GlassCard>
      )}

      {/* Empty State */}
      {!isLoading && !error && programs.length === 0 && (
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Programs Yet</h3>
          <p className="text-sm text-gray-500">You are not currently part of any programs.</p>
        </GlassCard>
      )}

      {/* Program Grid */}
      {!isLoading && !error && programs.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {programs.map((program, i) => (
            <motion.div key={program.id} variants={item}>
              <Link to={`/instructor/programs/${program.slug}`}>
                <GlassCard hover className="p-5 h-full flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${programGradients[i % programGradients.length]} flex items-center justify-center flex-shrink-0`}
                    >
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {program.title}
                      </h3>
                      <div className="flex items-center gap-1 mt-1">
                        <School className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500 truncate">{program.school}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {program.courseCount} {program.courseCount === 1 ? 'course' : 'courses'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {program.studentCount} {program.studentCount === 1 ? 'student' : 'students'}
                    </span>
                    <Badge variant="primary" size="sm" className="ml-auto">
                      View Details
                    </Badge>
                    {statusBySlug.get(program.slug) === 'pending_review' && (
                      <Badge variant="warning" size="sm">
                        Pending review
                      </Badge>
                    )}
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="Propose Program"
        size="xl"
        className="!max-w-3xl"
      >
        <ProgramWizard
          schools={instructorSchools}
          onClose={() => setWizardOpen(false)}
          onSaved={() => {
            fetchPrograms();
            fetchAuthored();
          }}
        />
      </Modal>
    </motion.div>
  );
}

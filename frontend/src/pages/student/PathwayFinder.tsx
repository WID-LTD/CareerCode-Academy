import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass, Search, Target, CheckCircle2, PlayCircle, ArrowRight, Clock,
  Users, GraduationCap, BookOpen, Rocket, BarChart3, Server, Layers, Smartphone,
  Boxes, ShieldCheck, FlaskConical, BrainCircuit, Brain, Palette, PenTool,
  LayoutDashboard, Sparkles, TrendingUp, ListChecks,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';

const goalIcons: Record<string, any> = {
  LayoutDashboard, Server, Layers, Smartphone, Boxes, ShieldCheck,
  BarChart3, FlaskConical, BrainCircuit, Brain, Palette, PenTool,
};

const zoneMeta: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  beginner: { label: 'Beginner', icon: BookOpen, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  intermediate: { label: 'Intermediate', icon: BarChart3, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  advanced: { label: 'Advanced', icon: Rocket, color: 'from-purple-500 to-pink-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
};

const levelMeta = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

function ProgressBar({ progress }: { progress: number }) {
  const safe = Math.max(0, Math.min(100, Number(progress) || 0));
  return (
    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${safe}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
      />
    </div>
  );
}

function StatsTile({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  return (
    <GlassCard className="p-4 flex items-center gap-3" hover>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xl font-bold leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{label}</div>
      </div>
    </GlassCard>
  );
}

export default function PathwayFinder() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get('/pathway-finder');
        if (!cancelled) setData(res.data.data);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const schoolOptions = useMemo(() => {
    const set = new Set<string>();
    (data?.discoverableGoals || []).forEach((g: any) => { if (g.school_name) set.add(g.school_name); });
    (data?.schoolPaths || []).forEach((s: any) => { if (s.school?.name) set.add(s.school.name); });
    return ['all', ...Array.from(set)];
  }, [data]);

  const filteredGoals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.discoverableGoals || []).filter((g: any) => {
      if (schoolFilter !== 'all' && !g.school_name?.includes(schoolFilter)) return false;
      if (zoneFilter !== 'all' && g.school_slug?.includes(zoneFilter)) return false;
      if (!q) return true;
      return [g.title, g.role_title, g.summary, g.school_name].join(' ').toLowerCase().includes(q);
    });
  }, [data, query, schoolFilter, zoneFilter]);

  if (isLoading) return <PageSkeleton />;

  const summary = data?.summary || {};
  const pursued = data?.pursuedGoals || [];
  const inGoalIds = new Set(pursued.map((p: any) => p.id));

  const zonesToShow = (group: any) => ['beginner', 'intermediate', 'advanced'].filter((lvl) => group.zones?.[lvl]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl gradient-bg p-6 sm:p-8 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_45%)]" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Pathway Finder</h1>
              <p className="text-white/80 text-sm mt-0.5">Discover every learning path, track your progress, and always know your next step.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatsTile label="Career Goals" value={summary.totalGoals || 0} icon={Target} tone="bg-white/15" />
            <StatsTile label="Pursued" value={summary.pursuedGoals || 0} icon={ListChecks} tone="bg-white/15" />
            <StatsTile label="In Progress" value={summary.inProgressPathways ?? summary.pursuedGoals ?? 0} icon={TrendingUp} tone="bg-white/15" />
            <StatsTile label="Completed" value={summary.completedPathways ?? 0} icon={CheckCircle2} tone="bg-white/15" />
          </div>
        </div>
      </div>

      {/* Continue learning */}
      {pursued.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-bold">Continue Your Pathways</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pursued.map((goal: any) => (
              <GlassCard key={goal.id} className="p-5 space-y-3" hover>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${goal.color || 'from-blue-600 to-cyan-600'} flex items-center justify-center text-white flex-shrink-0`}>
                      {(() => { const Icon = goalIcons[goal.icon] || Target; return <Icon className="w-5 h-5" />; })()}
                    </div>
                    <div className="min-w-0">
                      <Link to={`/student/career-goals/${goal.slug}`} className="font-semibold truncate block hover:text-primary-500">
                        {goal.title}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {goal.completed_courses || 0}/{goal.total_courses || 0} courses • {goal.school_name || ''}
                      </div>
                    </div>
                  </div>
                  {goal.completed && <Badge variant="success">Completed</Badge>}
                </div>
                <ProgressBar progress={goal.progress} />
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-gray-500">{goal.progress || 0}% complete</span>
                  {goal.nextStep && !goal.completed ? (
                    <Link to={`/courses/${goal.nextStep.slug}`} className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-medium hover:underline">
                      Next: {goal.nextStep.title} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-success-500 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Finished</span>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      {/* Search / filter */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-bold">Explore Career Pathways</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search goals, roles, skills…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            />
          </div>
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none"
          >
            <option value="all">All Schools</option>
            {schoolOptions.slice(1).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none"
          >
            <option value="all">All Levels</option>
            {Object.entries(levelMeta).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal: any) => {
            const Icon = goalIcons[goal.icon] || Target;
            return (
              <GlassCard key={goal.id} className="p-5 flex flex-col gap-3" hover>
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${goal.color || 'from-blue-600 to-cyan-600'} flex items-center justify-center text-white`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {goal.isPursued ? (
                      <Badge variant={goal.completed ? 'success' : 'primary'}>
                        {goal.completed ? 'Completed' : `${goal.progress || 0}%`}
                      </Badge>
                    ) : (
                      <Badge variant="default">Explore</Badge>
                    )}
                    <span className="text-xs text-gray-400">{goal.school_name || ''}</span>
                  </div>
                </div>
                <div>
                  <Link to={`/student/career-goals/${goal.slug}`} className="font-semibold hover:text-primary-500">
                    {goal.title}
                  </Link>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{goal.summary}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {goal.courses_count || 0} courses</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {goal.duration_estimate || '—'}</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {goal.students_count || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={goal.isPursued ? 'outline' : 'primary'}
                    className="flex-1"
                    onClick={() => navigate(goal.isPursued ? `/student/career-goals/${goal.slug}` : `/schools/${goal.school_slug}`)}
                  >
                    {goal.isPursued ? 'Continue' : 'View Pathway'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/student/career-goals/${goal.slug}`)}>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </GlassCard>
            );
          })}
          {filteredGoals.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-500">No pathways match your filters.</div>
          )}
        </div>
      </section>

      {/* School pathways */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-bold">School Pathways</h2>
        </div>
        <div className="space-y-5">
          {(data?.schoolPaths || []).map((group: any) => (
            <GlassCard key={group.school?.id} className="p-5 space-y-4" hover>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${group.school?.color || 'from-primary-500 to-accent-500'} flex items-center justify-center text-white`}>
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <Link to={`/schools/${group.school?.slug}`} className="font-semibold hover:text-primary-500">
                      {group.school?.name}
                    </Link>
                    <div className="text-xs text-gray-500">{group.totalCourses || 0} courses across levels</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {zonesToShow(group).map((lvl) => {
                  const zone = group.zones[lvl];
                  const meta = zoneMeta[lvl];
                  const ZoneIcon = meta.icon;
                  const path = zone?.path || {};
                  return (
                    <div key={lvl} className={`rounded-xl border ${meta.border} p-4 space-y-2`}>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 text-xs font-semibold ${meta.bg} ${meta.color.split(' ')[0].replace('from-', 'text-')} px-2 py-1 rounded-lg`}>
                          <ZoneIcon className="w-3.5 h-3.5" />
                          {meta.label}
                        </div>
                        {path.enrolled && <Badge variant={path.pathCompleted ? 'success' : 'primary'} size="sm">{path.pathCompleted ? 'Done' : `${path.progress || 0}%`}</Badge>}
                      </div>
                      <div className="text-xs text-gray-500">{zone.courses_count || 0} courses • {zone.total_duration || 0}h</div>
                      {path.enrolled && <ProgressBar progress={path.progress} />}
                      <Button
                        size="sm"
                        variant={path.enrolled ? 'outline' : 'secondary'}
                        className="w-full"
                        onClick={() => navigate(path.enrolled ? `/learning-paths/${path.slug}` : (isAuthenticated ? `/student/learning-paths/${path.slug}` : '/login'))}
                      >
                        {path.enrolled ? 'Continue' : 'Explore'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          ))}
          {(data?.schoolPaths || []).length === 0 && (
            <div className="text-center py-8 text-gray-500">No school pathways available yet.</div>
          )}
        </div>
      </section>

      {/* Category pathways */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-500" />
          <h2 className="text-lg font-bold">Skill Pathways by Level</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(levelMeta).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setZoneFilter(zoneFilter === k ? 'all' : k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                zoneFilter === k ? 'bg-primary-500/10 border-primary-500/30 text-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-primary-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {(data?.categoryPaths || []).map((group: any) => (
            <GlassCard key={group.category} className="p-5 space-y-3" hover>
              <h3 className="font-semibold">{group.category}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {zonesToShow(group).map((lvl) => {
                  const zone = group.zones[lvl];
                  const meta = zoneMeta[lvl];
                  const ZoneIcon = meta.icon;
                  const path = zone?.path || {};
                  return (
                    <div key={lvl} className={`rounded-xl border ${meta.border} p-4 space-y-2`}>
                      <div className={`flex items-center gap-2 text-xs font-semibold ${meta.bg} px-2 py-1 rounded-lg w-fit`}>
                        <ZoneIcon className="w-3.5 h-3.5" />
                        {meta.label}
                      </div>
                      <div className="text-xs text-gray-500">{zone.courses_count || 0} courses • {zone.total_duration || 0}h</div>
                      {path.enrolled && <ProgressBar progress={path.progress} />}
                      <Button
                        size="sm"
                        variant={path.enrolled ? 'outline' : 'secondary'}
                        className="w-full"
                        onClick={() => navigate(path.enrolled ? `/learning-paths/${path.slug}` : (isAuthenticated ? `/student/learning-paths/${path.slug}` : '/login'))}
                      >
                        {path.enrolled ? 'Continue' : 'Explore'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          ))}
          {(data?.categoryPaths || []).length === 0 && (
            <div className="text-center py-8 text-gray-500">No category pathways available yet.</div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
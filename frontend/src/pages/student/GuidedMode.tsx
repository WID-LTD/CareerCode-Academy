import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Loader } from '@/components/ui/Loader';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { CheckCircle2, Circle, Flame, Zap, BookOpen, Trophy, Pause, Play, RefreshCcw, GraduationCap, GitBranch, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function GuidedModePage() {
  const { slug } = useParams<{ slug: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  const [today, setToday] = useState<any>(null);
  const [pathId, setPathId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);

  const [paths, setPaths] = useState<any[]>([]);

  const [productive, setProductive] = useState('3');
  const [energy, setEnergy] = useState('3');
  const [blocks, setBlocks] = useState('4');
  const [checkinMsg, setCheckinMsg] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!slug) {
      (async () => {
        try {
          const res = await api.get('/learning-paths/grouped-by-school').catch(() => api.get('/learning-paths/grouped'));
          const groups = res.data.data || [];
          const flat: any[] = [];
          for (const g of groups) {
            if (g.zones) {
              for (const level of ['beginner', 'intermediate', 'advanced']) {
                const zone = g.zones?.[level];
                if (zone?.path) {
                  flat.push({
                    ...zone.path,
                    level: zone.path.level || level,
                    courses: zone.courses || [],
                    courses_count: zone.courses_count,
                    color: zone.color || zone.path.color,
                    icon: zone.icon || zone.path.icon,
                  });
                }
              }
              continue;
            }
            const arr = g.paths || g.learning_paths;
            if (Array.isArray(arr) && arr.length) {
              flat.push(...arr);
            } else if (g.slug && g.title) {
              flat.push(g);
            }
          }
          setPaths(flat.length ? flat : groups);
        } catch {
          setError('Failed to load learning paths');
        } finally {
          setLoading(false);
        }
      })();
      return;
    }
    (async () => {
      try {
        const { data } = await api.post('/guided/enroll', { pathSlug: slug });
        setPathId(data.data.path_id);
        const todayRes = await api.get(`/guided/today?path_id=${data.data.path_id}`);
        setToday(todayRes.data.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load Guided Mode');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, slug]);

  const refresh = async () => {
    if (!pathId) return;
    const { data } = await api.get(`/guided/today?path_id=${pathId}`);
    setToday(data.data);
  };

  const markComplete = async (lessonId: string) => {
    if (!pathId) return;
    setMarking(lessonId);
    try {
      const { data } = await api.post(`/guided/lessons/${lessonId}/complete`, { path_id: pathId });
      setToday(data.data.state);
      if (data.data.advanced) {
        setError(null);
        setToday(data.data.state);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not mark lesson');
    } finally {
      setMarking(null);
    }
  };

  const submitCheckin = async (e: FormEvent) => {
    e.preventDefault();
    if (!pathId) return;
    setCheckingIn(true);
    try {
      const { data } = await api.post('/guided/checkin', {
        productive: Number(productive),
        energy: Number(energy),
        blocks_completed: Number(blocks),
      });
      setCheckinMsg(data.data.claimed_xp
        ? 'Logged! You earned +30 experience points for 4+ blocks today.'
        : 'Logged! Check in after finishing 4 blocks to earn a bonus.')
      ;
      refresh();
    } catch (err: any) {
      setCheckinMsg(null);
      setError(err?.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const toggleMode = async () => {
    if (!pathId || !today) return;
    await api.patch(`/guided/${pathId}/mode`, { mode: today.enrollment.mode === 'active' ? 'paused' : 'active' });
    refresh();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader size="lg" text="Setting up your guided plan..." /></div>;
  if (error && !today && slug) {
    return (
      <div className="flex justify-center py-20">
        <Alert variant="error" className="max-w-md">{error}</Alert>
      </div>
    );
  }
  if (!slug) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary-500" /> Guided Mode
          </h1>
          <p className="text-sm text-gray-400 mt-1">Pick a learning path to start your daily loop — one course a day, with check-ins and day gates.</p>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        {paths.length === 0 ? (
          <EmptyState icon={<GitBranch className="w-8 h-8" />} title="No learning paths yet" description="Learning paths will appear here so you can start Guided Mode." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paths.map((p: any) => (
              <GlassCard key={p.id} className="p-5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color || 'from-primary-500 to-accent-500'} flex items-center justify-center text-primary-500 mb-3`}>
                  <GitBranch className="w-5 h-5" />
                </div>
                <h3 className="font-medium">{p.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description || ''}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-gray-500">{Array.isArray(p.courses) ? `${p.courses.length} courses` : ''}</span>
                  <Button size="sm" onClick={() => navigate(`/student/guided/${p.slug}`)}>Start <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </motion.div>
    );
  }
  if (!today) return null;

  const course = today.course;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary-500" /> Guided Mode
          </h1>
          <p className="text-sm text-gray-400 mt-1">{today.path.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" size="md" className="flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> {today.streak} day streak</Badge>
          <Button size="sm" variant={today.enrollment.mode === 'active' ? 'outline' : 'primary'} onClick={toggleMode}>
            {today.enrollment.mode === 'active' ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Resume</>}
          </Button>
        </div>
      </div>

      {today.enrollment.mode === 'paused' && (
        <Alert variant="warning" title="Guided Mode is paused" className="mb-4">Come back and resume whenever you're ready. You can still self-study freely.</Alert>
      )}

      {/* Progress */}
      <GlassCard className="p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium flex items-center gap-1.5"><Trophy className="w-4 h-4 text-yellow-500" /> Day {today.currentDay} of {today.totalDays}</span>
          <span className="text-xs text-gray-500 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> {today.blocks_this_week} blocks this week</span>
        </div>
        <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500"
            style={{ width: `${((today.currentDay - (today.finished ? 0 : 1)) / today.totalDays) * 100}%` }}
          />
        </div>
      </GlassCard>

      {today.finished ? (
        <GlassCard className="p-8 text-center">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1">Pathway complete!</h2>
          <p className="text-sm text-gray-400 mb-5">You've finished every day of this learning path in Guided Mode.</p>
          <div className="flex justify-center gap-3">
            <Button size="sm" onClick={() => navigate(`/student/learning-paths/${today.path.slug}`)}>View Learning Path</Button>
            <Badge variant="success" size="md">Graduate milestone reached</Badge>
          </div>
        </GlassCard>
      ) : course ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary-500" /> {course.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500">
                    {course.instructor_name && <span>By {course.instructor_name}</span>}
                    {course.level && <Badge variant="default">{course.level}</Badge>}
                    {course.duration && <span>{course.duration}</span>}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/courses/${course.slug}`)}>Open Course</Button>
              </div>

              <div className="space-y-2">
                {course.lessons.map((lesson: any) => {
                  const done = course.completedLessonIds.includes(lesson.id);
                  return (
                    <div key={lesson.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                      <div className="flex items-center gap-3 min-w-0">
                        {done ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <Circle className="w-5 h-5 text-gray-400 shrink-0" />}
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${done ? 'line-through text-gray-500' : ''}`}>{lesson.title}</p>
                        </div>
                      </div>
                      {!done && (
                        <Button size="sm" variant="ghost" loading={marking === lesson.id} onClick={() => markComplete(lesson.id)}>Done</Button>
                      )}
                    </div>
                  );
                })}
                {course.lessons.length === 0 && (
                  <p className="text-sm text-gray-500">This course has no lessons yet — move on when ready.</p>
                )}
              </div>

              {course.gate && (
                <div className="mt-5 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Day gate: {course.gate.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {course.gate_passed
                          ? 'Quiz passed — nicely done!'
                          : `Pass the quiz (${course.gate.passing_score}%+) to unlock the next day.`}
                      </p>
                    </div>
                    {!course.gate_passed && (
                      <Button size="sm" variant="neon" onClick={() => navigate(`/student/quiz/${course.gate.id}`)}>Take Quiz</Button>
                    )}
                    {course.gate_passed && (
                      <Badge variant="success" size="md">Passed</Badge>
                    )}
                  </div>
                </div>
              )}

              {course.all_lessons_done && !course.gate && (
                <Alert variant="info" className="mt-4">All lessons complete — your next day unlocks.</Alert>
              )}
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard className="p-5">
              <h3 className="font-medium mb-3">Daily Check-in</h3>
              {today.today_checkin ? (
                <div className="text-sm text-gray-400 space-y-2">
                  <p className="flex items-center gap-1.5 text-green-500"><CheckCircle2 className="w-4 h-4" /> Checked in today</p>
                  <p>Productivity: <span className="text-white">{'★'.repeat(today.today_checkin.productive || 0)}{'☆'.repeat(5 - (today.today_checkin.productive || 0))}</span></p>
                  <p>Energy: <span className="text-white">{'★'.repeat(today.today_checkin.energy || 0)}{'☆'.repeat(5 - (today.today_checkin.energy || 0))}</span></p>
                  <p>Blocks: <span className="text-white">{today.today_checkin.blocks_completed || 0}</span></p>
                </div>
              ) : (
                <form onSubmit={submitCheckin} className="space-y-3">
                  <Input label="Blocks completed today" name="blocks" type="number" min={0} value={blocks} onChange={e => setBlocks(e.target.value)} placeholder="How many 25-min blocks did you finish?" />
                  <Select label="Productivity" value={productive} onChange={e => setProductive(e.target.value)} options={[1,2,3,4,5].map(v => ({ value: String(v), label: `${v} / 5` }))} />
                  <Select label="Energy" value={energy} onChange={e => setEnergy(e.target.value)} options={[1,2,3,4,5].map(v => ({ value: String(v), label: `${v} / 5` }))} />
                  <Button type="submit" size="sm" loading={checkingIn} className="w-full">Check-in</Button>
                </form>
              )}
              {checkinMsg && <p className="text-xs text-green-500 mt-2">{checkinMsg}</p>}
              <p className="text-xs text-gray-500 mt-3">Earn +30 experience points when you complete 4+ guided blocks in a day.</p>
            </GlassCard>

            <GlassCard className="p-5">
              <h3 className="font-medium mb-3 flex items-center gap-2"><RefreshCcw className="w-4 h-4 text-primary-500" /> Pipeline</h3>
              <Link to="/student/applications" className="text-sm text-primary-500 hover:text-primary-400">View applications & matches →</Link>
            </GlassCard>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
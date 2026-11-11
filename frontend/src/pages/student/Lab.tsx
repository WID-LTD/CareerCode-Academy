import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera, ClipboardList, Code2, ExternalLink, FlaskConical, Loader2,
  MonitorUp, Sparkles, CheckCircle2, Clock3, ArrowRight, Github, ShieldCheck, RefreshCw,
} from 'lucide-react';
import api from '@/lib/axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';

type Task = {
  id: string;
  kind: 'assignment' | 'challenge' | 'project';
  title: string;
  description?: string;
  instructions?: string;
  course?: string;
  course_title?: string;
  course_slug?: string;
  lesson_title?: string;
  status?: string;
  submission_passed?: boolean;
  submission?: any;
  gigo_prompt?: string;
  tools?: string[];
  steps?: string[];
  due?: string;
};

function askGigo(task: Task) {
  const details = task.instructions || task.description || '';
  const prompt = `I am working on this ${task.kind === 'challenge' ? 'coding challenge' : 'assignment'} in the Guided Lab:
Title: ${task.title}
Course: ${task.course_title || task.course || 'Backend course'}
${details ? `Instructions: ${details}` : ''}

Give me a step-by-step plan, the tools I need, and the first command or file I should create. Do not write the full solution for me. If I upload a screenshot, inspect it and tell me exactly what to fix.`;
  window.dispatchEvent(new CustomEvent('gigo:open', { detail: { prompt } }));
}

export default function StudentLab() {
  const [assignments, setAssignments] = useState<Task[]>([]);
  const [challenges, setChallenges] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [github, setGithub] = useState<any>(null);
  const [checkingGithub, setCheckingGithub] = useState(false);
  const [tab, setTab] = useState<'all' | 'assignments' | 'challenges' | 'projects'>('all');

  const loadGithub = () => {
    setCheckingGithub(true);
    api.get('/course-projects/github/status').then(({ data }) => setGithub(data.data)).catch(() => setGithub({ reachable: false, message: 'GitHub check unavailable' })).finally(() => setCheckingGithub(false));
  };

  useEffect(() => {
    let alive = true;
    loadGithub();
    Promise.all([
      api.get('/student/assignments?limit=100').then((r) => r.data?.data || []).catch(() => []),
      api.get('/student/challenges?limit=100').then((r) => r.data?.data || []).catch(() => []),
      api.get('/course-projects').then((r) => r.data?.data || []).catch(() => []),
    ]).then(([a, c, p]) => {
      if (!alive) return;
      setAssignments(a.map((x: any) => ({ ...x, kind: 'assignment' as const })));
      setChallenges(c.map((x: any) => ({
        ...x,
        kind: 'challenge' as const,
        course_title: x.course_title,
        course_slug: x.course_slug,
      })));
      setProjects(p.map((x: any) => ({
        ...x,
        kind: 'project' as const,
        course_title: x.course_title,
        course_slug: x.course_slug,
        submission_passed: x.submission?.status === 'verified',
        status: x.submission?.status || 'not-started',
      })));
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const tasks = useMemo(() => {
    const all = [...assignments, ...challenges, ...projects];
    if (tab === 'assignments') return assignments;
    if (tab === 'challenges') return challenges;
    if (tab === 'projects') return projects;
    return all;
  }, [assignments, challenges, projects, tab]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-600 p-6 sm:p-8 text-white">
        <div className="absolute -right-10 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-indigo-100">
            <FlaskConical className="w-3.5 h-3.5" /> Guided Lab
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2">Do the work. Get unstuck with GiGo.</h1>
          <p className="text-indigo-100/90 text-sm mt-2">
            Every assignment and coding challenge in your enrolled courses lives here. Ask GiGo for a plan, attach a screenshot of an error, or record your screen and let GiGo inspect the frame.
          </p>
          <div className="flex flex-wrap gap-3 mt-5 text-xs text-indigo-50">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Camera className="w-3.5 h-3.5" /> Screenshot review</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><MonitorUp className="w-3.5 h-3.5" /> Screen recording review</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Sparkles className="w-3.5 h-3.5" /> Step-by-step coaching</span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          ['1', 'Open a task', 'Pick an assignment or challenge from a course you are enrolled in.'],
          ['2', 'Ask GiGo', 'Get a plan and the first concrete step — not a copy-paste answer.'],
          ['3', 'Show your screen', 'Attach a screenshot or record your screen so GiGo can see the real error.'],
        ].map(([n, title, body]) => (
          <GlassCard key={n} className="p-4" hover={false}>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 grid place-items-center text-xs font-bold mb-2">{n}</div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-gray-500 mt-1">{body}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-5" hover={false}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gray-900 text-white grid place-items-center flex-shrink-0"><Github className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">GitHub access check</p>
              {github && (
                <Badge variant={github.reachable ? 'success' : 'danger'} size="sm">
                  {github.reachable ? 'Reachable' : 'Unreachable'}
                </Badge>
              )}
              <button onClick={loadGithub} disabled={checkingGithub} className="ml-auto inline-flex items-center gap-1 text-xs text-indigo-500 disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${checkingGithub ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {github?.message || 'Checking whether CareerCode can reach GitHub...'}
              {github?.remaining != null ? ` · ${github.remaining}/${github.limit} API calls left` : ''}
            </p>
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              {(github?.local_commands || []).map((c: any) => (
                <div key={c.command} className="rounded-lg border border-gray-200 dark:border-gray-800 p-2">
                  <code className="text-[11px] font-mono text-indigo-500">{c.command}</code>
                  <p className="text-[10px] text-gray-500 mt-0.5">{c.purpose}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">The browser cannot inspect your laptop directly. Run these commands in your terminal, then paste the output into GiGo if a command fails.</p>
          </div>
        </div>
      </GlassCard>

      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'assignments', 'challenges', 'projects'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === key
                ? 'bg-indigo-500 text-white border-indigo-500'
                : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {key === 'all' ? `All tasks (${assignments.length + challenges.length + projects.length})` : key === 'assignments' ? `Assignments (${assignments.length})` : key === 'challenges' ? `Challenges (${challenges.length})` : `Projects (${projects.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
      ) : tasks.length === 0 ? (
        <GlassCard className="p-10 text-center" hover={false}>
          <FlaskConical className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="font-semibold">No lab tasks yet</p>
          <p className="text-sm text-gray-500 mt-1">Enroll in a course with assignments or challenges and they will appear here.</p>
          <Link to="/student/courses" className="inline-flex items-center gap-1.5 mt-4 text-sm text-indigo-500 font-medium">Browse my courses <ArrowRight className="w-4 h-4" /></Link>
        </GlassCard>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const done = task.status === 'graded' || task.status === 'verified' || task.submission_passed === true;
            return (
              <GlassCard key={`${task.kind}-${task.id}`} className="p-5 flex flex-col" hover={false}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant={task.kind === 'challenge' ? 'primary' : task.kind === 'project' ? 'success' : 'warning'} size="sm">
                        {task.kind === 'challenge' ? <><Code2 className="w-3 h-3 mr-1" /> Challenge</> : task.kind === 'project' ? <><FlaskConical className="w-3 h-3 mr-1" /> Project</> : <><ClipboardList className="w-3 h-3 mr-1" /> Assignment</>}
                      </Badge>
                      {done && <Badge variant="success" size="sm"><CheckCircle2 className="w-3 h-3 mr-1" /> Done</Badge>}
                    </div>
                    <h3 className="font-semibold leading-snug">{task.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 truncate">{task.course_title || task.course}{task.lesson_title ? ` · ${task.lesson_title}` : ''}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3 line-clamp-3 whitespace-pre-wrap">
                  {task.instructions || task.description || 'Open the task to see the full instructions.'}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => askGigo(task)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Ask GiGo
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('gigo:open', { detail: { prompt: `I want to attach a screenshot for this task: ${task.title}. Tell me what you need to see.` } }))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    <Camera className="w-3.5 h-3.5" /> Upload screenshot
                  </button>
                  {task.course_slug && (
                    <Link to={`/student/courses/${task.course_slug}${task.kind === 'project' ? '#projects' : ''}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                      Open course <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  {task.due && <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-400"><Clock3 className="w-3 h-3" /> {new Date(task.due).toLocaleDateString()}</span>}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

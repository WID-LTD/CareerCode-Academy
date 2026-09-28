import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import HighlightExt from '@tiptap/extension-highlight';
import PlaceholderExt from '@tiptap/extension-placeholder';
import { api } from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import ChallengeCard from '../../components/student/ChallengeCard';
import LessonQuiz from '../../components/student/LessonQuiz';
import VideoPlayer from '../../components/VideoPlayer';
import toast from 'react-hot-toast';
import {
  PlayCircle, CheckCircle, Lock, ChevronLeft, ChevronRight,
  FileText, Download, BookOpen, Clock, Award,
  ChevronDown, ChevronUp, PenLine, HelpCircle, Code,
  Bookmark, BookmarkCheck, PartyPopper,
  Megaphone, BarChart3, Brain, GitBranch, Layers, GraduationCap, Target, Sparkles,
  Bold, Italic, Underline, Highlighter, Undo, Redo,
} from 'lucide-react';
import SEO from '@/components/seo/SEO';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  video_url?: string;
  is_free?: boolean;
  module_id?: string;
  duration?: number;
  order_index?: number;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  order_index?: number;
}

interface CourseData {
  id: string;
  title: string;
  slug: string;
  description?: string;
  lessons?: Lesson[];
  level?: string;
  category?: string;
  instructor_name?: string;
  duration?: number;
  thumbnail?: string;
}

interface EnrollmentData {
  status?: string;
  completed?: boolean;
  progress?: number;
}

interface AnalyticsData {
  lessons: { total: number; completed: number; completionRate: number };
  timeSpent: { totalHours: number };
  quizzes: { averageScore: number };
  weeklyActivity: { date: string; label: string; lessons: number }[];
  assignments: { submitted: number; averageScore: number };
  challenges: { submitted: number; passed: number; averageScore: number };
}

type Tab = 'notes' | 'quiz' | 'resources' | 'challenge' | 'projects' | 'announcements' | 'analytics';

const TAB_CONFIG: { key: Tab; label: string; icon: any }[] = [
  { key: 'notes', label: 'Notes', icon: PenLine },
  { key: 'quiz', label: 'Quiz', icon: HelpCircle },
  { key: 'resources', label: 'Resources', icon: Download },
  { key: 'challenge', label: 'Practice', icon: Code },
  { key: 'projects', label: 'Projects', icon: Target },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'analytics', label: 'Progress', icon: BarChart3 },
];

function ProjectSubmitForm({ project, submitted, onSubmitted }: { project: any; submitted: boolean; onSubmitted: () => void }) {
  const [githubUrl, setGithubUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async () => {
    if (!githubUrl.trim()) { toast.error('GitHub repository URL is required'); return; }
    try {
      new URL(githubUrl);
      if (liveUrl) new URL(liveUrl);
    } catch { toast.error('Please enter valid URLs'); return; }
    setSubmitting(true);
    try {
      const fileUrl = liveUrl ? `${githubUrl}\nLive: ${liveUrl}` : githubUrl;
      await api.post(`/assignments/${project.id}/submit`, { fileUrl });
      toast.success('Project submitted successfully! Awaiting review.');
      setShowForm(false);
      onSubmitted();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to submit';
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
        <CheckCircle className="w-4 h-4" /> Submitted — under review
      </div>
    );
  }

  return (
    <div className="mt-3">
      {!showForm ? (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="w-full sm:w-auto">
          <Target className="w-4 h-4 mr-1" /> Submit Project
        </Button>
      ) : (
        <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-300">GitHub Repository URL *</label>
            <input value={githubUrl} onChange={e=>setGithubUrl(e.target.value)} placeholder="https://github.com/username/repo" className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-300">Live Deployment URL (optional)</label>
            <input value={liveUrl} onChange={e=>setLiveUrl(e.target.value)} placeholder="https://your-live-project-url" className="mt-1 w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 outline-none" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} loading={submitting} disabled={submitting}>Submit</Button>
            <Button size="sm" variant="ghost" onClick={()=>setShowForm(false)}>Cancel</Button>
          </div>
          <p className="text-[11px] text-gray-500">Your GitHub repo should include README, screenshots, and deployment instructions.</p>
        </div>
      )}
    </div>
  );
}

export default function CourseView() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [lessonProgress, setLessonProgress] = useState<Record<string, boolean>>({});
  const [watchPosition, setWatchPosition] = useState<Record<string, number>>({});
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('notes');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | ''>('');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resources, setResources] = useState<any[]>([]);
  const [resourceView, setResourceView] = useState<'formatted' | 'plain'>('formatted');
  const [lessonQuiz, setLessonQuiz] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectSubmissions, setProjectSubmissions] = useState<Record<string, any>>({});
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [moduleProgress, setModuleProgress] = useState<any[]>([]);
  const [detailed, setDetailed] = useState<any>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [bookmarkedLessons, setBookmarkedLessons] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('bookmarkedLessons') || '{}'); } catch { return {}; }
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentLessonIdRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      HighlightExt,
      PlaceholderExt.configure({ placeholder: 'Write your notes for this lesson here...' }),
    ],
    onUpdate: ({ editor: ed }) => {
      const lessonId = currentLessonIdRef.current;
      if (!lessonId) return;
      const html = ed.getHTML();
      setSaveStatus('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await api.post(`/lessons/${lessonId}/notes`, { content: html });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(''), 2000);
        } catch {
          setSaveStatus('');
        }
      }, 1500);
    },
  });

  const handlePositionUpdate = useCallback((lessonId: string, cId: string, position: number, percentage: number) => {
    api.put('/progress/watch-position', { lessonId, courseId: cId, watchPosition: position, watchPercentage: percentage }).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('bookmarkedLessons', JSON.stringify(bookmarkedLessons));
  }, [bookmarkedLessons]);

  useEffect(() => { loadData(); }, [slug]);

  const loadData = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const [courseRes, enrollmentRes] = await Promise.all([
        api.get(`/courses/slug/${slug}`),
        api.get('/enrollments'),
      ]);

      const courseData = courseRes.data.data;
      setCourse(courseData);

      const enrollmentData = enrollmentRes.data.data || [];
      const myEnrollment = enrollmentData.find((e: any) => e.course_id === courseData.id);
      setEnrollment(myEnrollment);

      const modulesRes = await api.get(`/modules/course/${courseData.id}`);
      const rawModules = modulesRes.data.data || [];
      const lessons = courseData.lessons || [];

      const enrichedModules: Module[] = rawModules.map((m: any) => ({
        ...m,
        lessons: lessons
          .filter((l: any) => l.module_id === m.id)
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)),
      }));

      const moduleLessonIds = new Set(lessons.filter((l: any) => l.module_id).map((l: any) => l.id));
      const ungroupedLessons = lessons.filter((l: any) => !moduleLessonIds.has(l.id) || !l.module_id);
      if (ungroupedLessons.length > 0) {
        enrichedModules.push({ id: 'ungrouped', title: 'Course Content', lessons: ungroupedLessons, order_index: 9999 });
      }

      // sort modules by order_index
      enrichedModules.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

      setModules(enrichedModules);
      const initialExpanded: Record<string, boolean> = {};
      enrichedModules.forEach((m) => { initialExpanded[m.id] = true; });
      setExpandedModules(initialExpanded);

      if (myEnrollment) {
        const progressRes = await api.get(`/progress?courseId=${courseData.id}`);
        const progressMap: Record<string, boolean> = {};
        const watchMap: Record<string, number> = {};
        (progressRes.data.data?.progress || []).forEach((p: any) => {
          if (p.completed) progressMap[p.lesson_id] = true;
          watchMap[p.lesson_id] = p.watch_position || 0;
        });
        setLessonProgress(progressMap);
        setWatchPosition(watchMap);

        // fetch detailed progress & module progress for header & sidebar
        try {
          const [dRes, mRes] = await Promise.all([
            api.get(`/progress/detailed?courseId=${courseData.id}`).catch(() => null),
            api.get(`/progress/modules?courseId=${courseData.id}`).catch(() => null),
          ]);
          if (dRes?.data?.data) setDetailed(dRes.data.data);
          if (mRes?.data?.data) setModuleProgress(mRes.data.data);
        } catch {}

        // Determine resume index: first incomplete lesson
        const flat = enrichedModules.flatMap(m => m.lessons);
        const firstIncompleteIdx = flat.findIndex((l: any) => !progressMap[l.id]);
        if (firstIncompleteIdx !== -1) {
          setCurrentLessonIndex(firstIncompleteIdx);
          // load its content early
          setTimeout(() => loadLessonContent(flat[firstIncompleteIdx]), 100);
        }
      }

      try {
        const annRes = await api.get(`/courses/${courseData.id}/announcements`);
        setAnnouncements(annRes.data.data || []);
      } catch { setAnnouncements([]); }

      // Fetch projects (assignments) for this course
      try {
        const projRes = await api.get(`/assignments/course/${courseData.id}`);
        setProjects(projRes.data.data || []);
        // also fetch student submissions status via /student/assignments
        try {
          const subRes = await api.get('/student/assignments?page=1&limit=100');
          const map: Record<string, any> = {};
          (subRes.data.data || []).forEach((a: any) => { map[a.id] = a; });
          setProjectSubmissions(map);
        } catch {}
      } catch { setProjects([]); }

      setAccessChecked(true);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        toast.error('Please login to access course content');
      } else {
        toast.error('Failed to load course');
      }
    } finally {
      setLoading(false);
    }
  };

  const allFlatLessons = modules.flatMap((m) => m.lessons || []);
  const totalLessons = allFlatLessons.length;
  const completedCount = Object.values(lessonProgress).filter(Boolean).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const hasAccess = !!enrollment;
  const isCompleted = enrollment?.status === 'completed' || enrollment?.completed;

  let currentLesson: Lesson | null = null;
  let currentModIdx = 0;
  let currentLessIdx = 0;
  let flatIdx = 0;
  for (let mi = 0; mi < modules.length; mi++) {
    const moduleLessons = modules[mi].lessons || [];
    for (let li = 0; li < moduleLessons.length; li++) {
      if (flatIdx === currentLessonIndex) { currentLesson = moduleLessons[li]; currentModIdx = mi; currentLessIdx = li; }
      flatIdx++;
    }
  }

  const handleWatchProgress = (lessonId: string) => {
    const video = document.querySelector('video');
    if (video && course) {
      const percentage = Math.round((video.currentTime / video.duration) * 100);
      if (percentage > 0) {
        api.put('/progress/watch-position', { lessonId, courseId: course.id, watchPosition: Math.round(video.currentTime), watchPercentage: percentage }).catch(() => {});
      }
    }
  };

  const markCompleted = async () => {
    if (!currentLesson || !course) return;
    const newCompleted = !lessonProgress[currentLesson.id];
    try {
      await api.post('/progress', { lessonId: currentLesson.id, completed: newCompleted, courseId: course.id });
      setLessonProgress(prev => ({ ...prev, [currentLesson.id]: newCompleted }));
      toast.success(newCompleted ? 'Lesson completed! +10 XP' : 'Progress updated');
      if (newCompleted) {
        setShowXpPopup(true);
        setTimeout(() => setShowXpPopup(false), 2000);
      }
      // refresh detailed
      try {
        const dRes = await api.get(`/progress/detailed?courseId=${course.id}`);
        if (dRes.data.data) setDetailed(dRes.data.data);
        const mRes = await api.get(`/progress/modules?courseId=${course.id}`);
        if (mRes.data.data) setModuleProgress(mRes.data.data);
      } catch {}
      if (newCompleted && autoPlayNext && currentLessonIndex < totalLessons - 1) {
        setTimeout(() => goToLesson(currentLessonIndex + 1), 800);
      }
    } catch (error: any) {
      if (error?.response?.data?.quizRequired) {
        toast.error('Complete the lesson quiz first — check the Quiz tab!');
        setActiveTab('quiz');
      } else {
        toast.error(error?.response?.data?.error || 'Failed to update progress');
      }
    }
  };

  const goToLesson = (index: number) => {
    if (index >= 0 && index < totalLessons) {
      // check locked: if target module is locked, prevent
      let acc = 0;
      for (let mi = 0; mi < modules.length; mi++) {
        const count = modules[mi].lessons?.length || 0;
        if (index >= acc && index < acc + count) {
          if (isModuleLocked(mi)) {
            toast.error('Complete the previous module to unlock this one');
            return;
          }
          break;
        }
        acc += count;
      }
      setCurrentLessonIndex(index);
      loadLessonContent(allFlatLessons[index]);
    }
  };

  const loadLessonContent = async (lesson: Lesson) => {
    if (!lesson) return;
    currentLessonIdRef.current = lesson.id;
    try {
      const { data } = await api.get(`/lessons/${lesson.id}/notes`);
      const content = data.data || '';
      if (editor) { editor.commands.setContent(content, { emitUpdate: false }); }
    } catch {
      if (editor) { editor.commands.setContent('', { emitUpdate: false }); }
    }
    try { const { data } = await api.get(`/resources/lesson/${lesson.id}`); setResources(data.data || []); } catch { setResources([]); }
    try { const q = await api.get(`/quizzes/lesson/${lesson.id}`); setLessonQuiz(q.data.data || null); } catch { setLessonQuiz(null); }
    try { const c = await api.get(`/challenges/lesson/${lesson.id}`); setChallenges(c.data.data || []); } catch { setChallenges([]); }
  };

  const moduleCompletedCount = (moduleLessons: Lesson[]) => moduleLessons.filter(l => lessonProgress[l.id]).length;

  const isModuleLocked = (modIdx: number) => {
    if (modIdx === 0) return false;
    // check previous module progress via moduleProgress if available, else via computed
    const prevMod = modules[modIdx - 1];
    if (!prevMod) return false;
    const prog = moduleProgress.find((mp: any) => mp.id === prevMod.id);
    if (prog) return prog.percentage < 100;
    // fallback compute
    const cnt = moduleCompletedCount(prevMod.lessons || []);
    return cnt < (prevMod.lessons?.length || 0);
  };

  const getModuleStatus = (modIdx: number, mod: Module) => {
    const total = mod.lessons?.length || 0;
    const completed = moduleCompletedCount(mod.lessons || []);
    if (completed === total && total > 0) return { label: 'Completed', color: 'emerald', icon: CheckCircle };
    if (modIdx === currentModIdx) return { label: 'In Progress', color: 'blue', icon: PlayCircle };
    if (isModuleLocked(modIdx)) return { label: 'Locked', color: 'gray', icon: Lock };
    return { label: 'Available', color: 'gray', icon: BookOpen };
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'ArrowLeft' && currentLessonIndex > 0) goToLesson(currentLessonIndex - 1);
      if (e.key === 'ArrowRight' && currentLessonIndex < totalLessons - 1) goToLesson(currentLessonIndex + 1);
      if (e.key === ' ') { const v = document.querySelector('video'); if (v) { e.preventDefault(); v.paused ? v.play() : v.pause(); } }
      if (e.key === 'm' || e.key === 'M') { const v = document.querySelector('video'); if (v) v.muted = !v.muted; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentLessonIndex, totalLessons, modules, moduleProgress, lessonProgress]);

  useEffect(() => {
    if (totalLessons > 0 && completedCount === totalLessons && !showCompletion) {
      setShowCompletion(true);
      const timer = setTimeout(() => setShowCompletion(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [completedCount, totalLessons]);

  useEffect(() => {
    if (activeTab === 'analytics' && !analytics && !loadingAnalytics && slug) {
      (async () => {
        setLoadingAnalytics(true);
        try { const { data } = await api.get(`/student/courses/${slug}/analytics`); if (data.success) setAnalytics(data.data); } catch { } finally { setLoadingAnalytics(false); }
      })();
    }
  }, [activeTab, analytics, loadingAnalytics, slug]);

  useEffect(() => {
    if (allFlatLessons.length > 0 && currentLesson) {
      loadLessonContent(currentLesson);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson?.id]);

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader size="lg" /></div>;
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <EmptyState title="Course Not Found" description="This course could not be found." action={{ label: 'Back to My Courses', onClick: () => window.location.href = '/student/courses' }} />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <GlassCard className="max-w-md text-center p-8">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Required</h2>
          <p className="text-gray-400 mb-6">You need to enroll in this course to access the content.</p>
          <Link to={`/courses/${slug}`}><Button>View Course Details</Button></Link>
        </GlassCard>
      </div>
    );
  }

  const totalModules = modules.length;
  const currentModule = modules[currentModIdx];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <SEO title={course?.title ? `${course.title} | Learning` : 'Course'} />

      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/student/courses" className="text-gray-400 hover:text-white transition-colors shrink-0" title="Back to My Learning">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-sm truncate flex items-center gap-2">
              {course.title}
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300 border border-primary-500/20">
                <Sparkles className="w-3 h-3" /> Practical
              </span>
            </h1>
            <p className="text-gray-400 text-xs truncate flex items-center gap-1.5">
              <span>{currentLesson?.title || 'Select a lesson'}</span>
              {currentModule && <span className="hidden sm:inline text-gray-500">• {currentModule.title}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowOverview(!showOverview)}
            className={`hidden sm:flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${showOverview ? 'bg-primary-500/20 text-primary-300 border-primary-500/30' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'}`}
          >
            <Layers className="w-3.5 h-3.5" /> Overview
          </button>
          <button
            onClick={() => setAutoPlayNext(!autoPlayNext)}
            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${autoPlayNext ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}
            title={autoPlayNext ? 'Autoplay next lesson is on' : 'Autoplay next lesson is off'}
          >
            <PlayCircle className="w-3 h-3" /> Auto
          </button>
          <Badge className="bg-blue-500/20 text-blue-400 text-xs hidden sm:inline-flex">{progressPercent}% complete</Badge>
          {course?.id && (
            <Link to={`/student/skill-tree/${course.id}`} className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors">
              <GitBranch className="w-3 h-3" /> Skill Tree
            </Link>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white lg:hidden">
            <BookOpen className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Practical Learning Path Banner */}
      <div className="bg-gradient-to-r from-primary-600/10 via-secondary-600/10 to-accent-600/10 border-b border-gray-800 px-4 py-2 hidden lg:flex items-center justify-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-gray-400"><GraduationCap className="w-3.5 h-3.5 text-primary-400" /> Learn</span>
        <ChevronRight className="w-3 h-3 text-gray-600" />
        <span className="flex items-center gap-1.5 text-gray-400"><Code className="w-3.5 h-3.5 text-emerald-400" /> Practice</span>
        <ChevronRight className="w-3 h-3 text-gray-600" />
        <span className="flex items-center gap-1.5 text-gray-400"><HelpCircle className="w-3.5 h-3.5 text-purple-400" /> Quiz</span>
        <ChevronRight className="w-3 h-3 text-gray-600" />
        <span className="flex items-center gap-1.5 text-gray-400"><Target className="w-3.5 h-3.5 text-orange-400" /> Project</span>
        <ChevronRight className="w-3 h-3 text-gray-600" />
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium"><Award className="w-3.5 h-3.5" /> Mastery</span>
      </div>

      {/* Course Overview Panel */}
      <AnimatePresence>
        {showOverview && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-gray-900 border-b border-gray-800">
            <div className="p-4 sm:p-6 grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h2 className="text-white font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary-400" /> {course.title}</h2>
                {course.description && <p className="text-gray-400 text-sm mt-2 line-clamp-3">{course.description}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  {course.category && <Badge variant="primary" size="sm">{course.category}</Badge>}
                  {course.level && <Badge variant="default" size="sm" className="capitalize">{course.level}</Badge>}
                  {course.instructor_name && <Badge variant="default" size="sm">{course.instructor_name}</Badge>}
                  {course.duration && <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3.5 h-3.5" /> {course.duration} mins</span>}
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-white">{totalModules}</p>
                    <p className="text-xs text-gray-400">Modules</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-white">{totalLessons}</p>
                    <p className="text-xs text-gray-400">Lessons</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-primary-400">{progressPercent}%</p>
                    <p className="text-xs text-gray-400">Complete</p>
                  </div>
                </div>
                {detailed && (
                  <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-700/50">
                    <p className="text-xs font-medium text-gray-300 mb-2">Learning Progress</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs"><span className="text-gray-400">Lessons</span><span className="text-white font-medium">{detailed.lessons.completed}/{detailed.lessons.total}</span></div>
                      <ProgressBar value={detailed.lessons.total ? (detailed.lessons.completed/detailed.lessons.total)*100 : 0} size="sm" />
                      <div className="flex items-center justify-between text-xs"><span className="text-gray-400">Exercises</span><span className="text-white font-medium">{detailed.exercises.completed}/{detailed.exercises.total}</span></div>
                      <ProgressBar value={detailed.exercises.total ? (detailed.exercises.completed/detailed.exercises.total)*100 : 0} size="sm" color="bg-gradient-to-r from-emerald-500 to-teal-500" />
                      <div className="flex items-center justify-between text-xs"><span className="text-gray-400">Quizzes</span><span className="text-white font-medium">{detailed.quizzes.completed}/{detailed.quizzes.total}</span></div>
                      <ProgressBar value={detailed.quizzes.total ? (detailed.quizzes.completed/detailed.quizzes.total)*100 : 0} size="sm" color="bg-gradient-to-r from-purple-500 to-pink-500" />
                    </div>
                  </div>
                )}
                <Button size="sm" className="w-full" onClick={() => { setShowOverview(false); goToLesson(allFlatLessons.findIndex(l => !lessonProgress[l.id]) !== -1 ? allFlatLessons.findIndex(l => !lessonProgress[l.id]) : 0); }}>
                  <PlayCircle className="w-4 h-4 mr-1" /> {progressPercent === 0 ? 'Start Learning' : progressPercent === 100 ? 'Review Course' : 'Continue Learning'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-80 bg-gray-900 border-r border-gray-800 overflow-y-auto shrink-0`}>
          <div className="p-3 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm font-semibold flex items-center gap-1.5"><Layers className="w-4 h-4 text-primary-400" /> Course Content</span>
              <Badge className="bg-blue-500/20 text-blue-400 text-xs">{completedCount}/{totalLessons}</Badge>
            </div>
            <ProgressBar value={progressPercent} size="sm" />
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-gray-400">{totalModules} modules • {totalLessons} lessons</span>
              {isCompleted && <span className="flex items-center gap-1 text-emerald-400"><Award className="w-3 h-3" /> Certificate</span>}
            </div>
            {detailed && (
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                  <p className="text-xs font-bold text-white">{detailed.lessons.completed}/{detailed.lessons.total}</p>
                  <p className="text-[10px] text-gray-400">Lessons</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                  <p className="text-xs font-bold text-emerald-400">{detailed.exercises.completed}/{detailed.exercises.total}</p>
                  <p className="text-[10px] text-gray-400">Practice</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                  <p className="text-xs font-bold text-purple-400">{detailed.quizzes.completed}/{detailed.quizzes.total}</p>
                  <p className="text-[10px] text-gray-400">Quizzes</p>
                </div>
              </div>
            )}
          </div>

          <div className="py-1">
            {modules.map((mod, mi) => {
              const modLessons = mod.lessons || [];
              if (modLessons.length === 0) return null;
              const modCompleted = moduleCompletedCount(modLessons);
              const modTotal = modLessons.length;
              const isExpanded = expandedModules[mod.id];
              const status = getModuleStatus(mi, mod);
              const locked = isModuleLocked(mi);
              const mp = moduleProgress.find((m: any) => m.id === mod.id);
              const pct = mp ? mp.percentage : Math.round((modCompleted / Math.max(modTotal,1))*100);

              return (
                <div key={mod.id} className={locked ? 'opacity-60' : ''}>
                  <button
                    onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }))}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-800/50 transition-colors text-left"
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" /> : <ChevronUp className="w-3 h-3 text-gray-400 shrink-0" />}
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${status.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' : status.color === 'blue' ? 'bg-blue-500/20 text-blue-400' : locked ? 'bg-gray-700 text-gray-400' : 'bg-gray-800 text-gray-400'}`}>
                      <status.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{mod.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden max-w-[80px]">
                          <div className={`h-1 rounded-full transition-all ${status.color === 'emerald' ? 'bg-emerald-500' : status.color === 'blue' ? 'bg-blue-500' : 'bg-gray-600'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{modCompleted}/{modTotal} • {status.label}</span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && modLessons.map((lesson, li) => {
                    let calculatedFlatIdx = 0;
                    for (let i = 0; i < mi; i++) calculatedFlatIdx += (modules[i].lessons || []).length;
                    calculatedFlatIdx += li;

                    const isCurrent = calculatedFlatIdx === currentLessonIndex;
                    const isLCompleted = lessonProgress[lesson.id];
                    const watchPos = watchPosition[lesson.id] || 0;
                    const isBookmarked = bookmarkedLessons[lesson.id];

                    return (
                      <div key={lesson.id} className={`flex items-center gap-0 transition-colors ${isCurrent ? 'bg-blue-500/10 border-l-2 border-blue-500' : locked ? 'border-l-2 border-transparent bg-gray-800/20' : 'hover:bg-gray-800/30 border-l-2 border-transparent'}`}>
                        <button
                          onClick={() => { if (!isCurrent) goToLesson(calculatedFlatIdx); }}
                          disabled={locked}
                          className={`flex-1 flex items-center gap-2 py-2 px-3 min-w-0 text-left ${locked ? 'cursor-not-allowed' : ''}`}
                        >
                          {locked ? (
                            <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          ) : isLCompleted ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <PlayCircle className={`w-3.5 h-3.5 shrink-0 ${lesson.is_free ? 'text-blue-400' : 'text-gray-400'}`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs truncate ${isCurrent ? 'text-white font-medium' : locked ? 'text-gray-500' : 'text-gray-400'}`}>{lesson.title}</p>
                            {watchPos > 0 && !isLCompleted && !locked && (
                              <div className="w-full bg-gray-800 rounded-full h-0.5 mt-1">
                                <div className="bg-blue-500 h-0.5 rounded-full" style={{ width: `${Math.min((watchPos / 600) * 100, 100)}%` }} />
                              </div>
                            )}
                          </div>
                        </button>
                        {!locked && (
                          <button onClick={() => setBookmarkedLessons(prev => ({ ...prev, [lesson.id]: !prev[lesson.id] }))} className="p-1.5 shrink-0 hover:text-yellow-400 transition-colors" title={isBookmarked ? 'Remove bookmark' : 'Bookmark lesson'}>
                            {isBookmarked ? <BookmarkCheck className="w-3 h-3 text-yellow-400" /> : <Bookmark className="w-3 h-3 text-gray-400" />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-black" style={{ maxHeight: '55vh' }}>
            <VideoPlayer
              videoUrl={currentLesson?.video_url || null}
              lessonId={currentLesson?.id || null}
              courseId={course?.id}
              title={currentLesson?.title}
              description={currentLesson?.description}
              playbackSpeed={playbackSpeed}
              initialPosition={currentLesson ? (watchPosition[currentLesson.id] || 0) : 0}
              onProgress={handleWatchProgress}
              onPositionUpdate={handlePositionUpdate}
              onSpeedChange={setPlaybackSpeed}
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-gray-900 border-b border-gray-800 flex px-2 sm:px-4 shrink-0 overflow-x-auto scrollbar-hide">
              {TAB_CONFIG.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? 'text-blue-400 border-blue-500 bg-blue-500/5' : 'text-gray-400 border-transparent hover:text-gray-300'}`}
                >
                  <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                  {tab.key === 'challenge' && challenges.length > 0 && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  {tab.key === 'quiz' && lessonQuiz && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-purple-500" />}
                  {tab.key === 'projects' && projects.length > 0 && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-orange-500" />}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-900/50 p-4">
              {activeTab === 'notes' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-sm font-medium flex items-center gap-2"><PenLine className="w-4 h-4 text-primary-400" /> Your Notes</h3>
                    {saveStatus && <span className={`text-xs ${saveStatus === 'saved' ? 'text-emerald-400' : 'text-gray-400'}`}>{saveStatus === 'saving' ? 'Saving...' : 'Saved ✓'}</span>}
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
                    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-800 bg-gray-900/50">
                      {[
                        { icon: Bold, action: () => editor?.chain().focus().toggleBold().run(), isActive: editor?.isActive('bold') },
                        { icon: Italic, action: () => editor?.chain().focus().toggleItalic().run(), isActive: editor?.isActive('italic') },
                        { icon: Underline, action: () => editor?.chain().focus().toggleUnderline().run(), isActive: editor?.isActive('underline') },
                        { icon: Highlighter, action: () => editor?.chain().focus().toggleHighlight().run(), isActive: editor?.isActive('highlight') },
                      ].map((btn, i) => (
                        <button key={i} onClick={btn.action}
                          className={`p-1.5 rounded transition-colors ${btn.isActive ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        >
                          <btn.icon className="w-3.5 h-3.5" />
                        </button>
                      ))}
                      <span className="w-px h-4 bg-gray-700 mx-1" />
                      {[
                        { icon: Undo, action: () => editor?.chain().focus().undo().run(), disabled: !editor?.can().undo() },
                        { icon: Redo, action: () => editor?.chain().focus().redo().run(), disabled: !editor?.can().redo() },
                      ].map((btn, i) => (
                        <button key={i} onClick={btn.action} disabled={btn.disabled}
                          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <btn.icon className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                    <EditorContent editor={editor} className="prose prose-invert max-w-none text-sm text-gray-200 p-3 min-h-[160px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[120px]" />
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <Brain className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-400">Tip: Take notes as you learn — they auto-save and help you retain <span className="text-blue-300 font-medium">concepts before practice</span>.</p>
                  </div>
                </div>
              )}

              {activeTab === 'quiz' && (
                <div className="space-y-3">
                  {lessonQuiz ? <LessonQuiz quiz={lessonQuiz} /> : (
                    <div className="text-center py-8">
                      <HelpCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">No quiz for this lesson.</p>
                      <p className="text-gray-500 text-xs mt-1">Quizzes appear where assessment is needed in your practical path.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="space-y-4">
                  {currentLesson?.description && (
                    <div className="rounded-xl bg-gray-800/50 border border-gray-700/50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-white">Lesson Summary</span>
                        </div>
                        <div className="flex bg-gray-900 rounded-lg p-0.5">
                          <button onClick={() => setResourceView('formatted')} className={`px-3 py-1 text-xs rounded-md transition-colors ${resourceView === 'formatted' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>Formatted</button>
                          <button onClick={() => setResourceView('plain')} className={`px-3 py-1 text-xs rounded-md transition-colors ${resourceView === 'plain' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>Plain</button>
                        </div>
                      </div>
                      <div className="p-4">
                        {resourceView === 'formatted' ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{currentLesson?.description}</p>
                          </div>
                        ) : (
                          <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap bg-gray-900/50 p-3 rounded-lg">{currentLesson?.description}</pre>
                        )}
                      </div>
                    </div>
                  )}

                  {resources.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"><Download className="w-4 h-4" /> Downloadable Resources</h4>
                      <div className="space-y-2">
                        {resources.map((res: any) => (
                          <a key={res.id} href={res.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors">
                            <Download className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-white truncate">{res.title}</p>
                              {res.file_type && <p className="text-xs text-gray-400">{res.file_type}</p>}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {!currentLesson?.description && resources.length === 0 && (
                    <p className="text-gray-400 text-sm">No resources available for this lesson.</p>
                  )}
                </div>
              )}

              {activeTab === 'challenge' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-white text-sm font-medium">Practice Exercise</h3>
                    <Badge variant="success" size="sm" className="ml-auto">Learn → Practice</Badge>
                  </div>
                  {challenges.length === 0 ? (
                    <div className="text-center py-8 rounded-xl border-2 border-dashed border-gray-800 bg-gray-900/30">
                      <Code className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No practice exercise for this lesson.</p>
                      <p className="text-gray-500 text-xs mt-1">Practice tasks will appear here to reinforce the concept.</p>
                    </div>
                  ) : challenges.map((ch: any) => (
                    <ChallengeCard key={ch.id} challenge={ch} />
                  ))}
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-orange-400" />
                    <h3 className="text-white text-sm font-medium">Course Projects</h3>
                    <Badge variant="warning" size="sm" className="ml-auto">{projects.length} project{projects.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  {projects.length === 0 ? (
                    <div className="text-center py-8 rounded-xl border-2 border-dashed border-gray-800 bg-gray-900/30">
                      <Target className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No projects assigned to this course yet.</p>
                      <p className="text-gray-500 text-xs mt-1">Projects help you Build → Prove your skills with real-world deliverables.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projects.map((proj: any) => {
                        const sub = projectSubmissions[proj.id];
                        const status = sub?.status || 'not-started';
                        const statusColor: Record<string, string> = {
                          'graded': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                          'submitted': 'bg-warning-500/20 text-warning-400 border-warning-500/30',
                          'not-started': 'bg-gray-700/50 text-gray-400 border-gray-600',
                        };
                        return (
                          <div key={proj.id} className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-medium text-sm">{proj.title}</h4>
                                <p className="text-gray-400 text-xs mt-1 line-clamp-3 whitespace-pre-wrap">{proj.description}</p>
                                {proj.due_date && <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Due {new Date(proj.due_date).toLocaleDateString()}</p>}
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold border ${statusColor[status] || statusColor['not-started']}`}>
                                {status === 'graded' ? `Graded: ${sub?.grade ?? ''}/${proj.max_score}` : status === 'submitted' ? 'Submitted' : 'Not Started'}
                              </span>
                            </div>
                            <div className="mt-3 p-3 rounded-lg bg-gray-900/50 border border-gray-800">
                              <p className="text-xs font-medium text-gray-300 mb-2">Deliverables</p>
                              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                                <li>GitHub Repository URL</li>
                                <li>Live Deployment URL (if applicable)</li>
                                <li>README with setup instructions</li>
                                <li>Screenshots (optional)</li>
                              </ul>
                            </div>
                            {sub?.feedback && (
                              <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <p className="text-xs font-medium text-blue-300 mb-1">Instructor Feedback</p>
                                <p className="text-xs text-gray-300">{sub.feedback}</p>
                                {sub.grade != null && <p className="text-xs text-white mt-1 font-medium">Score: {sub.grade}/{proj.max_score}</p>}
                              </div>
                            )}
                            <ProjectSubmitForm project={proj} submitted={!!sub && status !== 'not-started'} onSubmitted={() => {
                              api.get('/student/assignments?page=1&limit=100').then(r => {
                                const m: Record<string, any> = {};
                                (r.data.data || []).forEach((a: any) => { m[a.id] = a; });
                                setProjectSubmissions(m);
                              }).catch(()=>{});
                              api.get(`/progress/detailed?courseId=${course?.id}`).then(r=>{ if(r.data.data) setDetailed(r.data.data); }).catch(()=>{});
                            }} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'announcements' && (
                <div className="space-y-3">
                  <h3 className="text-white text-sm font-medium flex items-center gap-2"><Megaphone className="w-4 h-4 text-blue-400" /> Course Announcements</h3>
                  {announcements.length === 0 ? (
                    <p className="text-gray-400 text-sm">No announcements for this course yet.</p>
                  ) : announcements.map((ann: any) => (
                    <div key={ann.id} className="p-4 rounded-xl bg-gray-800/50 border-l-2 border-blue-500">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-white text-sm font-medium">{ann.title}</h4>
                        <span className="text-gray-400 text-xs">{new Date(ann.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-blue-400 mb-2">{ann.instructor_name}</p>
                      <p className="text-gray-400 text-sm whitespace-pre-wrap">{ann.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-sm font-medium flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-400" /> Practical Progress</h3>
                  </div>

                  {loadingAnalytics && !analytics && <Loader />}

                  {detailed && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <GlassCard className="p-3 text-center">
                        <p className="text-2xl font-bold text-white">{detailed.lessons.completed}/{detailed.lessons.total}</p>
                        <p className="text-xs text-gray-400 mt-1">Lessons</p>
                        <ProgressBar value={detailed.lessons.total ? (detailed.lessons.completed/detailed.lessons.total)*100 : 0} size="sm" className="mt-2" />
                      </GlassCard>
                      <GlassCard className="p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-400">{detailed.exercises.completed}/{detailed.exercises.total}</p>
                        <p className="text-xs text-gray-400 mt-1">Exercises</p>
                        <ProgressBar value={detailed.exercises.total ? (detailed.exercises.completed/detailed.exercises.total)*100 : 0} size="sm" color="bg-gradient-to-r from-emerald-500 to-teal-500" className="mt-2" />
                      </GlassCard>
                      <GlassCard className="p-3 text-center">
                        <p className="text-2xl font-bold text-purple-400">{detailed.quizzes.completed}/{detailed.quizzes.total}</p>
                        <p className="text-xs text-gray-400 mt-1">Quizzes</p>
                        <ProgressBar value={detailed.quizzes.total ? (detailed.quizzes.completed/detailed.quizzes.total)*100 : 0} size="sm" color="bg-gradient-to-r from-purple-500 to-pink-500" className="mt-2" />
                      </GlassCard>
                      <GlassCard className="p-3 text-center">
                        <p className="text-2xl font-bold text-orange-400">{detailed.projects.completed}/{detailed.projects.total}</p>
                        <p className="text-xs text-gray-400 mt-1">Projects</p>
                        <ProgressBar value={detailed.projects.total ? (detailed.projects.completed/detailed.projects.total)*100 : 0} size="sm" color="bg-gradient-to-r from-orange-500 to-red-500" className="mt-2" />
                      </GlassCard>
                    </div>
                  )}

                  {analytics && (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <GlassCard className="p-3 text-center">
                          <p className="text-2xl font-bold text-white">{analytics.lessons.completionRate}%</p>
                          <p className="text-xs text-gray-400 mt-1">Completion</p>
                        </GlassCard>
                        <GlassCard className="p-3 text-center">
                          <p className="text-2xl font-bold text-white">{analytics.lessons.completed}/{analytics.lessons.total}</p>
                          <p className="text-xs text-gray-400 mt-1">Lessons</p>
                        </GlassCard>
                        <GlassCard className="p-3 text-center">
                          <p className="text-2xl font-bold text-white">{analytics.timeSpent.totalHours}h</p>
                          <p className="text-xs text-gray-400 mt-1">Time Spent</p>
                        </GlassCard>
                        <GlassCard className="p-3 text-center">
                          <p className="text-2xl font-bold text-white">{analytics.quizzes.averageScore}%</p>
                          <p className="text-xs text-gray-400 mt-1">Quiz Avg</p>
                        </GlassCard>
                      </div>

                      <GlassCard className="p-4">
                        <h4 className="text-white text-sm font-medium mb-3 flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-blue-400" /> Weekly Activity</h4>
                        <div className="flex items-end gap-1.5 h-24">
                          {analytics.weeklyActivity.map((day) => {
                            const maxLessons = Math.max(...analytics.weeklyActivity.map(d => d.lessons), 1);
                            const height = Math.max((day.lessons / maxLessons) * 100, 4);
                            return (
                              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] text-gray-400">{day.lessons}</span>
                                <div className="w-full rounded-sm bg-blue-500/40 transition-all" style={{ height: `${height}%`, minHeight: '4px' }} />
                                <span className="text-[10px] text-gray-400">{day.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </GlassCard>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <GlassCard className="p-3">
                          <h4 className="text-white text-xs font-medium mb-2 flex items-center gap-1.5"><Brain className="w-3 h-3 text-emerald-400" /> Assignments</h4>
                          <p className="text-sm text-gray-400">Submitted: <span className="text-white font-medium">{analytics.assignments.submitted}</span></p>
                          <p className="text-sm text-gray-400">Avg Score: <span className="text-white font-medium">{analytics.assignments.averageScore}%</span></p>
                        </GlassCard>
                        <GlassCard className="p-3">
                          <h4 className="text-white text-xs font-medium mb-2 flex items-center gap-1.5"><Code className="w-3 h-3 text-purple-400" /> Challenges</h4>
                          <p className="text-sm text-gray-400">Submitted: <span className="text-white font-medium">{analytics.challenges.submitted}</span></p>
                          <p className="text-sm text-gray-400">Passed: <span className="text-white font-medium">{analytics.challenges.passed}</span></p>
                          <p className="text-sm text-gray-400">Avg Score: <span className="text-white font-medium">{analytics.challenges.averageScore}%</span></p>
                        </GlassCard>
                      </div>
                    </>
                  )}

                  {!loadingAnalytics && !analytics && !detailed && (
                    <button onClick={async () => {
                      setLoadingAnalytics(true);
                      try { const { data } = await api.get(`/student/courses/${slug}/analytics`); if (data.success) setAnalytics(data.data); } catch { toast.error('Failed to load analytics'); } finally { setLoadingAnalytics(false); }
                    }} className="w-full py-8 border-2 border-dashed border-gray-800 rounded-xl text-gray-400 text-sm hover:border-gray-700 transition-colors">
                      Load detailed analytics
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="bg-gray-900 border-t border-gray-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => goToLesson(currentLessonIndex - 1)} disabled={currentLessonIndex === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:inline">{currentLessonIndex + 1} / {totalLessons} • {currentModule?.title}</span>
              <span className="text-xs text-gray-400 sm:hidden">{currentLessonIndex + 1}/{totalLessons}</span>
              <Button variant={lessonProgress[currentLesson?.id || ''] ? 'secondary' : 'primary'} size="sm" onClick={markCompleted} disabled={!currentLesson}
                className={lessonProgress[currentLesson?.id || ''] ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                {lessonProgress[currentLesson?.id || ''] ? <><CheckCircle className="w-4 h-4 mr-1" /> Completed</> : <><CheckCircle className="w-4 h-4 mr-1" /> Mark Complete</>}
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => goToLesson(currentLessonIndex + 1)} disabled={currentLessonIndex >= totalLessons - 1}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* XP Popup */}
      <AnimatePresence>
        {showXpPopup && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/40 shadow-lg shadow-yellow-500/20">
              <span className="text-yellow-400 font-bold text-lg">+10 XP</span>
              <CheckCircle className="w-4 h-4 text-yellow-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Celebration */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCompletion(false)}>
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: 'spring', damping: 15 }} className="bg-gray-900 rounded-2xl p-8 text-center max-w-sm mx-4 border border-emerald-500/30 shadow-2xl shadow-emerald-500/10" onClick={e => e.stopPropagation()}>
              <motion.div animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }} transition={{ duration: 0.6 }}>
                <PartyPopper className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Congratulations!</h2>
              <p className="text-gray-400 mb-2">You completed all lessons in <span className="text-emerald-400 font-semibold">{course?.title}</span></p>
              <p className="text-sm text-gray-400 mb-6">Great dedication! Keep up the amazing work.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowCompletion(false)}>Continue</Button>
                <Link to="/student/certificates"><Button variant="outline">View Certificate</Button></Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

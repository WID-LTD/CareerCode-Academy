import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle, XCircle, Archive, Star, Trash2, Eye, AlertCircle,
  Loader2, ChevronDown, ChevronUp, Send, Clock, FileText, X, Plus, Edit3,
  Code, BookOpen,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAdminStore } from '@/store/adminStore';
import { optimizeImageUrl } from '@/lib/cloudinary';
import api from '@/lib/axios';

const TABS = ['all', 'draft', 'pending_review', 'published', 'rejected', 'archived'];
const CATEGORIES = ['all', 'Web Development', 'Data Science', 'Design', 'Mobile', 'DevOps', 'AI/ML', 'Cloud', 'Cybersecurity'];

export default function AdminCourses() {
  const { courses, isLoading, error, fetchCourses, createCourse, updateCourse, approveCourse, rejectCourse, archiveCourse, featureCourse, deleteCourse } = useAdminStore();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{ courseId: string; action: 'approve' | 'reject' } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const [courseModal, setCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', price: 0, category: 'Web Development',
    level: 'beginner' as string, duration: 1, thumbnail: '', status: 'draft' as string,
    instructor_id: '', learning_outcomes: '',
  });
  const [instructorSearch, setInstructorSearch] = useState('');
  const [instructorResults, setInstructorResults] = useState<any[]>([]);
  const [searchingInstructors, setSearchingInstructors] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<any | null>(null);

  // Challenge management
  const { fetchChallengesForCourse, createChallenge, updateChallenge, deleteChallenge: deleteChallengeAction } = useAdminStore();
  const [challengeModal, setChallengeModal] = useState(false);
  const [challengeCourseId, setChallengeCourseId] = useState<string | null>(null);
  const [challengeCourseTitle, setChallengeCourseTitle] = useState('');
  const [challengeLessons, setChallengeLessons] = useState<any[]>([]);
  const [challengeLessonChallenges, setChallengeLessonChallenges] = useState<Record<string, any[]>>({});
  const [challengeFormLessonId, setChallengeFormLessonId] = useState<string | null>(null);
  const [challengeFormData, setChallengeFormData] = useState({
    title: '', instructions: '', starterCode: '', expectedOutput: '', testCases: '',
    language: 'javascript', difficulty: 'easy',
  });
  const [challengeFormOpen, setChallengeFormOpen] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [savingChallenge, setSavingChallenge] = useState(false);

  const openChallengeManager = async (courseId: string, courseTitle: string) => {
    setChallengeCourseId(courseId);
    setChallengeCourseTitle(courseTitle);
    setChallengeModal(true);
    try {
      const { data } = await api.get(`/modules/course/${courseId}`);
      let allLessons: any[] = [];
      for (const mod of (data.data || data || [])) {
        const lRes = await api.get(`/lessons?courseId=${courseId}&moduleId=${mod.id}`);
        const lessons = lRes.data.data || lRes.data || [];
        allLessons = [...allLessons, ...lessons.map((l: any) => ({ ...l, module_title: mod.title }))];
      }
      setChallengeLessons(allLessons);
      const challenges = await fetchChallengesForCourse(courseId);
      const byLesson: Record<string, any[]> = {};
      for (const ch of challenges) {
        if (!byLesson[ch.lesson_id]) byLesson[ch.lesson_id] = [];
        byLesson[ch.lesson_id].push(ch);
      }
      setChallengeLessonChallenges(byLesson);
    } catch {
      setChallengeLessons([]);
    }
  };

  const openChallengeForm = (lessonId: string, existing?: any) => {
    setChallengeFormLessonId(lessonId);
    if (existing) {
      setChallengeFormData({
        title: existing.title || '',
        instructions: existing.instructions || '',
        starterCode: existing.starter_code || '',
        expectedOutput: existing.expected_output || '',
        testCases: Array.isArray(existing.test_cases) ? existing.test_cases.map((tc: any) => `${tc.input}|${tc.expected}`).join('\n') : '',
        language: existing.language || 'javascript',
        difficulty: existing.difficulty || 'easy',
      });
      setEditingChallengeId(existing.id);
    } else {
      setChallengeFormData({ title: '', instructions: '', starterCode: '', expectedOutput: '', testCases: '', language: 'javascript', difficulty: 'easy' });
      setEditingChallengeId(null);
    }
    setChallengeFormOpen(true);
  };

  const handleSaveChallenge = async () => {
    if (!challengeFormLessonId || !challengeFormData.title.trim()) return;
    setSavingChallenge(true);
    try {
      const testCases = challengeFormData.testCases
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const sep = line.includes('|') ? '|' : ',';
          const parts = line.split(sep);
          return { input: parts[0]?.trim() || '', expected: parts[1]?.trim() || '' };
        });

      const payload = {
        lessonId: challengeFormLessonId,
        title: challengeFormData.title,
        instructions: challengeFormData.instructions,
        starterCode: challengeFormData.starterCode,
        expectedOutput: challengeFormData.expectedOutput,
        testCases,
        language: challengeFormData.language,
        difficulty: challengeFormData.difficulty,
      };

      if (editingChallengeId) {
        await updateChallenge(editingChallengeId, payload);
      } else {
        await createChallenge(payload);
      }

      if (challengeCourseId) {
        const challenges = await fetchChallengesForCourse(challengeCourseId);
        const byLesson: Record<string, any[]> = {};
        for (const ch of challenges) {
          if (!byLesson[ch.lesson_id]) byLesson[ch.lesson_id] = [];
          byLesson[ch.lesson_id].push(ch);
        }
        setChallengeLessonChallenges(byLesson);
      }

      setChallengeFormOpen(false);
    } catch {
      // error handled by store
    } finally {
      setSavingChallenge(false);
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Delete this challenge permanently?')) return;
    try {
      await deleteChallengeAction(challengeId);
      if (challengeCourseId) {
        const challenges = await fetchChallengesForCourse(challengeCourseId);
        const byLesson: Record<string, any[]> = {};
        for (const ch of challenges) {
          if (!byLesson[ch.lesson_id]) byLesson[ch.lesson_id] = [];
          byLesson[ch.lesson_id].push(ch);
        }
        setChallengeLessonChallenges(byLesson);
      }
    } catch {}
  };

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filtered = courses
    .filter((c) => tab === 'all' || c.status === tab)
    .filter((c) => category === 'all' || c.category === category)
    .filter((c) => !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.instructor?.name?.toLowerCase().includes(search.toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    const aVal = (a as any)[sortField];
    const bVal = (b as any)[sortField];
    if (!aVal || !bVal) return 0;
    return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });

  const statusBadge = (status: string) => {
    const map: Record<string, any> = {
      draft: 'default',
      pending_review: 'warning',
      approved: 'info',
      published: 'success',
      rejected: 'danger',
      archived: 'warning',
    };
    return <Badge variant={map[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="w-3 h-3" />;
      case 'pending_review': return <Clock className="w-3 h-3" />;
      case 'published': return <CheckCircle className="w-3 h-3" />;
      case 'rejected': return <XCircle className="w-3 h-3" />;
      case 'archived': return <Archive className="w-3 h-3" />;
      default: return null;
    }
  };

  const nextStatus = (status: string): string[] => {
    const transitions: Record<string, string[]> = {
      draft: ['pending_review'],
      pending_review: ['published', 'rejected'],
      approved: ['published'],
      published: ['archived'],
      archived: ['draft'],
      rejected: ['draft'],
    };
    return transitions[status] || [];
  };

  const handleAction = async (type: string, courseId: string) => {
    setActionLoading(courseId);
    try {
      if (type === 'approve') {
        setReviewModal({ courseId, action: 'approve' });
        return;
      }
      if (type === 'reject') {
        setReviewModal({ courseId, action: 'reject' });
        return;
      }
      if (type === 'archive') await archiveCourse(courseId);
      else if (type === 'submit-review') {
        if (!confirm('Submit this course for review?')) return;
      }
      else if (type === 'revert-draft') {
        if (!confirm('Revert this course to draft?')) return;
      }
      else if (type === 'feature') await featureCourse(courseId);
      else if (type === 'delete') {
        if (!confirm('Delete this course permanently?')) return;
        await deleteCourse(courseId);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewModal) return;
    setActionLoading(reviewModal.courseId);
    try {
      if (reviewModal.action === 'approve') {
        await approveCourse(reviewModal.courseId);
      } else {
        await rejectCourse(reviewModal.courseId, reviewNotes);
      }
      setReviewModal(null);
      setReviewNotes('');
    } finally {
      setActionLoading(null);
    }
  };

  const openCourseModal = (course?: any) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        title: course.title || '',
        description: course.description || '',
        price: course.price || 0,
        category: course.category || 'Web Development',
        level: course.level || 'beginner',
        duration: course.duration || 1,
        thumbnail: course.thumbnail || '',
        status: course.status || 'draft',
        instructor_id: course.instructor_id || '',
        learning_outcomes: (course.learning_outcomes || []).join('\n'),
      });
      setSelectedInstructor(course.instructor_id ? { id: course.instructor_id, name: course.instructor?.name } : null);
      setInstructorSearch(course.instructor?.name || '');
    } else {
      setEditingCourse(null);
      setFormData({ title: '', description: '', price: 0, category: 'Web Development', level: 'beginner', duration: 1, thumbnail: '', status: 'draft', instructor_id: '', learning_outcomes: '' });
      setInstructorSearch('');
      setSelectedInstructor(null);
    }
    setCourseModal(true);
  };

  const handleSaveCourse = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !selectedInstructor) return;
    setSavingCourse(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        duration: Number(formData.duration),
        instructor_id: selectedInstructor.id,
        learning_outcomes: formData.learning_outcomes.split('\n').filter(Boolean),
      };
      if (editingCourse) {
        await updateCourse(editingCourse._id || editingCourse.id, payload);
      } else {
        await createCourse(payload);
      }
      setCourseModal(false);
    } catch { /* error shown by store */ }
    setSavingCourse(false);
  };

  useEffect(() => {
    if (!courseModal || !instructorSearch.trim() || selectedInstructor) {
      setInstructorResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingInstructors(true);
      try {
        const { data } = await api.get(`/admin/users?search=${encodeURIComponent(instructorSearch)}&role=instructor&limit=10`);
        setInstructorResults(data.data || []);
      } catch { /* ignore */ }
      setSearchingInstructors(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [instructorSearch, courseModal, selectedInstructor]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Courses</h1>
          <p className="text-gray-500 mt-1">Moderate and manage all courses.</p>
          <p className="text-xs text-gray-400 mt-0.5">Status lifecycle: Draft → Pending Review → Published/Rejected → Archived</p>
        </div>
        <Button onClick={() => openCourseModal()}>
          <Plus size={16} className="mr-1" /> Add Course
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</p>
          <Button size="sm" onClick={() => fetchCourses()}>Retry</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search courses or instructor..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize whitespace-nowrap ${tab === t ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
        <select
          value={category} onChange={(e) => setCategory(e.target.value)}
          className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm border-0 outline-none"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && courses.length === 0 && (
          <div className="md:col-span-3 text-center py-16 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
            Loading courses...
          </div>
        )}
        {!isLoading && sorted.length === 0 && (
          <div className="md:col-span-3 text-center py-16 text-gray-400">No courses found.</div>
        )}
        {sorted.map((course) => (
          <motion.div key={course._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="p-0 overflow-hidden" hover>
              {course.thumbnail && (
                <div className="relative">
                  <img src={optimizeImageUrl(course.thumbnail, 400, 200)} alt={course.title} className="w-full h-36 object-cover" />
                  {course.is_featured && (
                    <div className="absolute top-2 right-2 bg-amber-400 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-white" /> Featured
                    </div>
                  )}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {statusIcon(course.status)}
                    {statusBadge(course.status)}
                  </div>
                  {!course.thumbnail && course.is_featured && (
                    <Badge variant="default"><Star className="w-3 h-3 mr-0.5 inline fill-amber-400 text-amber-400" /> Featured</Badge>
                  )}
                </div>
                <h3 className="font-semibold text-sm leading-snug mb-1 line-clamp-2">{course.title}</h3>
                <p className="text-xs text-gray-500 mb-1">{course.instructor?.name} · {course.category}</p>
                <p className="text-xs text-gray-400 mb-3 line-clamp-2">{course.description}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <span>{course.enrollmentCount || 0} enrolled</span>
                  <span>·</span>
                  <span>${course.price || 0}</span>
                  <span>·</span>
                  <span className="capitalize">{course.level}</span>
                </div>
                {course.review_notes && (
                  <div className="mb-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 text-xs text-amber-700 dark:text-amber-400">
                    <span className="font-semibold">Review notes: </span>{course.review_notes}
                  </div>
                )}
                <div className="flex gap-1.5 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => openCourseModal(course)}>
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(`/courses/${course._id}`, '_blank')}>
                    <Eye className="w-3 h-3" />
                  </Button>
                  {nextStatus(course.status).map((ns) => {
                    if (ns === 'published') {
                      return (
                        <Button key={ns} size="sm" variant="primary" onClick={() => handleAction('approve', course._id)} disabled={actionLoading === course._id}>
                          {actionLoading === course._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Publish
                        </Button>
                      );
                    }
                    if (ns === 'rejected') {
                      return (
                        <Button key={ns} size="sm" variant="danger" onClick={() => handleAction('reject', course._id)} disabled={actionLoading === course._id}>
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                      );
                    }
                    if (ns === 'pending_review') {
                      return (
                        <Button key={ns} size="sm" variant="outline" onClick={() => handleAction('submit-review', course._id)} disabled={actionLoading === course._id}>
                          <Send className="w-3 h-3" /> Submit
                        </Button>
                      );
                    }
                    if (ns === 'draft') {
                      return (
                        <Button key={ns} size="sm" variant="outline" onClick={() => handleAction('revert-draft', course._id)} disabled={actionLoading === course._id}>
                          <FileText className="w-3 h-3" /> Draft
                        </Button>
                      );
                    }
                    if (ns === 'archived') {
                      return (
                        <Button key={ns} size="sm" variant="ghost" onClick={() => handleAction('archive', course._id)} disabled={actionLoading === course._id}>
                          <Archive className="w-3 h-3" /> Archive
                        </Button>
                      );
                    }
                    return null;
                  })}
                  <Button size="sm" variant="ghost" onClick={() => openChallengeManager(course._id, course.title)} title="Manage Challenges">
                    <Code className="w-3 h-3 text-purple-500" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleAction('feature', course._id)} disabled={actionLoading === course._id}>
                    <Star className={`w-3 h-3 ${course.is_featured ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleAction('delete', course._id)} disabled={actionLoading === course._id}>
                    <Trash2 className="w-3 h-3 text-danger-500" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {reviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setReviewModal(null); setReviewNotes(''); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold capitalize">{reviewModal.action} Course</h2>
                <button onClick={() => { setReviewModal(null); setReviewNotes(''); }} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                {reviewModal.action === 'approve'
                  ? 'Publishing this course will make it visible to all students. Add any review notes below.'
                  : 'Rejecting will move the course back to draft. Provide feedback to the instructor.'}
              </p>
              <textarea
                placeholder="Review notes (optional)..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => { setReviewModal(null); setReviewNotes(''); }}>Cancel</Button>
                <Button
                  variant={reviewModal.action === 'approve' ? 'primary' : 'danger'}
                  onClick={handleReviewSubmit}
                  disabled={actionLoading === reviewModal.courseId}
                >
                  {actionLoading === reviewModal.courseId ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {reviewModal.action === 'approve' ? 'Publish Course' : 'Reject Course'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {courseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setCourseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">{editingCourse ? 'Edit Course' : 'Add Course'}</h2>
                <button onClick={() => setCourseModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <Input label="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Course title" />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Course description..."
                    rows={4}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Price ($)" type="number" min={0} value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} />
                  <Input label="Duration (minutes)" type="number" min={1} value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50"
                    >
                      {['Web Development', 'Data Science', 'Design', 'Mobile', 'DevOps', 'AI/ML', 'Cloud', 'Cybersecurity'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Level</label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50"
                    >
                      {['beginner', 'intermediate', 'advanced'].map((l) => (
                        <option key={l} value={l} className="capitalize">{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Thumbnail URL" value={formData.thumbnail} onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })} placeholder="https://..." />
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50"
                    >
                      {['draft', 'pending_review', 'published', 'rejected', 'archived'].map((s) => (
                        <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Learning Outcomes (one per line)</label>
                  <textarea
                    value={formData.learning_outcomes}
                    onChange={(e) => setFormData({ ...formData, learning_outcomes: e.target.value })}
                    placeholder="Write each learning outcome on a new line..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instructor</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search instructor by name..."
                      value={instructorSearch}
                      onChange={(e) => { setInstructorSearch(e.target.value); setSelectedInstructor(null); setFormData({ ...formData, instructor_id: '' }); }}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                    {searchingInstructors && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  {instructorResults.length > 0 && !selectedInstructor && (
                    <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto">
                      {instructorResults.map((u: any) => (
                        <button
                          key={u.id}
                          onClick={() => { setSelectedInstructor(u); setInstructorSearch(u.name); setFormData({ ...formData, instructor_id: u.id }); setInstructorResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 border-b last:border-0"
                        >
                          <span className="font-medium">{u.name}</span>
                          <span className="text-gray-400 ml-2">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedInstructor && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Selected: {selectedInstructor.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setCourseModal(false)}>Cancel</Button>
                <Button
                  onClick={handleSaveCourse}
                  disabled={savingCourse || !formData.title.trim() || !formData.description.trim() || !selectedInstructor}
                >
                  {savingCourse ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {editingCourse ? 'Update Course' : 'Create Course'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenge Management Modal */}
      <AnimatePresence>
        {challengeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setChallengeModal(false); setChallengeFormOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Code className="w-5 h-5 text-purple-500" />
                    Challenges
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">{challengeCourseTitle}</p>
                </div>
                <button onClick={() => { setChallengeModal(false); setChallengeFormOpen(false); }} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Challenge form */}
              {challengeFormOpen && (
                <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold mb-4">{editingChallengeId ? 'Edit' : 'Add'} Challenge</h3>
                  <div className="space-y-3">
                    <Input label="Title" value={challengeFormData.title} onChange={(e) => setChallengeFormData({ ...challengeFormData, title: e.target.value })} placeholder="Challenge title" />
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instructions</label>
                      <textarea value={challengeFormData.instructions} onChange={(e) => setChallengeFormData({ ...challengeFormData, instructions: e.target.value })} rows={3} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50" placeholder="What should the student do?" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Starter Code</label>
                      <textarea value={challengeFormData.starterCode} onChange={(e) => setChallengeFormData({ ...challengeFormData, starterCode: e.target.value })} rows={4} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500/50" placeholder="// Initial code for the student" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Expected Output" value={challengeFormData.expectedOutput} onChange={(e) => setChallengeFormData({ ...challengeFormData, expectedOutput: e.target.value })} placeholder="Hello, World!" />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                        <select value={challengeFormData.language} onChange={(e) => setChallengeFormData({ ...challengeFormData, language: e.target.value })} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50">
                          {['javascript', 'python', 'java', 'cpp', 'go', 'rust', 'typescript', 'ruby', 'php', 'swift', 'kotlin', 'csharp', 'bash'].map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                        <select value={challengeFormData.difficulty} onChange={(e) => setChallengeFormData({ ...challengeFormData, difficulty: e.target.value })} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/50">
                          {['easy', 'medium', 'hard'].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Test Cases</label>
                        <textarea value={challengeFormData.testCases} onChange={(e) => setChallengeFormData({ ...challengeFormData, testCases: e.target.value })} rows={2} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-primary-500/50" placeholder="input|expected&#10;5|25" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setChallengeFormOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveChallenge} disabled={savingChallenge || !challengeFormData.title.trim()}>
                      {savingChallenge ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      {editingChallengeId ? 'Update' : 'Create'} Challenge
                    </Button>
                  </div>
                </div>
              )}

              {/* Lessons list */}
              <div className="space-y-3">
                {challengeLessons.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No lessons found for this course. Add lessons in the instructor editor first.</p>
                )}
                {challengeLessons.map((lesson) => {
                  const chs = challengeLessonChallenges[lesson.id] || [];
                  return (
                    <GlassCard key={lesson.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs text-gray-500">{lesson.module_title}</span>
                          <h4 className="text-sm font-medium">{lesson.title}</h4>
                        </div>
                        {!challengeFormOpen && (
                          <Button size="sm" variant="outline" onClick={() => openChallengeForm(lesson.id)}>
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        )}
                      </div>
                      {chs.length > 0 && (
                        <div className="space-y-1.5 mt-2">
                          {chs.map((ch: any) => (
                            <div key={ch.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-xs">
                              <div className="flex items-center gap-2">
                                <Code className="w-3 h-3 text-purple-500" />
                                <span className="font-medium">{ch.title}</span>
                                <Badge className="bg-blue-500/10 text-blue-400 text-[10px]">{ch.difficulty}</Badge>
                                <span className="text-gray-500">{ch.language}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => openChallengeForm(lesson.id, ch)}>
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteChallenge(ch.id)}>
                                  <Trash2 className="w-3 h-3 text-danger-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

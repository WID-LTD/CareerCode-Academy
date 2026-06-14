import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle, XCircle, Archive, Star, Trash2, Eye, AlertCircle,
  Loader2, ChevronDown, ChevronUp, Send, Clock, FileText, X,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAdminStore } from '@/store/adminStore';

const TABS = ['all', 'draft', 'pending_review', 'published', 'rejected', 'archived'];
const CATEGORIES = ['all', 'Web Development', 'Data Science', 'Design', 'Mobile', 'DevOps', 'AI/ML', 'Cloud', 'Cybersecurity'];

export default function AdminCourses() {
  const { courses, isLoading, error, fetchCourses, approveCourse, rejectCourse, archiveCourse, featureCourse, deleteCourse } = useAdminStore();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{ courseId: string; action: 'approve' | 'reject' } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Courses</h1>
          <p className="text-gray-500 mt-1">Moderate and manage all courses.</p>
          <p className="text-xs text-gray-400 mt-0.5">Status lifecycle: Draft → Pending Review → Published/Rejected → Archived</p>
        </div>
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
                  <img src={course.thumbnail} alt={course.title} className="w-full h-36 object-cover" />
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
    </motion.div>
  );
}

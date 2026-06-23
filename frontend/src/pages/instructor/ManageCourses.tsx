import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, BookOpen, Users, Star, Clock, Search, Megaphone, Send, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import { useInstructorStore } from '@/store/instructorStore';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export default function ManageCourses() {
  const [search, setSearch] = useState('');
  const { myCourses, isLoading, fetchMyCourses, deleteCourse } = useInstructorStore();
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<any | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    fetchMyCourses();
  }, [fetchMyCourses]);

  const filtered = myCourses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      await deleteCourse(id);
    }
  };

  const openBroadcast = (target: any | null) => {
    setBroadcastTarget(target);
    setBroadcastTitle('');
    setBroadcastMessage('');
    setBroadcastOpen(true);
  };

  const closeBroadcast = () => {
    setBroadcastOpen(false);
    setBroadcastTarget(null);
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setSending(true);
    try {
      const courseIds = broadcastTarget ? [broadcastTarget.id] : filtered.map(c => c.id);
      const { data } = await api.post('/instructor/broadcast', {
        courseIds,
        title: broadcastTitle,
        message: broadcastMessage,
      });
      if (data.success) {
        toast.success(data.message);
        closeBroadcast();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Manage Courses</h1>
          <p className="text-gray-500">Create, edit, and manage your courses.</p>
        </div>
        <div className="flex items-center gap-3">
          {myCourses.length > 0 && (
            <Button variant="outline" onClick={() => openBroadcast(null)}>
              <Megaphone className="w-4 h-4 mr-2" /> Broadcast to All
            </Button>
          )}
          <Link to="/instructor/courses/new">
            <Button icon={<Plus className="w-4 h-4" />}>New Course</Button>
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <Input icon={<Search className="w-4 h-4" />} placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : (
      <div className="space-y-3">
        {filtered.map((course, i) => (
          <motion.div
            key={course.id || course.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <GlassCard hover className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{course.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.enrollmentCount || 0} students</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {course.averageRating ? course.averageRating.toFixed(1) : 'N/A'}</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {course.lessons?.length || 0} lessons</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration} mins</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        course.published ? 'success' : 'warning'
                      } size="sm">
                        {course.published ? 'published' : 'draft'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link to={`/courses/${course.slug}`}>
                    <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />} />
                  </Link>
                  <Link to={`/instructor/courses/${course.slug}/edit`}>
                    <Button variant="ghost" size="sm" icon={<Edit className="w-4 h-4" />} />
                  </Link>
                  <Button variant="ghost" size="sm" icon={<Megaphone className="w-4 h-4 text-blue-500" />}
                    onClick={() => openBroadcast(course)}
                    title="Send message to enrolled students"
                  />
                  <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4 text-red-500" />} onClick={() => handleDelete(course.id)} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
      )}

      {/* Broadcast Modal */}
      <AnimatePresence>
        {broadcastOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeBroadcast}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-blue-500" />
                  {broadcastTarget ? `Message ${broadcastTarget.title} Students` : 'Broadcast to All Courses'}
                </h2>
                <button onClick={closeBroadcast} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                {broadcastTarget
                  ? `Send a message to all ${broadcastTarget.enrollmentCount || 0} enrolled students in "${broadcastTarget.title}".`
                  : `Send a message to all students enrolled in your ${myCourses.length} courses.`
                }
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <Input
                    placeholder="e.g. Important Update"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Message</label>
                  <textarea
                    className="w-full h-32 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
                    placeholder="Write your message to students..."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <Button variant="outline" onClick={closeBroadcast}>Cancel</Button>
                <Button variant="primary" onClick={handleBroadcast} disabled={sending || !broadcastTitle.trim() || !broadcastMessage.trim()}>
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Sending...' : `Send to ${broadcastTarget ? broadcastTarget.enrollmentCount || 'all' : 'All'} Students`}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

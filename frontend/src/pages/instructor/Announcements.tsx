import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInstructorExtendedStore } from '@/store/instructorExtendedStore';
import { useInstructorStore } from '@/store/instructorStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Megaphone, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InstructorAnnouncements() {
  const { announcements, fetchAnnouncements, createAnnouncement, isLoading } = useInstructorExtendedStore();
  const { myCourses, fetchMyCourses } = useInstructorStore();
  
  const [showForm, setShowForm] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchAnnouncements();
    if (myCourses.length === 0) fetchMyCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return toast.error('Please select a course');
    try {
      await createAnnouncement({ course_id: courseId, title, content });
      toast.success('Announcement posted successfully!');
      setShowForm(false);
      setTitle('');
      setContent('');
      setCourseId('');
    } catch (error) {
      toast.error('Failed to post announcement');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Announcements</h1>
          <p className="text-gray-500">Broadcast messages to your enrolled students.</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-5 h-5 mr-2" />
          New Announcement
        </Button>
      </div>

      {showForm && (
        <GlassCard className="p-6 mb-8 border-primary-500/30">
          <h2 className="text-lg font-semibold mb-4">Create Announcement</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Course</label>
              <select 
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <option value="" disabled>-- Select a Course --</option>
                {myCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input 
                required
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                placeholder="e.g. Welcome to Week 2!"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea 
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 resize-none"
                placeholder="Write your announcement here..."
              ></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Post Announcement</Button>
            </div>
          </form>
        </GlassCard>
      )}

      <div className="space-y-4">
        {announcements.map((ann) => (
          <GlassCard key={ann.id} className="p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"></div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/10 flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-lg">{ann.title}</h3>
                  <span className="text-xs text-gray-500">{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-sm font-medium text-primary-600 mb-3">{ann.course_title}</div>
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{ann.content}</p>
              </div>
            </div>
          </GlassCard>
        ))}

        {announcements.length === 0 && !isLoading && !showForm && (
          <div className="text-center py-12 text-gray-500">
            You haven't posted any announcements yet.
          </div>
        )}
      </div>
    </motion.div>
  );
}

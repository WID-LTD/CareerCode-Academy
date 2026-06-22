import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInstructorStore } from '@/store/instructorStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Video, Plus, Calendar, Clock, Link as LinkIcon } from 'lucide-react';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import toast from 'react-hot-toast';

export default function InstructorLiveClasses() {
  const { liveClasses, fetchLiveClasses, createLiveClass, isLoading } = useInstructorStore();
  const { myCourses, fetchMyCourses } = useInstructorStore();

  const [showForm, setShowForm] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    fetchLiveClasses();
    if (myCourses.length === 0) fetchMyCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return toast.error('Please select a course');
    try {
      await createLiveClass({
        course_id: courseId,
        title,
        description,
        meeting_url: meetingUrl,
        start_time: new Date(startTime).toISOString(),
        duration
      });
      toast.success('Live class scheduled successfully!');
      setShowForm(false);
      setCourseId('');
      setTitle('');
      setDescription('');
      setMeetingUrl('');
      setStartTime('');
      setDuration(60);
    } catch (error) {
      toast.error('Failed to schedule live class');
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Live Classes</h1>
          <p className="text-gray-500">Schedule and manage live video sessions.</p>
        </div>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-5 h-5 mr-2" />
          Schedule Session
        </Button>
      </div>

      {showForm && (
        <GlassCard className="p-6 mb-8 border-primary-500/30">
          <h2 className="text-lg font-semibold mb-4">Schedule a Live Class</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium mb-1">Session Title</label>
                <input 
                  required
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date & Time</label>
                <input 
                  required
                  type="datetime-local" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                <input 
                  required
                  type="number"
                  min={15} 
                  step={15}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Meeting Link (Zoom, Meet, etc.)</label>
                <input 
                  required
                  type="url" 
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  placeholder="https://zoom.us/j/..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                <textarea 
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 resize-none"
                ></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Schedule Class</Button>
            </div>
          </form>
        </GlassCard>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {liveClasses.map((cls) => {
          const isUpcoming = new Date(cls.start_time) > new Date();
          return (
            <GlassCard key={cls.id} className="p-6 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${isUpcoming ? 'bg-primary-50 text-primary-500 dark:bg-primary-900/20' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'} flex items-center justify-center`}>
                  <Video className="w-6 h-6" />
                </div>
                {isUpcoming ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold rounded-full">Upcoming</span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 text-xs font-semibold rounded-full">Completed</span>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1 line-clamp-1">{cls.title}</h3>
                <p className="text-sm font-medium text-primary-600 mb-4">{cls.course_title}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(cls.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4 mr-2" />
                    {new Date(cls.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({cls.duration} mins)
                  </div>
                </div>
                
                {cls.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{cls.description}</p>
                )}
              </div>
              
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
                <a 
                  href={cls.meeting_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex justify-center items-center gap-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  Join Meeting
                </a>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {liveClasses.length === 0 && !isLoading && !showForm && (
        <div className="text-center py-12 text-gray-500">
          No live classes scheduled yet.
        </div>
      )}
    </motion.div>
  );
}

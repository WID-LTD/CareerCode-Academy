import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, BookOpen, Video, Loader, Plus, X, Trash2, ExternalLink } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface Slot {
  id: string;
  title: string;
  description: string | null;
  course_id: string | null;
  course_title: string | null;
  student_id: string | null;
  student_name: string | null;
  student_email: string | null;
  student_avatar: string | null;
  start_time: string;
  end_time: string;
  meeting_url: string | null;
  status: string;
  reschedule_status?: string | null;
  reschedule_reason?: string | null;
  proposed_start_time?: string | null;
  proposed_end_time?: string | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
}

interface Course {
  id: string;
  title: string;
}

export default function InstructorMentorship() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSlot, setNewSlot] = useState({
    title: 'Mentoring Session',
    description: '',
    course_id: '',
    start_time: '',
    end_time: '',
    meeting_url: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([fetchSlots(), fetchCourses()]);
  }, []);

  async function fetchCourses() {
    try {
      const { data } = await api.get('/courses/instructor');
      setCourses(data.data || []);
    } catch {
      // courses optional
    }
  }

  async function fetchSlots() {
    setLoading(true);
    try {
      const { data } = await api.get('/instructor/mentoring-slots');
      setSlots(data.data || []);
    } catch {
      toast.error('Failed to load mentoring slots');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newSlot.start_time || !newSlot.end_time) {
      toast.error('Start and end time are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        title: newSlot.title,
        description: newSlot.description || undefined,
        start_time: newSlot.start_time,
        end_time: newSlot.end_time,
        meeting_url: newSlot.meeting_url || undefined,
      };
      if (newSlot.course_id) payload.course_id = newSlot.course_id;
      await api.post('/instructor/mentoring-slots', payload);
      toast.success('Slot created!');
      setShowCreate(false);
      setNewSlot({
        title: 'Mentoring Session',
        description: '',
        course_id: '',
        start_time: '',
        end_time: '',
        meeting_url: '',
      });
      fetchSlots();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create slot');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(slotId: string) {
    try {
      await api.delete(`/instructor/mentoring-slots/${slotId}`);
      toast.success('Slot deleted');
      fetchSlots();
    } catch {
      toast.error('Failed to delete slot');
    }
  }

  async function handleReschedule(slotId: string, approve: boolean) {
    const reason = approve ? undefined : window.prompt('Reason for declining (optional)') || undefined;
    try {
      await api.post(`/instructor/mentoring-slots/${slotId}/reschedule/${approve ? 'approve' : 'reject'}`, { reason });
      toast.success(approve ? 'Reschedule approved' : 'Reschedule declined');
      fetchSlots();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update reschedule');
    }
  }

  const bookedSlots = slots.filter((s) => s.status === 'booked');
  const availableSlots = slots.filter((s) => s.status === 'available');

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="max-w-screen-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Mentorship Slots</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your 1-on-1 mentoring availability.
            </p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
            Create Slot
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Available ({availableSlots.length})
            </h2>
            <div className="space-y-3">
              {availableSlots.length === 0 ? (
                <p className="text-gray-500 text-sm">No available slots.</p>
              ) : (
                availableSlots.map((slot) => (
                  <GlassCard key={slot.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1">{slot.title}</h4>
                        {slot.description && (
                          <p className="text-xs text-gray-500 mb-2">{slot.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(slot.start_time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Delete slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">
              Booked ({bookedSlots.length})
            </h2>
            <div className="space-y-3">
              {bookedSlots.length === 0 ? (
                <p className="text-gray-500 text-sm">No booked slots yet.</p>
              ) : (
                bookedSlots.map((slot) => (
                  <GlassCard key={slot.id} className="p-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1">{slot.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(slot.start_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                      </div>
                      {slot.reschedule_status === 'requested' && (
                        <div className="mt-2 rounded-xl border border-amber-300/50 bg-amber-500/5 p-2.5">
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Reschedule requested</p>
                          {slot.proposed_start_time && (
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Proposed: {formatDate(slot.proposed_start_time)} · {formatTime(slot.proposed_start_time)} - {formatTime(slot.proposed_end_time || slot.proposed_start_time)}
                            </p>
                          )}
                          {slot.reschedule_reason && <p className="text-[11px] text-gray-500">Reason: {slot.reschedule_reason}</p>}
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={() => handleReschedule(slot.id, true)}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => handleReschedule(slot.id, false)}>Decline</Button>
                          </div>
                        </div>
                      )}
                      {slot.student_name && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-medium text-primary-600">
                            {slot.student_name.charAt(0)}
                          </div>
                          <div className="text-xs">
                            <p className="font-medium">{slot.student_name}</p>
                            <p className="text-gray-400">{slot.student_email}</p>
                          </div>
                          {slot.meeting_url && (
                            <a
                              href={slot.meeting_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" /> Join
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Mentoring Slot">
        <div className="space-y-4">
          <Input
            label="Title"
            value={newSlot.title}
            onChange={(e) => setNewSlot({ ...newSlot, title: e.target.value })}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Description (optional)</label>
            <textarea
              rows={2}
              value={newSlot.description}
              onChange={(e) => setNewSlot({ ...newSlot, description: e.target.value })}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Course (optional)</label>
            <select
              value={newSlot.course_id}
              onChange={(e) => setNewSlot({ ...newSlot, course_id: e.target.value })}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-sm"
            >
              <option value="">No specific course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <Input
            label="Start Time"
            type="datetime-local"
            value={newSlot.start_time}
            onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
          />
          <Input
            label="End Time"
            type="datetime-local"
            value={newSlot.end_time}
            onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
          />
          <Input
            label="Meeting URL (optional)"
            type="url"
            placeholder="https://meet.google.com/..."
            value={newSlot.meeting_url}
            onChange={(e) => setNewSlot({ ...newSlot, meeting_url: e.target.value })}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Slot'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

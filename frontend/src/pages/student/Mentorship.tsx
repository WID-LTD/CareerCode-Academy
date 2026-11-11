import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, BookOpen, Video, Loader, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface Slot {
  id: string;
  instructor_name: string;
  instructor_avatar: string | null;
  course_title: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_url: string | null;
  status: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
}

function isPast(dateStr: string): boolean {
  return new Date(dateStr).getTime() < Date.now();
}

export default function StudentMentorship() {
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [mySlots, setMySlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'available' | 'mine'>('available');
  const [confirmSlot, setConfirmSlot] = useState<Slot | null>(null);
  const [booking, setBooking] = useState(false);
  const [myTab, setMyTab] = useState<'upcoming' | 'past'>('upcoming');
  const [rescheduleSlot, setRescheduleSlot] = useState<Slot | null>(null);
  const [proposedStart, setProposedStart] = useState('');
  const [proposedEnd, setProposedEnd] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function requestReschedule() {
    if (!rescheduleSlot) return;
    if (!proposedStart || !proposedEnd) { toast.error('Choose a new start and end time'); return; }
    setRescheduling(true);
    try {
      await api.post(`/student/mentoring-slots/${rescheduleSlot.id}/reschedule`, {
        proposed_start_time: new Date(proposedStart).toISOString(),
        proposed_end_time: new Date(proposedEnd).toISOString(),
        reason: rescheduleReason,
      });
      toast.success('Reschedule requested');
      setRescheduleSlot(null);
      setProposedStart('');
      setProposedEnd('');
      setRescheduleReason('');
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to request reschedule');
    } finally { setRescheduling(false); }
  }

  async function cancelBooking(slotId: string) {
    if (!confirm('Cancel this mentoring booking?')) return;
    try {
      await api.post(`/student/mentoring-slots/${slotId}/cancel`);
      toast.success('Booking cancelled');
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel booking');
    }
  }

  async function fetchData() {
    setLoading(true);
    try {
      const [availRes, mineRes] = await Promise.all([
        api.get('/student/mentoring-slots'),
        api.get('/student/my-mentoring-slots'),
      ]);
      setAvailableSlots(availRes.data.data || []);
      setMySlots(mineRes.data.data || []);
    } catch {
      toast.error('Failed to load mentoring slots');
    } finally {
      setLoading(false);
    }
  }

  async function handleBook() {
    if (!confirmSlot) return;
    setBooking(true);
    try {
      await api.post(`/student/mentoring-slots/${confirmSlot.id}/book`);
      toast.success('Slot booked!');
      setConfirmSlot(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to book slot');
    } finally {
      setBooking(false);
    }
  }

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
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Mentorship</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Book 1-on-1 mentoring sessions with your instructors.
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('available')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === 'available'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
            }`}
          >
            Available Slots ({availableSlots.length})
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === 'mine'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/20'
            }`}
          >
            My Bookings ({mySlots.length})
          </button>
        </div>

        {tab === 'available' && (
          <div className="space-y-4">
            {availableSlots.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No available slots right now.</p>
            ) : (
              availableSlots.map((slot) => (
                <GlassCard key={slot.id} className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{slot.title}</h3>
                      {slot.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{slot.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" /> {slot.instructor_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" /> {slot.course_title}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> {formatDate(slot.start_time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </span>
                      </div>
                    </div>
                    <Button onClick={() => setConfirmSlot(slot)} className="w-full sm:w-auto">Book</Button>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        )}

        {tab === 'mine' && (
          <div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMyTab('upcoming')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  myTab === 'upcoming'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/50 dark:bg-gray-800/50 text-gray-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setMyTab('past')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  myTab === 'past'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/50 dark:bg-gray-800/50 text-gray-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                }`}
              >
                Past
              </button>
            </div>

            <div className="space-y-4">
              {(() => {
                const filtered = mySlots.filter((s) =>
                  myTab === 'upcoming' ? !isPast(s.end_time) : isPast(s.end_time)
                );
                if (filtered.length === 0) {
                  return (
                    <p className="text-center text-gray-500 py-8">
                      {myTab === 'upcoming' ? 'No upcoming bookings.' : 'No past sessions.'}
                    </p>
                  );
                }
                return filtered.map((slot) => {
                  const expired = isPast(slot.end_time);
                  return (
                    <GlassCard
                      key={slot.id}
                      className={`p-5 ${expired ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{slot.title}</h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" /> {slot.instructor_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" /> {slot.course_title}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" /> {formatDate(slot.start_time)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" /> {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant={expired ? 'default' : 'primary'}
                              size="sm"
                            >
                              {expired ? 'Completed' : slot.status}
                            </Badge>
                            {expired && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <AlertCircle className="w-3 h-3" /> Past session
                              </span>
                            )}
                            {(slot as any).reschedule_status === 'requested' && <Badge variant="warning" size="sm">Reschedule requested</Badge>}
                            {(slot as any).reschedule_status === 'approved' && <Badge variant="success" size="sm">Rescheduled</Badge>}
                            {(slot as any).reschedule_status === 'rejected' && <Badge variant="danger" size="sm">Reschedule declined</Badge>}
                          </div>
                        </div>
                        {!expired && (
                          <div className="flex flex-col gap-1">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setRescheduleSlot(slot);
                              const start = new Date(slot.start_time);
                              const end = new Date(slot.end_time);
                              const toLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                              setProposedStart(toLocal(start));
                              setProposedEnd(toLocal(end));
                            }}>Reschedule</Button>
                            <Button variant="ghost" size="sm" className="text-red-400" onClick={() => cancelBooking(slot.id)}>
                              Cancel
                            </Button>
                          </div>
                        )}
                        {!expired && slot.meeting_url && (
                          <a
                            href={slot.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
                          >
                            <Video className="w-4 h-4" /> Join
                          </a>
                        )}
                      </div>
                    </GlassCard>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={!!rescheduleSlot} onClose={() => setRescheduleSlot(null)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-1">Request a new time</h2>
          <p className="text-sm text-gray-500 mb-4">Your instructor will approve or decline the request.</p>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="text-gray-500">New start</span>
              <input type="datetime-local" value={proposedStart} onChange={(e) => setProposedStart(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-gray-500">New end</span>
              <input type="datetime-local" value={proposedEnd} onChange={(e) => setProposedEnd(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-gray-500">Reason (optional)</span>
              <textarea value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setRescheduleSlot(null)}>Cancel</Button>
              <Button onClick={requestReschedule} disabled={rescheduling}>{rescheduling ? 'Sending…' : 'Send request'}</Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmSlot} onClose={() => setConfirmSlot(null)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Confirm Booking</h2>
          {confirmSlot && (
            <div className="space-y-3 text-sm">
              <p><strong>Session:</strong> {confirmSlot.title}</p>
              <p><strong>Instructor:</strong> {confirmSlot.instructor_name}</p>
              <p><strong>Date:</strong> {formatDate(confirmSlot.start_time)}</p>
              <p><strong>Time:</strong> {formatTime(confirmSlot.start_time)} - {formatTime(confirmSlot.end_time)}</p>
              <p><strong>Course:</strong> {confirmSlot.course_title}</p>
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="ghost" onClick={() => setConfirmSlot(null)}>Cancel</Button>
                <Button onClick={handleBook} disabled={booking}>
                  {booking ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </motion.div>
  );
}

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Calendar as CalendarIcon, Clock, MapPin, Video,
  Edit3, Trash2, Eye, Filter, X, ChevronDown, Users, AlertCircle,
} from 'lucide-react';
import { useCalendarStore, CalendarEvent, CalendarEventType, EVENT_TYPE_CONFIG } from '@/store/calendarStore';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';

const EVENT_TYPES = Object.keys(EVENT_TYPE_CONFIG) as CalendarEventType[];
const STATUS_OPTIONS = ['draft', 'scheduled', 'live', 'completed', 'cancelled'];
const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'students_only', label: 'Students Only' },
  { value: 'specific_program', label: 'Specific Program' },
  { value: 'specific_cohort', label: 'Specific Cohort' },
  { value: 'specific_school', label: 'Specific School' },
  { value: 'specific_community', label: 'Specific Community' },
];

export default function AdminCalendarManagement() {
  const { events, stats, fetchEvents, fetchStats, createEvent, updateEvent, deleteEvent, setSelectedEvent, selectedEvent } = useCalendarStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, []);

  const filtered = events.filter((e) => {
    if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (typeFilter && e.event_type !== typeFilter) return false;
    if (statusFilter && e.status !== statusFilter) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
    setDeleteConfirm(null);
    fetchStats();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[calc(100vh-64px)] bg-gray-950">
      <div className="px-4 sm:px-6 pt-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="gradient-text">Calendar and Events</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Create, manage, and monitor all calendar events</p>
          </div>
          <button
            onClick={() => { setEditingEvent(null); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Create Event
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'text-white' },
              { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-400' },
              { label: 'Live', value: stats.live, color: 'text-green-400' },
              { label: 'Completed', value: stats.completed, color: 'text-gray-400' },
              { label: 'Cancelled', value: stats.cancelled, color: 'text-red-400' },
              { label: 'Draft', value: stats.draft, color: 'text-yellow-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-primary-500/50"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500/50"
          >
            <option value="">All Types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{EVENT_TYPE_CONFIG[t].label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-primary-500/50"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Events Table */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Event</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Type</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Date & Time</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3 hidden xl:table-cell">RSVPs</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <CalendarIcon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No events found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((event) => {
                    const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.class;
                    const startDate = new Date(event.start_datetime);
                    return (
                      <tr key={event.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
                              <CalendarIcon className={cn('w-5 h-5', config.color)} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate max-w-[250px]">{event.title}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[250px]">
                                {event.course_title || event.location || event.description?.slice(0, 60) || 'No details'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', config.bg, config.color)}>
                            {config.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <p className="text-sm text-gray-300">
                            {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <Badge
                            variant={
                              event.status === 'live' ? 'success'
                              : event.status === 'cancelled' ? 'danger'
                              : event.status === 'completed' ? 'default'
                              : event.status === 'draft' ? 'warning'
                              : 'primary'
                            }
                            size="sm"
                          >
                            {event.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 hidden xl:table-cell">
                          <span className="text-sm text-gray-400">{event.rsvp_count || 0}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedEvent(event)}
                              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                              title="View"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => { setEditingEvent(event); setShowCreateModal(true); }}
                              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(event.id)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <EventFormModal
          event={editingEvent}
          onClose={() => { setShowCreateModal(false); setEditingEvent(null); }}
          onSave={async (input) => {
            if (editingEvent) {
              await updateEvent(editingEvent.id, input);
            } else {
              await createEvent(input);
            }
            setShowCreateModal(false);
            setEditingEvent(null);
            fetchEvents();
            fetchStats();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Delete Event</h3>
                <p className="text-gray-400 text-sm">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </motion.div>
  );
}

/* ──────────────── EVENT FORM MODAL ──────────────── */
function EventFormModal({
  event, onClose, onSave,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onSave: (input: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    event_type: event?.event_type || 'live_session',
    start_datetime: event?.start_datetime ? new Date(event.start_datetime).toISOString().slice(0, 16) : '',
    end_datetime: event?.end_datetime ? new Date(event.end_datetime).toISOString().slice(0, 16) : '',
    timezone: event?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    location: event?.location || '',
    meeting_url: event?.meeting_url || '',
    meeting_platform: event?.meeting_platform || '',
    color: event?.color || '',
    course_id: event?.course_id || '',
    instructor_id: event?.instructor_id || '',
    school_id: event?.school_id || '',
    community_id: event?.community_id || '',
    visibility: event?.visibility || 'public',
    status: event?.status || 'scheduled',
    max_attendees: event?.max_attendees?.toString() || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.start_datetime || !form.end_datetime) {
      setError('Title, start time, and end time are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        max_attendees: form.max_attendees ? parseInt(form.max_attendees) : undefined,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-gray-700/50 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{event ? 'Edit Event' : 'Create Event'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500/50"
              placeholder="Event title"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500/50 resize-none"
              placeholder="Event description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Event Type *</label>
              <select
                value={form.event_type}
                onChange={(e) => handleChange('event_type', e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500/50"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{EVENT_TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500/50"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Start *</label>
              <input
                type="datetime-local"
                value={form.start_datetime}
                onChange={(e) => handleChange('start_datetime', e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">End *</label>
              <input
                type="datetime-local"
                value={form.end_datetime}
                onChange={(e) => handleChange('end_datetime', e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500/50"
                placeholder="Physical location"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Meeting Platform</label>
              <input
                type="text"
                value={form.meeting_platform}
                onChange={(e) => handleChange('meeting_platform', e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500/50"
                placeholder="Zoom, Meet, Teams..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Meeting URL</label>
            <input
              type="url"
              value={form.meeting_url}
              onChange={(e) => handleChange('meeting_url', e.target.value)}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500/50"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Visibility</label>
              <select
                value={form.visibility}
                onChange={(e) => handleChange('visibility', e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500/50"
              >
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Max Attendees</label>
              <input
                type="number"
                value={form.max_attendees}
                onChange={(e) => handleChange('max_attendees', e.target.value)}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-primary-500/50"
                placeholder="Unlimited"
                min={0}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

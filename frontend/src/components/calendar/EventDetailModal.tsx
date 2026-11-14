import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Clock, MapPin, Video, Users, CheckCircle2,
  GraduationCap, ExternalLink, ChevronDown,
} from 'lucide-react';
import { useCalendarStore, CalendarEvent, EVENT_TYPE_CONFIG } from '@/store/calendarStore';
import { EventActions } from '@/components/calendar/EventActions';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Props {
  event: CalendarEvent;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: Props) {
  const { rsvp } = useCalendarStore();
  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.class;
  const [rsvpStatus, setRsvpStatus] = useState<string>(event.rsvp_status || '');

  const startDate = new Date(event.start_datetime);
  const endDate = new Date(event.end_datetime);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const handleRsvp = async (status: 'going' | 'maybe' | 'not_going') => {
    await rsvp(event.id, status);
    setRsvpStatus(status);
  };

  const rsvpOptions = [
    { value: 'going' as const, label: 'Going', icon: CheckCircle2, activeColor: 'bg-green-500/20 text-green-400 border-green-500/30' },
    { value: 'maybe' as const, label: 'Maybe', icon: Users, activeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    { value: 'not_going' as const, label: "Can't Go", icon: X, activeColor: 'bg-red-500/20 text-red-400 border-red-500/30' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gray-900 border border-gray-700/50 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 pb-4">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: config.hex }} />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
                <Calendar className={cn('w-6 h-6', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', config.bg, config.color)}>
                  {config.label}
                </span>
                <h2 className="text-xl font-bold text-white mt-2">{event.title}</h2>
                {event.status === 'cancelled' && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 mt-1 inline-block">
                    Cancelled
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="px-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-300">{formatDate(startDate)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-300">{formatTime(startDate)} – {formatTime(endDate)}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">{event.location}</span>
                </div>
              )}
              {event.instructor_name && (
                <div className="flex items-center gap-3 text-sm">
                  <GraduationCap className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">{event.instructor_name}</span>
                </div>
              )}
              {event.course_title && (
                <div className="flex items-center gap-3 text-sm">
                  <GraduationCap className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">{event.course_title}</span>
                </div>
              )}
              {event.school_name && (
                <div className="flex items-center gap-3 text-sm">
                  <GraduationCap className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">{event.school_name}</span>
                </div>
              )}
              {event.max_attendees && (
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-300">
                    {event.rsvp_count || 0} / {event.max_attendees} attending
                  </span>
                </div>
              )}
            </div>

            {event.description && (
              <div className="pt-2">
                <p className="text-sm text-gray-400 whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Meeting URL: only joinable while the meeting is live */}
            {event.meeting_url && (() => {
              const now = Date.now();
              const start = startDate.getTime();
              const end = endDate.getTime();
              const isLive = now >= start && now <= end;
              if (isLive) {
                return (
                  <a
                    href={event.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium text-sm transition-colors"
                  >
                    <Video size={16} />
                    Join {event.meeting_platform || 'Meeting'}
                    <ExternalLink size={14} />
                  </a>
                );
              }
              const when = now < start
                ? `Opens ${formatDate(startDate)} at ${formatTime(startDate)}`
                : 'This meeting has ended';
              return (
                <div className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-xl font-medium text-sm">
                  <Video size={16} />
                  {when}
                </div>
              );
            })()}

            {/* RSVP */}
            <div className="flex gap-2">
              {rsvpOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleRsvp(opt.value)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all',
                      rsvpStatus === opt.value
                        ? opt.activeColor
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Add to calendar only after the learner selects Going */}
            {rsvpStatus === 'going' && (
              <EventActions
                event={{
                  title: event.title,
                  description: event.description || event.course_title || '',
                  date: event.start_datetime,
                  time: formatTime(startDate),
                  meeting_url: event.meeting_url || undefined,
                }}
              />
            )}
          </div>

          <div className="p-6 pt-2" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

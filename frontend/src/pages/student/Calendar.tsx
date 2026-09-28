import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, CalendarDays, Search, Filter,
  LayoutGrid, List, Clock, ChevronDown,
} from 'lucide-react';
import { useCalendarStore, CalendarEvent, EVENT_TYPE_CONFIG, CalendarEventType } from '@/store/calendarStore';
import { UpcomingEventsSidebar } from '@/components/calendar/UpcomingEventsSidebar';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';
import { EventActions } from '@/components/calendar/EventActions';
import { cn } from '@/lib/utils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const EVENT_TYPES = Object.keys(EVENT_TYPE_CONFIG) as CalendarEventType[];

export default function CalendarPage() {
  const {
    events, selectedEvent, isLoading, view, currentDate, filters,
    setView, setCurrentDate, setFilters, setSelectedEvent,
    fetchEvents, fetchUpcoming, fetchEvent,
  } = useCalendarStore();

  const [searchQuery, setSearchQuery] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);

  const fetchRange = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    fetchEvents(start, end);
  }, [currentDate, fetchEvents]);

  useEffect(() => {
    fetchRange();
    fetchUpcoming();
  }, [fetchRange, fetchUpcoming]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters({ search: searchQuery });
      fetchRange();
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const getEventsForDate = useCallback((day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.start_datetime.startsWith(dateStr));
  }, [events, currentDate]);

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[calc(100vh-64px)] bg-gray-950">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="gradient-text">Calendar and Events</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Your academic and career activity timeline</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              {(['month', 'week', 'day', 'agenda'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-2 text-xs font-medium transition-colors capitalize flex items-center gap-1.5',
                    view === v
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  {v === 'month' && <LayoutGrid size={14} />}
                  {v === 'agenda' && <List size={14} />}
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold text-white min-w-[180px] text-center">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors"
            >
              Today
            </button>
          </div>

          <div className="relative flex-1 max-w-xs ml-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 text-sm focus:outline-none focus:border-primary-500/50"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'p-2 rounded-lg border transition-colors',
              showFilters ? 'bg-primary-500/20 border-primary-500/30 text-primary-400' : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
            )}
          >
            <Filter size={16} />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 mt-3 p-3 bg-white/5 border border-white/10 rounded-xl">
              <select
                value={filters.event_type}
                onChange={(e) => { setFilters({ event_type: e.target.value }); fetchRange(); }}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50"
              >
                <option value="">All Types</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{EVENT_TYPE_CONFIG[t].label}</option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => { setFilters({ status: e.target.value }); fetchRange(); }}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500/50"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                onClick={() => { setFilters({ event_type: '', status: '', search: '' }); setSearchQuery(''); fetchRange(); }}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-6 pb-8">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Calendar Grid / View */}
          <div className="lg:col-span-3">
            {view === 'month' && (
              <MonthView
                currentDate={currentDate}
                isToday={isToday}
                getEventsForDate={getEventsForDate}
                onSelectEvent={setSelectedEvent}
              />
            )}
            {view === 'week' && (
              <WeekView
                currentDate={currentDate}
                events={events}
                onSelectEvent={setSelectedEvent}
              />
            )}
            {view === 'day' && (
              <DayView
                currentDate={currentDate}
                events={events}
                onSelectEvent={setSelectedEvent}
              />
            )}
            {view === 'agenda' && (
              <AgendaView
                events={events}
                onSelectEvent={setSelectedEvent}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <UpcomingEventsSidebar />
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </motion.div>
  );
}

/* ──────────────── MONTH VIEW ──────────────── */
function MonthView({
  currentDate, isToday, getEventsForDate, onSelectEvent,
}: {
  currentDate: Date;
  isToday: (day: number) => boolean;
  getEventsForDate: (day: number) => CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square sm:aspect-auto sm:min-h-[80px]" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = getEventsForDate(day);
          return (
            <div
              key={day}
              className={cn(
                'rounded-xl p-1.5 min-h-[60px] sm:min-h-[80px] transition-all cursor-pointer hover:bg-white/5',
                isToday(day) && 'ring-2 ring-primary-500 bg-primary-500/5'
              )}
            >
              <span className={cn(
                'text-xs font-medium block mb-1',
                isToday(day) ? 'text-primary-400' : 'text-gray-400'
              )}>
                {day}
              </span>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => {
                  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.class;
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onSelectEvent(event); }}
                      className="truncate text-[10px] sm:text-xs px-1 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: `${config.hex}20`, color: config.hex }}
                    >
                      {event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-gray-500 block pl-1">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────── WEEK VIEW ──────────────── */
function WeekView({
  currentDate, events, onSelectEvent,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6am to 11pm

  const getEventsForSlot = (day: Date, hour: number) => {
    const dateStr = day.toISOString().split('T')[0];
    return events.filter((e) => {
      const start = new Date(e.start_datetime);
      return start.toISOString().split('T')[0] === dateStr && start.getHours() === hour;
    });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 overflow-x-auto">
      <div className="grid grid-cols-8 gap-px min-w-[640px]">
        {/* Header */}
        <div className="text-xs text-gray-500 font-medium p-2" />
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div key={i} className={cn('text-center p-2 rounded-lg', isToday && 'bg-primary-500/10')}>
              <p className="text-xs text-gray-500">{DAYS[d.getDay()]}</p>
              <p className={cn('text-lg font-bold', isToday ? 'text-primary-400' : 'text-white')}>{d.getDate()}</p>
            </div>
          );
        })}

        {/* Time slots */}
        {hours.map((hour) => (
          <div key={hour} className="contents">
            <div className="text-[10px] text-gray-500 font-medium py-3 pr-2 text-right">
              {hour === 0 ? '12 AM' : hour <= 12 ? `${hour} ${hour === 12 ? 'PM' : 'AM'}` : `${hour - 12} PM`}
            </div>
            {weekDays.map((day, di) => {
              const slotEvents = getEventsForSlot(day, hour);
              return (
                <div key={di} className="border-t border-white/5 min-h-[40px] p-0.5">
                  {slotEvents.map((event) => {
                    const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.class;
                    return (
                      <div
                        key={event.id}
                        onClick={() => onSelectEvent(event)}
                        className="text-[10px] px-1 py-0.5 rounded cursor-pointer truncate hover:opacity-80"
                        style={{ backgroundColor: `${config.hex}30`, color: config.hex }}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────── DAY VIEW ──────────────── */
function DayView({
  currentDate, events, onSelectEvent,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const dateStr = currentDate.toISOString().split('T')[0];
  const dayEvents = events.filter((e) => e.start_datetime.startsWith(dateStr));
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  const getEventsForHour = (hour: number) =>
    dayEvents.filter((e) => new Date(e.start_datetime).getHours() === hour);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-white mb-4">
        {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </h3>
      <div className="space-y-px">
        {hours.map((hour) => {
          const slotEvents = getEventsForHour(hour);
          const label = hour === 0 ? '12 AM' : hour <= 12 ? `${hour} ${hour === 12 ? 'PM' : 'AM'}` : `${hour - 12} PM`;
          return (
            <div key={hour} className="flex gap-3 min-h-[48px]">
              <span className="text-[10px] text-gray-500 font-medium w-14 text-right pt-1 flex-shrink-0">{label}</span>
              <div className="flex-1 border-t border-white/5 py-1 space-y-1">
                {slotEvents.map((event) => {
                  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.class;
                  const start = new Date(event.start_datetime);
                  const end = new Date(event.end_datetime);
                  const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                  return (
                    <div
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-white/5 transition-all"
                      style={{ borderLeft: `3px solid ${config.hex}` }}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.bg)}>
                        <CalendarDays className={cn('w-4 h-4', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{event.title}</p>
                        <p className="text-xs text-gray-500">{timeStr}</p>
                      </div>
                      {event.meeting_url && (
                        <a
                          href={event.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-400 hover:text-primary-300 px-2 py-1 rounded-lg bg-primary-500/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Join
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────── AGENDA VIEW ──────────────── */
function AgendaView({
  events, onSelectEvent,
}: {
  events: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const grouped = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    const sorted = [...events].sort((a, b) =>
      new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    );
    for (const event of sorted) {
      const date = new Date(event.start_datetime).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    }
    return Object.entries(groups);
  }, [events]);

  if (grouped.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
        <CalendarDays className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-lg font-medium">No events found</p>
        <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or date range</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([date, dayEvents]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 px-1">{date}</h3>
          <div className="space-y-2">
            {dayEvents.map((event) => {
              const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.class;
              const start = new Date(event.start_datetime);
              const end = new Date(event.end_datetime);
              const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
              return (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-white/20 cursor-pointer transition-all group"
                >
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
                    <CalendarDays className={cn('w-6 h-6', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', config.bg, config.color)}>
                        {config.label}
                      </span>
                      {event.status === 'cancelled' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                          Cancelled
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-primary-400 transition-colors truncate">
                      {event.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <Clock size={12} /> {timeStr}
                      {event.course_title && <span>• {event.course_title}</span>}
                    </p>
                  </div>
                  {event.meeting_url && (
                    <a
                      href={event.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-400 px-3 py-1.5 rounded-lg bg-primary-500/10 font-medium hover:bg-primary-500/20 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Join
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

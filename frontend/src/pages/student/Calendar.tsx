import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Video, ClipboardList, HelpCircle,
  FileText, Users, CalendarDays, Clock,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useStudentStore } from '@/store/studentStore';

const typeConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  'live-class': { icon: Video, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Live Class' },
  assignment: { icon: ClipboardList, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Assignment' },
  quiz: { icon: HelpCircle, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Quiz' },
  exam: { icon: FileText, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Exam' },
  webinar: { icon: Users, color: 'text-success-500', bg: 'bg-success-500/10', label: 'Webinar' },
};

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const { calendarEvents, fetchCalendarEvents } = useStudentStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarEvents.filter(e => e.date === dateStr);
  };

  const isToday = (day: number) => {
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const isSelected = (day: number) => {
    return selectedDate?.getDate() === day && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year;
  };

  const selectedEvents = selectedDate
    ? getEventsForDate(selectedDate.getDate())
    : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Learning Calendar</h1>
          <p className="text-gray-500 mt-1">Stay on top of your schedule.</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                view === v ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard className="p-5" hover={false}>
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Previous month">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold">
                {months[month]} {year}
              </h2>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Next month">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 mb-2">
              {daysOfWeek.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const events = getEventsForDate(day);
                const hasEvents = events.length > 0;
                return (
                  <button
                    key={day}
                    onClick={() => {
                      setSelectedDate(new Date(year, month, day));
                      setView('day');
                    }}
                    className={cn(
                      'aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all relative',
                      isToday(day) && 'border-2 border-primary-500',
                      isSelected(day) && 'bg-primary-500 text-white',
                      !isSelected(day) && hasEvents && 'bg-primary-500/10',
                      !isSelected(day) && !hasEvents && 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <span>{day}</span>
                    {hasEvents && (
                      <div className="flex gap-0.5 mt-0.5">
                        {events.slice(0, 3).map((e, j) => (
                          <div key={j} className={cn('w-1 h-1 rounded-full', typeConfig[e.type]?.color.replace('text-', 'bg-'))} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Events Panel */}
        <div className="space-y-4">
          <GlassCard className="p-5" hover={false}>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary-500" />
              {selectedDate
                ? `${months[selectedDate.getMonth()]} ${selectedDate.getDate()}`
                : 'Upcoming Events'}
            </h3>
            {selectedEvents.length === 0 && calendarEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDays className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No events scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(selectedEvents.length > 0 ? selectedEvents : calendarEvents).map((event) => {
                  const config = typeConfig[event.type] || typeConfig.assignment;
                  const Icon = config.icon;
                  return (
                    <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
                        <Icon className={cn('w-4 h-4', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{event.title}</h4>
                        <p className="text-xs text-gray-500 truncate">{event.course_title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="primary" size="sm">{config.label}</Badge>
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {event.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarGridProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (day: number) => void;
  selectedDate: Date | null;
  getEventsForDate: (day: number) => any[];
  typeConfig: Record<string, { color: string }>;
}

export function CalendarGrid({ currentDate, onPrevMonth, onNextMonth, onSelectDay, selectedDate, getEventsForDate, typeConfig }: CalendarGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

  const isSelected = (day: number) =>
    selectedDate?.getDate() === day && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year;

  return (
    <GlassCard className="p-5" hover={false}>
      <div className="flex items-center justify-between mb-5">
        <button onClick={onPrevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Previous month">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">{months[month]} {year}</h2>
        <button onClick={onNextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Next month">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {daysOfWeek.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
        ))}
      </div>

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
              onClick={() => onSelectDay(day)}
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
  );
}

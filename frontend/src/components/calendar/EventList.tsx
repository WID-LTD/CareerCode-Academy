import { CalendarDays, Clock, ExternalLink, CheckCircle2, Circle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { EventActions } from './EventActions';

interface EventListProps {
  events: any[];
  selectedDate: Date | null;
  typeConfig: Record<string, { icon: any; color: string; bg: string; label: string }>;
  months: string[];
  emptyMessage?: string;
  completedEvents?: string[];
  onToggleComplete?: (eventId: string, eventType: string) => void;
}

export function EventList({ events, selectedDate, typeConfig, months, emptyMessage = 'No events scheduled', completedEvents, onToggleComplete }: EventListProps) {
  return (
    <GlassCard className="p-5" hover={false}>
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-primary-500" />
        {selectedDate
          ? `${months[selectedDate.getMonth()]} ${selectedDate.getDate()}`
          : 'Upcoming Events'}
      </h3>
      {events.length === 0 ? (
        <div className="text-center py-8">
          <CalendarDays className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event: any) => {
            const config = typeConfig[event.type] || typeConfig.assignment;
            const Icon = config.icon;
            const eventDate = event.date + (event.time ? `T${event.time}` : '');
            const isCompleted = completedEvents?.includes(event.id) ?? false;
            return (
              <div key={event.id} className={cn('flex items-start gap-3 p-3 rounded-xl transition-all', isCompleted ? 'bg-green-50 dark:bg-green-900/10' : 'bg-gray-50 dark:bg-gray-800/50')}>
                {onToggleComplete && (
                  <button
                    onClick={() => onToggleComplete(event.id, event.type)}
                    className="mt-1 flex-shrink-0"
                    aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 hover:text-green-500 transition-colors" />
                    )}
                  </button>
                )}
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
                  <Icon className={cn('w-4 h-4', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={cn('text-sm font-medium truncate', isCompleted && 'line-through text-gray-400')}>{event.title}</h4>
                  <p className="text-xs text-gray-500 truncate">{event.course_title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="primary" size="sm">{config.label}</Badge>
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> {event.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {event.meeting_url && event.type === 'live-class' && (
                      <a
                        href={event.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> Join
                      </a>
                    )}
                    <EventActions
                      title={event.title}
                      description={event.course_title || ''}
                      date={eventDate}
                      type={event.type}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
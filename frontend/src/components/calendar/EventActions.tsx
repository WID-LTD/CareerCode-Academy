import { Calendar as CalendarIcon, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventActionsProps {
  event: {
    title: string;
    date: string;
    time?: string;
    description?: string;
    meeting_url?: string;
    course_title?: string;
  };
  className?: string;
}

function formatGoogleCalendarUrl(event: EventActionsProps['event']): string {
  const startDate = event.date ? new Date(event.date) : new Date();
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const formatDate = (d: Date) =>
    d.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: event.description || event.course_title || '',
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

function generateIcsContent(event: EventActionsProps['event']): string {
  const startDate = event.date ? new Date(event.date) : new Date();
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const formatDate = (d: Date) =>
    d.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description || event.course_title || ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadIcs(event: EventActionsProps['event']) {
  const content = generateIcsContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/\s+/g, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EventActions({ event, className }: EventActionsProps) {
  return (
    <div className={cn('flex items-center gap-2 mt-2', className)}>
      <a
        href={formatGoogleCalendarUrl(event)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
      >
        <CalendarIcon className="w-3 h-3" />
        Google
      </a>
      <a
        href={`https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(event.description || event.course_title || '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        Outlook
      </a>
      <button
        onClick={() => downloadIcs(event)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <CalendarIcon className="w-3 h-3" />
        .ICS
      </button>
    </div>
  );
}

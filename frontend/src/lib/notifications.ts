import type { Notification } from '@/store/studentStore';

// Where a notification should take the user. The API stores an explicit
// `link` for every notification it creates; older rows fall back to a mapping
// by type so nothing is a dead click.
const TYPE_LINKS: Record<string, string> = {
  certificate: '/student/certificates',
  certificate_earned: '/student/certificates',
  enrollment: '/student/courses',
  new_enrollment: '/instructor/students',
  pathway_complete: '/student/learning-paths',
  course_complete: '/student/courses',
  assignment: '/student/assignments',
  assignment_due: '/student/assignments',
  quiz: '/student/courses',
  exam: '/student/exams',
  live_session: '/student/calendar',
  live: '/student/calendar',
  message: '/student/messages',
  community: '/community',
  payment: '/student/dashboard',
  payment_success: '/student/dashboard',
  badge: '/student/certificates',
  streak: '/student/dashboard',
  announcement: '/student/notifications',
};

export function notificationLink(n: Partial<Notification> & { link?: string | null }): string {
  if (n.link && n.link.startsWith('/')) return n.link;
  return TYPE_LINKS[String(n.type || '')] || '/student/notifications';
}

export const BROWSER_NOTIFICATIONS_KEY = 'careercode-browser-notifications';

export function browserNotificationsEnabled(): boolean {
  try {
    // Opt-out model: on unless the user explicitly turned it off.
    return localStorage.getItem(BROWSER_NOTIFICATIONS_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setBrowserNotificationsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(BROWSER_NOTIFICATIONS_KEY, enabled ? 'on' : 'off');
  } catch { /* storage unavailable */ }
}

export function browserNotificationSupport(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, UserPlus, Star, Upload, MessageCircle, Calendar, Award, CheckCheck } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import { useInstructorStore } from '@/store/instructorStore';
import toast from 'react-hot-toast';
import SEO from '@/components/seo/SEO';
import { cn } from '@/lib/utils';
import { notificationLink } from '@/lib/notifications';

const notificationConfig: Record<string, { icon: React.ElementType; bg: string }> = {
  enrollment: { icon: UserPlus, bg: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' },
  review: { icon: Star, bg: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400' },
  submission: { icon: Upload, bg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' },
  discussion: { icon: MessageCircle, bg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400' },
  live_class: { icon: Calendar, bg: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400' },
  certificate: { icon: Award, bg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { notifications, isLoading, error, fetchNotifications, markNotificationRead, markAllNotificationsRead } = useInstructorStore();

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => !n.read);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  return (
    <>
      <SEO title="Notifications" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Notifications</h1>
            <p className="text-gray-500">Stay updated with your latest activity.</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllRead} icon={<CheckCheck className="w-4 h-4" />}>
              Mark All Read
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              filter === 'all'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2',
              filter === 'unread'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            Unread
            {unreadCount > 0 && (
              <Badge variant={filter === 'unread' ? 'default' : 'primary'} size="sm">{unreadCount}</Badge>
            )}
          </button>
        </div>

        {isLoading ? (
          <PageSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Something went wrong</h3>
            <p className="text-gray-500 text-sm mb-4 text-center max-w-sm">{error}</p>
            <Button variant="outline" onClick={fetchNotifications}>Try Again</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-gray-500 text-sm">
              {filter === 'unread' ? "You're all caught up!" : "You'll see notifications here when something happens."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((notification, i) => {
              const config = notificationConfig[notification.type] || { icon: Bell, bg: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' };
              const IconComponent = config.icon;
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <GlassCard
                    hover={!notification.read}
                    className={cn(
                      'p-4 relative',
                      !notification.read && 'cursor-pointer'
                    )}
                    onClick={() => {
                      if (!notification.read) handleMarkRead(notification.id);
                      navigate(notificationLink({ type: notification.type, link: (notification as any).link }));
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-4" />
                      )}
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        notification.read ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : config.bg
                      )}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={cn(
                            'text-sm',
                            !notification.read ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'
                          )}>
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{timeAgo(notification.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </>
  );
}

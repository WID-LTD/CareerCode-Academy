import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, CheckCircle, Info, AlertCircle, AlertTriangle,
  CheckCheck, Filter, Inbox,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/utils';
import { useStudentStore } from '@/store/studentStore';

const typeStyles: Record<string, { icon: any; color: string; bg: string }> = {
  success: { icon: CheckCircle, color: 'text-success-500', bg: 'bg-success-500/10' },
  warning: { icon: AlertTriangle, color: 'text-warning-500', bg: 'bg-warning-500/10' },
  error: { icon: AlertCircle, color: 'text-danger-500', bg: 'bg-danger-500/10' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
};

const filterOptions = ['all', 'unread', 'info', 'success', 'warning'];

export default function Notifications() {
  const { notifications, notificationsPagination, fetchNotifications, markNotificationRead, markAllNotificationsRead } = useStudentStore();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    fetchNotifications({ page, limit: pageSize });
  }, [fetchNotifications, page, pageSize]);

  const filtered = filter === 'all' ? notifications :
    filter === 'unread' ? notifications.filter(n => !n.read) :
    notifications.filter(n => n.type === filter);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-start sm:items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {notifications.filter(n => !n.read).length} unread notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<CheckCheck className="w-4 h-4" />}
            onClick={markAllNotificationsRead}
            disabled={notifications.filter(n => !n.read).length === 0}
          >
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize flex items-center gap-1.5',
              filter === f
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'glass hover:bg-white/80 dark:hover:bg-gray-800/80'
            )}
          >
            {f === 'all' && <Bell className="w-3.5 h-3.5" />}
            {f === 'unread' && <Inbox className="w-3.5 h-3.5" />}
            {f === 'info' && <Info className="w-3.5 h-3.5" />}
            {f === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
            {f === 'warning' && <AlertTriangle className="w-3.5 h-3.5" />}
            {f.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <GlassCard className="text-center py-12" hover={false}>
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No notifications</h3>
            <p className="text-sm text-gray-500">
              {filter === 'all' ? 'You\'re all caught up!' : 'No notifications match this filter.'}
            </p>
          </GlassCard>
        ) : (
          filtered.map((notification, i) => {
            const style = typeStyles[notification.type] || typeStyles.info;
            const Icon = style.icon;
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <div
                  className={cn(
                    'rounded-2xl border border-white/20 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 shadow-lg shadow-black/5 backdrop-blur-xl p-4 cursor-pointer transition-all hover:-translate-y-0.5',
                    !notification.read ? 'border-l-4 border-l-primary-500' : ''
                  )}
                  onClick={() => { if (!notification.read) markNotificationRead(notification.id); }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${notification.title}. ${notification.read ? 'Read' : 'Unread'}`}
                  onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') markNotificationRead(notification.id); }}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', style.bg)}>
                      <Icon className={cn('w-5 h-5', style.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn('text-sm', !notification.read ? 'font-semibold' : 'font-medium')}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                      <span className="text-xs text-gray-400 mt-2 block">
                        {new Date(notification.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  </div>
                </motion.div>
            );
          })
        )}
      </div>

      {notificationsPagination && (
        <Pagination
          page={page}
          totalPages={notificationsPagination.pages}
          totalItems={notificationsPagination.total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      )}
    </motion.div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, Info, AlertCircle, AlertTriangle } from 'lucide-react';
import { useStudentStore } from '@/store/studentStore';
import { cn } from '@/lib/utils';

export function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, fetchNotifications, markNotificationRead } = useStudentStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-gray-900 rounded-full" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 glass-card shadow-xl overflow-hidden z-50"
          >
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <span className="text-xs text-primary-500 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No notifications yet.
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer",
                      !notification.read ? "bg-primary-50/50 dark:bg-primary-900/10" : ""
                    )}
                    onClick={() => {
                      if (!notification.read) markNotificationRead(notification.id);
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {getIcon(notification.type)}
                      </div>
                      <div>
                        <h4 className={cn("text-sm mb-0.5", !notification.read ? "font-semibold" : "font-medium")}>
                          {notification.title}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {notification.message}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

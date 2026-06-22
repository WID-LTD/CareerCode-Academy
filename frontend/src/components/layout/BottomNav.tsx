import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Trophy,
  User,
  Users,
  Calendar,
  MessageSquare,
  GraduationCap,
  DollarSign,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const roleLinks: Record<string, { label: string; path: string; icon: any }[]> = {
  student: [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Courses', path: '/student/courses', icon: BookOpen },
    { label: 'Assignments', path: '/student/assignments', icon: ClipboardList },
    { label: 'Leaderboard', path: '/student/leaderboard', icon: Trophy },
    { label: 'Profile', path: '/student/profile', icon: User },
  ],
  instructor: [
    { label: 'Dashboard', path: '/instructor/dashboard', icon: LayoutDashboard },
    { label: 'Courses', path: '/instructor/courses', icon: BookOpen },
    { label: 'Students', path: '/instructor/students', icon: Users },
    { label: 'Schedule', path: '/instructor/schedule', icon: Calendar },
    { label: 'Messages', path: '/instructor/messages', icon: MessageSquare },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Courses', path: '/admin/courses', icon: GraduationCap },
    { label: 'Payments', path: '/admin/payments', icon: DollarSign },
    { label: 'Messages', path: '/admin/messages', icon: MessageSquare },
  ],
};

interface BottomNavProps {
  role?: string;
}

export function BottomNav({ role = 'student' }: BottomNavProps) {
  const location = useLocation();
  const links = roleLinks[role] || roleLinks.student;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/20 dark:border-gray-800/50 lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-1">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-medium transition-all relative',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <link.icon className="w-5 h-5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  Video,
  ClipboardList,
  Award,
  Users,
  GraduationCap,
  CreditCard,
  BarChart3,
  Settings,
  ChevronLeft,
  UserCircle,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const roleSidebarLinks = {
  student: [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'My Courses', path: '/student/courses', icon: BookOpen },
    { label: 'Assignments', path: '/student/assignments', icon: ClipboardList },
    { label: 'Certificates', path: '/student/certificates', icon: Award },
    { label: 'Profile', path: '/student/profile', icon: UserCircle },
  ],
  instructor: [
    { label: 'Dashboard', path: '/instructor/dashboard', icon: LayoutDashboard },
    { label: 'Courses', path: '/instructor/courses', icon: BookOpen },
    { label: 'Students', path: '/instructor/students', icon: Users },
    { label: 'Assignments', path: '/instructor/assignments', icon: ClipboardList },
    { label: 'Profile', path: '/instructor/profile', icon: UserCircle },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Courses', path: '/admin/courses', icon: GraduationCap },
    { label: 'Payments', path: '/admin/payments', icon: CreditCard },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ],
};

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const role = user?.role || 'student';
  const links = roleSidebarLinks[role] || roleSidebarLinks.student;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-16 left-0 bottom-0 w-64 z-40 glass border-r border-white/20 dark:border-gray-800/50 overflow-y-auto scrollbar-thin"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm capitalize">{role} Panel</span>
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  <link.icon className="w-4 h-4 flex-shrink-0" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </motion.aside>
    </>
  );
}

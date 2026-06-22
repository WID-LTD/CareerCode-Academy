import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  GitBranch,
  ClipboardList,
  Award,
  Users,
  Trophy,
  Calendar,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LogOut,
  Hash,
  Monitor,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';
import { useSocket } from '@/hooks/useSocket';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const roleSidebarLinks: Record<string, { label: string; path: string; icon: any }[]> = {
  student: [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'My Courses', path: '/student/courses', icon: BookOpen },
    { label: 'Learning Paths', path: '/student/learning-paths', icon: GitBranch },
    { label: 'Assignments', path: '/student/assignments', icon: ClipboardList },
    { label: 'Exams', path: '/student/exams', icon: ClipboardList },
    { label: 'Challenges', path: '/student/challenges', icon: ClipboardList },
    { label: 'Certificates', path: '/student/certificates', icon: Award },
    { label: 'Community', path: '/community', icon: Users },
    { label: 'Leaderboard', path: '/student/leaderboard', icon: Trophy },
    { label: 'Calendar', path: '/student/calendar', icon: Calendar },
    { label: 'Notifications', path: '/student/notifications', icon: Bell },
    { label: 'Messages', path: '/student/messages', icon: Users },
    { label: 'Support', path: '/student/tickets', icon: Users },
    { label: 'Settings', path: '/student/settings', icon: Settings },
  ],
  instructor: [
    { label: 'Dashboard', path: '/instructor/dashboard', icon: LayoutDashboard },
    { label: 'Analytics', path: '/instructor/analytics', icon: LayoutDashboard },
    { label: 'Courses', path: '/instructor/courses', icon: BookOpen },
    { label: 'Quizzes', path: '/instructor/quizzes', icon: ClipboardList },
    { label: 'Exams', path: '/instructor/exams', icon: ClipboardList },
    { label: 'Course Proposals', path: '/instructor/course-proposals', icon: GitBranch },
    { label: 'Students', path: '/instructor/students', icon: Users },
    { label: 'Assignments', path: '/instructor/assignments', icon: ClipboardList },
    { label: 'Submissions', path: '/instructor/submissions', icon: ClipboardList },
    { label: 'Announcements', path: '/instructor/announcements', icon: Bell },
    { label: 'Live Classes', path: '/instructor/live-classes', icon: Calendar },
    { label: 'Messages', path: '/instructor/messages', icon: Users },
    { label: 'Schedule', path: '/instructor/schedule', icon: Calendar },
    { label: 'Payouts', path: '/instructor/payouts', icon: LayoutDashboard },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Courses', path: '/admin/courses', icon: GraduationCap },
    { label: 'Categories', path: '/admin/categories', icon: Hash },
    { label: 'Course Proposals', path: '/admin/course-proposals', icon: BookOpen },
    { label: 'Applications', path: '/admin/applications', icon: ClipboardList },
    { label: 'Payments', path: '/admin/payments', icon: LayoutDashboard },
    { label: 'Exams', path: '/admin/exams', icon: ClipboardList },
    { label: 'Exam Monitor', path: '/admin/exams/monitor', icon: Monitor },
    { label: 'Certificates', path: '/admin/certificates', icon: Award },
    { label: 'Cert. Templates', path: '/admin/certificate-templates', icon: Award },
    { label: 'Support Tickets', path: '/admin/tickets', icon: Users },
    { label: 'Notifications', path: '/admin/broadcasts', icon: Bell },
    { label: 'Reports', path: '/admin/reports', icon: LayoutDashboard },
    { label: 'Messages', path: '/admin/messages', icon: Users },
    { label: 'Analytics', path: '/admin/analytics', icon: Trophy },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
    { label: 'Payouts', path: '/admin/payouts', icon: LayoutDashboard },
  ],
  adminNarrow: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Courses', path: '/admin/courses', icon: BookOpen },
    { label: 'Categories', path: '/admin/categories', icon: GitBranch },
    { label: 'Course Proposals', path: '/admin/course-proposals', icon: BookOpen },
    { label: 'Applications', path: '/admin/applications', icon: ClipboardList },
    { label: 'Payments', path: '/admin/payments', icon: LayoutDashboard },
    { label: 'Exams', path: '/admin/exams', icon: ClipboardList },
    { label: 'Exam Monitor', path: '/admin/exams/monitor', icon: Monitor },
    { label: 'Certificates', path: '/admin/certificates', icon: Award },
    { label: 'Cert. Templates', path: '/admin/certificate-templates', icon: Award },
    { label: 'Support Tickets', path: '/admin/tickets', icon: Users },
    { label: 'Notifications', path: '/admin/broadcasts', icon: Bell },
    { label: 'Reports', path: '/admin/reports', icon: LayoutDashboard },
    { label: 'Messages', path: '/admin/messages', icon: Users },
    { label: 'Analytics', path: '/admin/analytics', icon: Trophy },
    { label: 'Audit Log', path: '/admin/audit-log', icon: LayoutDashboard },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
    { label: 'Payouts', path: '/admin/payouts', icon: LayoutDashboard },
  ],
};

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [newCertCount, setNewCertCount] = useState(0);
  const { socket } = useSocket();
  const role = user?.role || 'student';
  const baseLinks = roleSidebarLinks[role] || roleSidebarLinks.student;
  const links = useMemo(() => {
    if (role !== 'admin' && role !== 'super_admin') return baseLinks;
    const adminManagement = { label: 'Admin Management', path: '/admin/admin-management', icon: ShieldAlert };
    if (role === 'super_admin') {
      const idx = baseLinks.findIndex(l => l.path === '/admin/settings');
      if (idx >= 0) {
        const copy = [...baseLinks];
        copy.splice(idx, 0, adminManagement);
        return copy;
      }
    }
    return baseLinks;
  }, [role, baseLinks]);

  useEffect(() => {
    if (role !== 'student') return;
    let cancelled = false;
    api.get('/certificates?limit=100').then(res => {
      if (cancelled) return;
      const certs = res.data?.data || [];
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      setNewCertCount(certs.filter((c: any) => {
        const t = c.issued_at ? new Date(c.issued_at).getTime() : 0;
        return t >= cutoff;
      }).length);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [role]);

  useEffect(() => {
    if (role !== 'student' || !socket) return;
    const onCertIssued = () => setNewCertCount(prev => prev + 1);
    socket.on('certificate_issued', onCertIssued);
    return () => { socket.off('certificate_issued', onCertIssued); };
  }, [socket, role]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-16 left-0 bottom-0 z-40 glass border-r border-white/20 dark:border-gray-800/50 overflow-y-auto scrollbar-thin transition-transform duration-300 lg:translate-x-0',
          collapsed ? 'w-16' : 'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col h-full">
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-6 px-2">
              {!collapsed && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm capitalize">{role} Panel</span>
                </div>
              )}
              <div className="flex gap-1">
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden lg:block"
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
                <button
                  onClick={onToggle}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
                  aria-label="Close sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            <nav className="space-y-1" role="navigation">
              {links.map((link) => {
                const isActive = location.pathname === link.path;
                const showBadge = link.label === 'Certificates' && newCertCount > 0;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) onToggle();
                      if (showBadge) setNewCertCount(0);
                    }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                      collapsed && showBadge && 'relative',
                      isActive
                        ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <link.icon className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-primary-500')} />
                    {!collapsed && (
                      <span className="truncate">{link.label}</span>
                    )}
                    {!collapsed && showBadge && (
                      <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500 text-white text-xs font-bold leading-none">
                        {newCertCount > 99 ? '99+' : newCertCount}
                      </span>
                    )}
                    {collapsed && showBadge && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary-500" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile at Bottom */}
          {!collapsed && (
            <div className="p-4 border-t border-white/20 dark:border-gray-800/50">
              <Link
                to={`/${role}/profile`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all group"
              >
                <div className="w-9 h-9 gradient-bg rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate capitalize">{role}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    logout();
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </Link>
            </div>
          )}
        </div>
        </aside>
    </>
  );
}

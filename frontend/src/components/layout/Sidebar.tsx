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
  Map,
  Target,
  User,
  Plus,
  FileQuestion,
  MessageCircle,
  BarChart3,
  DollarSign,
  Star,
  FolderOpen,
  Briefcase,
  Zap,
  Compass,
  BadgePercent,
  Landmark,
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
    { label: 'Pathway Finder', path: '/student/pathway-finder', icon: Compass },
    { label: 'Assignments', path: '/student/assignments', icon: ClipboardList },
    { label: 'Exams', path: '/student/exams', icon: ClipboardList },
    { label: 'Challenges', path: '/student/challenges', icon: ClipboardList },
    { label: 'Certificates', path: '/student/certificates', icon: Award },
    { label: 'Applications', path: '/student/applications', icon: Briefcase },
    { label: 'Portfolio', path: '/student/portfolio', icon: FolderOpen },
    { label: 'Guided Mode', path: '/student/guided', icon: Zap },
    { label: 'Community', path: '/community', icon: Users },
    { label: 'Leaderboard', path: '/student/leaderboard', icon: Trophy },
    { label: 'Mentorship', path: '/student/mentoring', icon: Users },
    { label: 'Calendar and Events', path: '/student/calendar', icon: Calendar },
    { label: 'Roadmap', path: '/student/roadmap', icon: Map },
    { label: 'Study Plans', path: '/student/study-plans', icon: Target },
    { label: 'Notifications', path: '/student/notifications', icon: Bell },
    { label: 'Messages', path: '/student/messages', icon: Users },
    { label: 'Support', path: '/student/tickets', icon: Users },
    { label: 'Settings', path: '/student/settings', icon: Settings },
  ],
  instructor: [
    { label: 'Dashboard Overview', path: '/instructor/dashboard', icon: LayoutDashboard },
    { label: 'My Programs', path: '/instructor/programs', icon: GitBranch },
    { label: 'My Courses', path: '/instructor/courses', icon: BookOpen },
    { label: 'Course Builder', path: '/instructor/courses/new', icon: Plus },
    { label: 'Students', path: '/instructor/students', icon: Users },
    { label: 'Assignments', path: '/instructor/assignments', icon: ClipboardList },
    { label: 'Quizzes & Exams', path: '/instructor/quizzes', icon: FileQuestion },
    { label: 'Live Classes', path: '/instructor/live-classes', icon: Calendar },
    { label: 'Discussions', path: '/instructor/discussions', icon: MessageCircle },
    { label: 'Communities', path: '/instructor/communities', icon: Users },
    { label: 'Analytics', path: '/instructor/analytics', icon: BarChart3 },
    { label: 'Earnings', path: '/instructor/earnings', icon: DollarSign },
    { label: 'Certificates', path: '/instructor/certificates', icon: Award },
    { label: 'Reviews & Feedback', path: '/instructor/reviews', icon: Star },
    { label: 'Resources', path: '/instructor/resources', icon: FolderOpen },
    { label: 'Settings', path: '/instructor/profile', icon: Settings },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Courses', path: '/admin/courses', icon: GraduationCap },
    { label: 'Categories', path: '/admin/categories', icon: Hash },
    { label: 'Course Proposals', path: '/admin/course-proposals', icon: BookOpen },
    { label: 'Programs', path: '/admin/programs', icon: GraduationCap },
    { label: 'Career Pipeline', path: '/admin/career', icon: Target },
    { label: 'Applications', path: '/admin/applications', icon: ClipboardList },
    { label: 'Payments', path: '/admin/payments', icon: LayoutDashboard },
    { label: 'Promotions', path: '/admin/promotions', icon: BadgePercent },
    { label: 'Board Oversight', path: '/admin/board-oversight', icon: Landmark },
    { label: 'Exams', path: '/admin/exams', icon: ClipboardList },
    { label: 'Exam Monitor', path: '/admin/exams/monitor', icon: Monitor },
    { label: 'Certificates', path: '/admin/certificates', icon: Award },
    { label: 'Cert. Templates', path: '/admin/certificate-templates', icon: Award },
    { label: 'Calendar and Events', path: '/admin/calendar', icon: Calendar },
    { label: 'Support Tickets', path: '/admin/tickets', icon: Users },
    { label: 'Notifications', path: '/admin/broadcasts', icon: Bell },
    { label: 'Messages', path: '/admin/messages', icon: Users },
    { label: 'Community', path: '/admin/community-management', icon: MessageCircle },
    { label: 'Reports', path: '/admin/reports', icon: LayoutDashboard },
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
    { label: 'Programs', path: '/admin/programs', icon: GraduationCap },
    { label: 'Career Pipeline', path: '/admin/career', icon: Target },
    { label: 'Applications', path: '/admin/applications', icon: ClipboardList },
    { label: 'Payments', path: '/admin/payments', icon: LayoutDashboard },
    { label: 'Promotions', path: '/admin/promotions', icon: BadgePercent },
    { label: 'Board Oversight', path: '/admin/board-oversight', icon: Landmark },
    { label: 'Exams', path: '/admin/exams', icon: ClipboardList },
    { label: 'Exam Monitor', path: '/admin/exams/monitor', icon: Monitor },
    { label: 'Certificates', path: '/admin/certificates', icon: Award },
    { label: 'Cert. Templates', path: '/admin/certificate-templates', icon: Award },
    { label: 'Calendar and Events', path: '/admin/calendar', icon: Calendar },
    { label: 'Support Tickets', path: '/admin/tickets', icon: Users },
    { label: 'Notifications', path: '/admin/broadcasts', icon: Bell },
    { label: 'Messages', path: '/admin/messages', icon: Users },
    { label: 'Community', path: '/admin/community-management', icon: MessageCircle },
    { label: 'Reports', path: '/admin/reports', icon: LayoutDashboard },
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
    // RBAC filter for admin (super_admin bypass)
    let filtered = baseLinks;
    if (role === 'admin' && user?.allowedDashboards !== undefined && user?.allowedDashboards !== null) {
      const allowed = user.allowedDashboards as string[] | null;
      if (Array.isArray(allowed)) {
        filtered = baseLinks.filter(l => allowed.includes(l.path));
        // always keep dashboard? if allowed doesn't include dashboard but includes others, still show - respect strict list
        if (filtered.length === 0 && allowed.length > 0) filtered = baseLinks.filter(l => allowed.includes(l.path));
      }
    }
    const adminManagement = { label: 'Admin Management', path: '/admin/admin-management', icon: ShieldAlert };
    if (role === 'super_admin') {
      const idx = filtered.findIndex(l => l.path === '/admin/settings');
      if (idx >= 0) {
        const copy = [...filtered];
        copy.splice(idx, 0, adminManagement);
        return copy;
      }
      return [...filtered, adminManagement];
    }
    return filtered;
  }, [role, baseLinks, user?.allowedDashboards]);

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
          'fixed top-14 sm:top-16 left-0 bottom-0 z-40 glass border-r border-gray-200/60 dark:border-gray-800/50 overflow-y-auto scrollbar-thin transition-transform duration-300 lg:translate-x-0 safe-bottom',
          collapsed ? 'w-16' : 'w-64 xl:w-[clamp(260px,15vw,360px)]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col h-full">
          <div className="p-4 flex-1 flex flex-col">
            <div className={cn("flex items-center mb-6", collapsed ? "justify-center" : "justify-between px-2")}>
              {(!collapsed) ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm capitalize">{role} Panel</span>
                </div>
              ) : (
                <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
              )}
              
              {!collapsed && (
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
              )}
            </div>
            
            {collapsed && (
              <div className="flex justify-center mb-6">
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
            )}

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
                      'flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                      collapsed ? 'justify-center px-0' : 'px-3',
                      isActive
                        ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                    )}
                    title={collapsed ? link.label : undefined}
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
          <div className="p-4 border-t border-gray-200/60 dark:border-gray-800/50">
            <Link
              to={`/${role}/profile`}
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all group relative",
                collapsed ? 'justify-center px-0' : 'px-3'
              )}
              title={collapsed ? user?.name || 'User' : undefined}
            >
              <div className="w-9 h-9 gradient-bg rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              {!collapsed && (
                <>
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
                </>
              )}
            </Link>
          </div>
        </div>
        </aside>
    </>
  );
}

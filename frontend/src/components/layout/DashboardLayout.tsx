import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useStudentStore } from '@/store/studentStore';
import {
  Menu, Search, MessageSquare, X, Loader2,
  LayoutDashboard, BookOpen, ClipboardList, Trophy, User, Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  requiredRole?: 'student' | 'instructor' | 'admin' | 'super_admin';
}

const adminRoles = ['admin', 'super_admin'];

export function DashboardLayout({ requiredRole }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuthStore();
  const { searchResults, isSearching, globalSearch, clearSearch } = useStudentStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        globalSearch(searchQuery);
        setSearchOpen(true);
      } else {
        clearSearch();
        setSearchOpen(false);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, globalSearch, clearSearch]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role || 'student';
  const hasAccess = !requiredRole ||
    role === requiredRole ||
    (requiredRole === 'admin' && adminRoles.includes(role));

  if (!hasAccess) {
    const redirectMap: Record<string, string> = {
      student: '/student/dashboard',
      instructor: '/instructor/dashboard',
      admin: '/admin/dashboard',
      super_admin: '/admin/dashboard',
    };
    return <Navigate to={redirectMap[role] || '/student/dashboard'} replace />;
  }

  const roleLabel = role === 'super_admin' ? 'Admin' : role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 pt-16 pb-20 lg:pb-0">
        {/* Top Bar with Search */}
        <div className="sticky top-16 z-30 glass border-b border-white/20 dark:border-gray-800/50 px-4 py-2.5 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <span className="text-sm font-medium capitalize hidden sm:block">
            {roleLabel} Dashboard
          </span>

          {/* Global Search */}
          <div className="flex-1 max-w-md mx-auto relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses, lessons, instructors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-transparent focus:border-primary-500/50 focus:bg-white dark:focus:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none transition-all"
                aria-label="Search courses, lessons, instructors, certificates"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); clearSearch(); setSearchOpen(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 right-0 mt-1 glass-card p-2 shadow-xl z-50 max-h-80 overflow-y-auto"
                  role="listbox"
                >
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result: any, i: number) => (
                      <Link
                        key={i}
                        to={result.url || '#'}
                        onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        role="option"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                          {result.type === 'course' ? <BookOpen className="w-4 h-4 text-primary-500" /> :
                           result.type === 'lesson' ? <LayoutDashboard className="w-4 h-4 text-accent-500" /> :
                           result.type === 'instructor' ? <User className="w-4 h-4 text-secondary-500" /> :
                           <Award className="w-4 h-4 text-success-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          <p className="text-xs text-gray-500 truncate capitalize">{result.type} &middot; {result.category || ''}</p>
                        </div>
                      </Link>
                    ))
                  ) : searchQuery.trim().length >= 2 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      No results found for &ldquo;{searchQuery}&rdquo;
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/${role}/messages`}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
              aria-label="Messages"
            >
              <MessageSquare className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <main className="p-4 sm:p-6 lg:p-8" id="main-content">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      {role === 'student' && <BottomNav />}
    </div>
  );
}



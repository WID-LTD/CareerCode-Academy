import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  requiredRole?: 'student' | 'instructor' | 'admin';
}

export function DashboardLayout({ requiredRole }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    const redirectMap = {
      student: '/student/dashboard',
      instructor: '/instructor/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={redirectMap[user?.role || 'student']} replace />;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 pt-16">
        <div className="sticky top-16 z-30 glass border-b border-white/20 dark:border-gray-800/50 px-4 py-2 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium capitalize">
            {user?.role} Dashboard
          </span>
        </div>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Sun, Moon, User, LogOut, ChevronDown, BookOpen, Code2, Search,
  Shield, Globe, Database, Palette, Briefcase, GraduationCap, Star, Zap, Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/Button';
import { NotificationsBell } from './NotificationsBell';
import { PageGuideButton } from '@/guides/PageGuideButton';
import { SearchModal } from './SearchModal';
import { BugReportButton } from '@/components/support/BugReportButton';
import api from '@/lib/axios';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Programs', path: '/schools', hasMega: true },
  { label: 'Courses', path: '/courses', hasMega: true },
  { label: 'Career Paths', path: '/career' },
  { label: 'Instructors', path: '/become-instructor' },
  { label: 'About', path: '/about' },
];

const megaMenuSchools = [
  { icon: Code2, name: 'Software Development', desc: 'Web, mobile, and backend', slug: 'software-development', color: 'from-blue-500 to-cyan-500' },
  { icon: Database, name: 'Data & Artificial Intelligence', desc: 'Data science, machine learning and artificial intelligence', slug: 'data-ai', color: 'from-purple-500 to-pink-500' },
  { icon: Palette, name: 'Design & Creative', desc: 'Product design and user experience', slug: 'design-creative', color: 'from-pink-500 to-rose-500' },
  { icon: Briefcase, name: 'Business & Digital', desc: 'Product management, analytics', slug: 'business-digital', color: 'from-amber-500 to-orange-500' },
  { icon: GraduationCap, name: 'Career Readiness', desc: 'Resume, interviews, freelancing', slug: 'career-readiness', color: 'from-emerald-500 to-teal-500' },
];

const megaMenuCourses = [
  { name: 'Web Development', count: 0, slug: 'web-development', category: 'Web Development' },
  { name: 'Data Science', count: 0, slug: 'data-science', category: 'Data Science' },
  { name: 'Mobile Development', count: 0, slug: 'mobile-development', category: 'Mobile' },
  { name: 'DevOps', count: 0, slug: 'devops', category: 'DevOps' },
  { name: 'Security', count: 0, slug: 'security', category: 'Security' },
  { name: 'AI & Machine Learning', count: 0, slug: 'ai-machine-learning', category: 'AI' },
  { name: 'Design', count: 0, slug: 'design', category: 'Design' },
  { name: 'Cloud Computing', count: 0, slug: 'cloud-computing', category: 'Cloud Computing' },
];

interface MegaMenuProps {
  items: any[];
  basePath: string;
  renderItem: (item: any) => React.ReactNode;
}

function MegaMenu({ items, basePath, renderItem }: MegaMenuProps) {
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[calc(100vw-2rem)] max-w-[600px] glass-card p-4 shadow-2xl border border-gray-200/60 dark:border-gray-800/50 z-50">
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <Link
            key={item.name}
            to={item.href || `${basePath}/${item.slug}`}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors group"
          >
            {renderItem(item)}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Navbar() {
  const [courseCategories, setCourseCategories] = useState<any[]>(megaMenuCourses);
  useEffect(() => {
    api.get('/public/course-categories').then(({ data }) => {
      if (Array.isArray(data.data) && data.data.length) setCourseCategories(data.data);
    }).catch(() => {});
  }, []);
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const megaTimeout = useRef<ReturnType<typeof setTimeout>>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { darkMode, toggleDarkMode } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveMega(null);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleMegaEnter = (label: string) => {
    if (megaTimeout.current) clearTimeout(megaTimeout.current);
    setActiveMega(label);
  };

  const handleMegaLeave = () => {
    megaTimeout.current = setTimeout(() => setActiveMega(null), 150);
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin':
      case 'super_admin':
        return '/admin/dashboard';
      case 'instructor':
        return '/instructor/dashboard';
      default:
        return '/student/dashboard';
    }
  };

  const getProfileLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin':
      case 'super_admin':
        return '/admin/settings';
      case 'instructor':
        return '/instructor/profile';
      default:
        return '/student/profile';
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/60 dark:border-gray-800/50 transition-shadow duration-300">
        <div className="max-w-screen-5xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0" aria-label="Go to homepage">
              <div className="w-8 h-8 sm:w-9 sm:h-9 gradient-bg rounded-lg flex items-center justify-center overflow-hidden">
                <img src="/screen.png" alt="CareerCode Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-lg sm:text-xl font-bold gradient-text hidden xs:inline">CareerCode</span>
            </Link>

            <div className="hidden xl:flex flex-1 items-center justify-center gap-0.5 px-4" role="list">
              {navLinks.map((link) => (
                <div
                  key={link.path}
                  className="relative"
                  onMouseEnter={() => link.hasMega && handleMegaEnter(link.label)}
                  onMouseLeave={handleMegaLeave}
                >
                  <Link
                    to={link.path}
                    role="listitem"
                    aria-current={location.pathname === link.path ? 'page' : undefined}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1',
                      location.pathname === link.path
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    )}
                  >
                    {link.label}
                    {link.hasMega && <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', activeMega === link.label && 'rotate-180')} />}
                  </Link>
                  <AnimatePresence>
                    {activeMega === link.label && link.hasMega && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        onMouseEnter={() => handleMegaEnter(link.label)}
                        onMouseLeave={handleMegaLeave}
                      >
                        {link.label === 'Programs' && (
                          <MegaMenu
                            items={megaMenuSchools}
                            basePath="/schools"
                            renderItem={(item: any) => (
                              <>
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                                  <item.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium group-hover:text-primary-500 transition-colors">{item.name}</p>
                                  <p className="text-xs text-gray-500">{item.desc}</p>
                                </div>
                              </>
                            )}
                          />
                        )}
                        {link.label === 'Courses' && (
                          <MegaMenu
                            items={courseCategories}
                            basePath="/courses"
                            renderItem={(item: any) => (
                              <div className="flex items-center gap-2 w-full">
                                <BookOpen className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium group-hover:text-primary-500 transition-colors truncate">{item.name}</p>
                                  <p className="text-xs text-gray-500">{item.count} {item.count === 1 ? 'course' : 'courses'}</p>
                                </div>
                                <GraduationCap className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search (Cmd+K)"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Search...</span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-[10px] font-medium text-gray-400 bg-gray-50 dark:bg-gray-800">
                  <span className="text-[9px]">⌘</span>K
                </kbd>
              </button>

              <PageGuideButton className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden lg:flex" />
              <BugReportButton className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden lg:flex" />


              {isAuthenticated && (
                <NotificationsBell />
              )}

              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    aria-haspopup="true"
                    aria-expanded={showDropdown}
                    aria-label="User menu"
                    className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-target"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 gradient-bg rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                      {user?.name?.split(' ')[0]}
                    </span>
                    <ChevronDown className="hidden md:block w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                  <AnimatePresence>
                    {showDropdown && (
                      <motion.div
                        role="menu"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-56 sm:w-60 glass-card p-2 shadow-xl right-0 sm:right-0 -left-20 sm:left-auto"
                      >
                        <Link
                          to={getDashboardLink()}
                          role="menuitem"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <BookOpen className="w-4 h-4 flex-shrink-0" />
                          Dashboard
                        </Link>
                        <Link
                          to={getProfileLink()}
                          role="menuitem"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <User className="w-4 h-4 flex-shrink-0" />
                          Profile
                        </Link>
                        {(!user?.role || user.role === 'student') && (
                          <Link
                            to="/student/wishlist"
                            role="menuitem"
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <Heart className="w-4 h-4 flex-shrink-0" />
                            Wishlist
                          </Link>
                        )}
                        <hr className="my-1 border-gray-200 dark:border-gray-700" />
                        <button
                          role="menuitem"
                          onClick={() => {
                            setShowDropdown(false);
                            logout();
                            navigate('/');
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <LogOut className="w-4 h-4 flex-shrink-0" />
                          Log Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm">Get Started</Button>
                  </Link>
                </div>
              )}

              <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isOpen}
                className="xl:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 touch-target flex items-center justify-center"
              >
                {isOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="xl:hidden border-t border-gray-200/60 dark:border-gray-800/50 overflow-hidden"
            >
              <div className="px-3 sm:px-4 py-3 space-y-1 max-h-[calc(100dvh-4rem)] overflow-y-auto safe-bottom">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    aria-current={location.pathname === link.path ? 'page' : undefined}
                    className={cn(
                      'block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-target flex items-center',
                      location.pathname === link.path
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                {!isAuthenticated && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <Link to="/login" className="w-full" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full" size="sm">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/signup" className="w-full" onClick={() => setIsOpen(false)}>
                      <Button className="w-full" size="sm">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

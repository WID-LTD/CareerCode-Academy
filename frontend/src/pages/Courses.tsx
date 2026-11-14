import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { optimizeImageUrl } from '@/lib/cloudinary';
import {
  Search, Clock, Users, Star, Code2, Database, Globe,
  Smartphone, Shield, Palette, TrendingUp, BookOpen, X, Award, User, Sparkles,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { NeonButton } from '@/components/ui/NeonButton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { useCourseStore } from '@/store/courseStore';
import { debounce, cn, formatCurrency } from '@/lib/utils';
import SEO from '@/components/seo/SEO';

const categories = ['All', 'Web Development', 'Data Science', 'Mobile', 'DevOps', 'Security', 'Design', 'AI', 'Programming', 'Computer Science', 'Databases', 'Networking', 'Cloud Computing', 'Software Engineering'];
const levels = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];
const sortOptions = [
  { value: '', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const getCategoryStyles = (category: string) => {
  switch (category.toLowerCase()) {
    case 'web development':
      return { icon: Code2, color: 'from-blue-500 to-cyan-500' };
    case 'data science':
      return { icon: Database, color: 'from-purple-500 to-pink-500' };
    case 'mobile':
      return { icon: Smartphone, color: 'from-green-500 to-emerald-500' };
    case 'devops':
      return { icon: Globe, color: 'from-orange-500 to-red-500' };
    case 'security':
      return { icon: Shield, color: 'from-red-500 to-rose-500' };
    case 'design':
      return { icon: Palette, color: 'from-pink-500 to-rose-500' };
    case 'ai':
      return { icon: TrendingUp, color: 'from-violet-500 to-purple-500' };
    default:
      return { icon: BookOpen, color: 'from-gray-500 to-slate-500' };
  }
};

const difficultyDots = {
  'Beginner': 1,
  'Intermediate': 2,
  'Advanced': 3,
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours} hours`;
};

export default function Courses() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [groupCategories, setGroupCategories] = useState<string[]>(
    (searchParams.get('categories') || '').split(',').map((value) => value.trim()).filter(Boolean)
  );
  const [level, setLevel] = useState('All Levels');
  const [sort, setSort] = useState('');
  const [page, setPage] = useState(1);
  
  const { courses, isLoading, error, pagination, fetchCourses } = useCourseStore();

  const debouncedSetSearch = useCallback(
    debounce((value: string) => setDebouncedSearch(value), 300),
    []
  );

  useEffect(() => {
    fetchCourses({
      category,
      categories: groupCategories,
      level,
      page,
      limit: 12,
      sort: sort || undefined,
    });
  }, [category, groupCategories, level, page, sort]);

  useEffect(() => {
    if (search !== debouncedSearch) {
      debouncedSetSearch(search);
    }
  }, [search]);

  useEffect(() => {
    if (debouncedSearch !== undefined) {
      setPage(1);
    }
  }, [debouncedSearch]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return courses;
    const q = debouncedSearch.toLowerCase();
    return courses.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  }, [courses, debouncedSearch]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setGroupCategories([]);
    setPage(1);
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLevel(e.target.value);
    setPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value);
    setPage(1);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SEO title="Courses" description="Browse our comprehensive catalog of software development, data science, cybersecurity, and cloud computing courses." />
      <section className="py-20 relative">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="max-w-screen-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Explore Our <span className="gradient-text">Courses</span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Choose from industry-designed courses and start your journey toward becoming a job-ready developer.
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex-1 min-w-0">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Select
                value={category}
                onChange={handleCategoryChange}
                options={categories.map(c => ({ value: c, label: c }))}
                className="w-auto min-w-[140px]"
              />
              <Select
                value={level}
                onChange={handleLevelChange}
                options={levels.map(l => ({ value: l, label: l }))}
                className="w-auto min-w-[130px]"
              />
              <Select
                value={sort}
                onChange={handleSortChange}
                options={sortOptions}
                className="w-auto min-w-[150px]"
              />
            </div>
          </div>

          {error && (
            <Alert variant="error" className="mb-6" action={
              <Button size="sm" variant="outline" onClick={() => fetchCourses({ category, level, page, limit: 12, sort: sort || undefined })}>
                Retry
              </Button>
            }>
              {error}
            </Alert>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader size="lg" text="Loading courses..." />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-8 h-8" />}
              title="No courses found"
              description={debouncedSearch ? `No courses matching "${debouncedSearch}"` : 'No courses available in this category yet.'}
              action={{ label: 'Clear filters', onClick: () => { setSearch(''); setDebouncedSearch(''); setCategory('All'); setGroupCategories([]); setLevel('All Levels'); setSort(''); } }}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {filtered.length} of {pagination.total} courses
                </p>
                {debouncedSearch && (
                  <button
                    onClick={() => { setSearch(''); setDebouncedSearch(''); }}
                    className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Clear search
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 5xl:grid-cols-6 gap-4 sm:gap-6">
                {filtered.map((course, i) => {
                  const style = getCategoryStyles(course.category);
                  const Icon = style.icon;
                  const isFree = Number(course.price) === 0;
                  const discountPercent = Number(course.promotion?.discount_percent || 0);
                  const hasDiscount = discountPercent > 0;
                  const discountedPrice = Number(course.effective_price ?? (Number(course.price) * (1 - discountPercent / 100)));
                  const rating = course.averageRating || course.avg_rating || 0;
                  const studentCount = course.enrollmentCount || course.student_count || 0;
                  const diffLevel = course.level || 'Beginner';
                  const dots = difficultyDots[diffLevel as keyof typeof difficultyDots] || 1;
                  return (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link to={`/courses/${course.slug}`}>
                        <GlassCard hover className="h-full p-0 group flex flex-col overflow-hidden relative">
                          {course.thumbnail ? (
                            <div className="relative h-36 overflow-hidden bg-gray-100 dark:bg-gray-800">
                              <img src={optimizeImageUrl(course.thumbnail, 400, 170)} alt={course.title} loading="lazy" width="400" height="250" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <NeonButton color="blue" size="sm" className="shadow-xl">
                                  Quick View
                                </NeonButton>
                              </div>
                              <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                                {hasDiscount ? (
                                  <Badge variant="danger" size="sm" className="shadow-lg">-{discountPercent}% off</Badge>
                                ) : (
                                  <Badge variant="success" size="sm" className="shadow-lg">Free trial</Badge>
                                )}
                                {!isFree && (
                                  <Badge variant="warning" size="sm" className="shadow-lg">7-day trial</Badge>
                                )}
                              </div>
                              {isFree && (
                                <div className="absolute top-2 right-2">
                                  <Badge variant="success" size="sm">Free</Badge>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={`mx-5 mt-5 w-12 h-12 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center mb-2`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div className="p-5 flex flex-col flex-1">
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              <Badge variant="primary" size="sm" className="capitalize">{course.level}</Badge>
                              <Badge variant="default" size="sm">{course.category}</Badge>
                            </div>

                            <h3 className="text-base font-semibold mb-1 group-hover:text-primary-500 transition-colors line-clamp-1">{course.title}</h3>

                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                                <User className="w-3 h-3 text-primary-500" />
                              </div>
                              <span className="text-xs text-gray-500 truncate">{course.instructor_name || 'Expert Instructor'}</span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                              <div className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                <span className="font-medium text-gray-700 dark:text-gray-300">{Number(rating).toFixed(1)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {studentCount}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 mb-3">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <span className="text-gray-400">Difficulty:</span>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3].map((d) => (
                                    <div key={d} className={cn('w-2 h-2 rounded-full', d <= dots ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-700')} />
                                  ))}
                                </div>
                              </div>
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 flex-1">{course.description}</p>
                            
                            <div className="mb-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                              {isFree ? (
                                <span className="text-success-500 font-bold text-lg">Free</span>
                              ) : hasDiscount ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(discountedPrice)}</span>
                                  <span className="text-sm text-gray-500 line-through">{formatCurrency(Number(course.price))}</span>
                                  <span className="text-xs text-success-500 font-medium">Save {formatCurrency(Number(course.price) - discountedPrice)}</span>
                                </div>
                              ) : (
                                <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(Number(course.price))}</span>
                              )}
                            </div>

                            {!isFree && (
                              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 mb-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Enroll now and enjoy 7 days free
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Trial unlocks every course. Or purchase this course only.</p>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium mb-2">
                              <span className="px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">Paystack</span>
                              <span className="px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">Flutterwave</span>
                              <span className="px-1.5 py-0.5 rounded-md bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">Secure checkout</span>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-auto">
                              <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(course.duration)}</div>
                              <div className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-amber-500" />Certificate</div>
                            </div>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {pagination.pages > 1 && (
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.pages}
                  totalItems={pagination.total}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      </section>
    </motion.div>
  );
}



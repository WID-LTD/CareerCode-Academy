import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, Star, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAdminStore } from '@/store/adminStore';

export default function AdminCourses() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { courses, coursesPagination, isLoading, fetchCourses, deleteCourse } = useAdminStore();

  useEffect(() => {
    fetchCourses(currentPage, 15);
  }, [fetchCourses, currentPage]);

  const handleDelete = async (courseId: string, title: string) => {
    if (confirm(`Are you sure you want to delete the course "${title}"? This cannot be undone.`)) {
      try {
        await deleteCourse(courseId);
      } catch (err: any) {
        alert(err.message || 'Failed to delete course');
      }
    }
  };

  const filtered = courses.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Course Management</h1>
          <p className="text-gray-500">Oversee all courses on the platform.</p>
        </div>
      </div>

      <div className="mb-6">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search courses by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && courses.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto min-h-[350px]">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left pb-3 pl-3">Course</th>
                  <th className="text-left pb-3">Price</th>
                  <th className="text-left pb-3">Category</th>
                  <th className="text-left pb-3">Level</th>
                  <th className="text-left pb-3">Status</th>
                  <th className="text-right pb-3 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.map((course) => (
                  <tr key={course.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 pl-3">
                      <div className="flex items-center gap-3">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt={course.title} className="w-9 h-9 rounded object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-sm text-gray-900 dark:text-white block">{course.title}</span>
                          <span className="text-xs text-gray-500">Instructor ID: {course.instructor_id.substring(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      {course.price ? `₦${parseFloat(course.price as any).toLocaleString()}` : 'Free'}
                    </td>
                    <td className="py-3 text-sm text-gray-500 capitalize">{course.category}</td>
                    <td className="py-3 text-sm text-gray-500 capitalize">{course.level}</td>
                    <td className="py-3">
                      <Badge variant={course.published ? 'success' : 'warning'} size="sm">
                        {course.published ? 'Published' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete Course"
                          icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                          onClick={() => handleDelete(course.id, course.title)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {coursesPagination && coursesPagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
              <span className="text-sm text-gray-500">
                Page {coursesPagination.page} of {coursesPagination.pages} ({coursesPagination.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= coursesPagination.pages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

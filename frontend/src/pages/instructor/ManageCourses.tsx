import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, BookOpen, Users, Star, Clock, Search, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useInstructorStore } from '@/store/instructorStore';

export default function ManageCourses() {
  const [search, setSearch] = useState('');
  const { myCourses, isLoading, fetchMyCourses, deleteCourse } = useInstructorStore();

  React.useEffect(() => {
    fetchMyCourses();
  }, [fetchMyCourses]);

  const filtered = myCourses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      await deleteCourse(id);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Manage Courses</h1>
          <p className="text-gray-500">Create, edit, and manage your courses.</p>
        </div>
        <Link to="/instructor/courses/new">
          <Button icon={<Plus className="w-4 h-4" />}>New Course</Button>
        </Link>
      </div>

      <div className="mb-6">
        <Input icon={<Search className="w-4 h-4" />} placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        </div>
      ) : (
      <div className="space-y-3">
        {filtered.map((course, i) => (
          <motion.div
            key={course.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <GlassCard hover className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{course.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.enrollmentCount || 0} students</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {course.averageRating ? course.averageRating.toFixed(1) : 'N/A'}</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {course.lessons?.length || 0} lessons</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration} mins</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        course.published ? 'success' : 'warning'
                      } size="sm">
                        {course.published ? 'published' : 'draft'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link to={`/courses/${course.slug}`}>
                    <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />} />
                  </Link>
                  <Link to={`/instructor/courses/${course.slug}/edit`}>
                    <Button variant="ghost" size="sm" icon={<Edit className="w-4 h-4" />} />
                  </Link>
                  <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4 text-red-500" />} onClick={() => handleDelete(course.id)} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
      )}
    </motion.div>
  );
}

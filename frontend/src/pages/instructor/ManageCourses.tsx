import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, BookOpen, Users, Star, Clock, Search } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const courses = [
  { title: 'Full-Stack Web Development', status: 'published', students: 342, rating: 4.9, lessons: 48, duration: '16 weeks', updated: '2025-05-28', slug: 'full-stack-web-development' },
  { title: 'Data Science & ML', status: 'published', students: 287, rating: 4.8, lessons: 60, duration: '20 weeks', updated: '2025-05-25', slug: 'data-science-ml' },
  { title: 'Mobile App Development', status: 'draft', students: 0, rating: 0, lessons: 24, duration: '14 weeks', updated: '2025-05-20', slug: 'mobile-app-development' },
  { title: 'Advanced React Patterns', status: 'draft', students: 0, rating: 0, lessons: 18, duration: '8 weeks', updated: '2025-05-15', slug: 'advanced-react' },
  { title: 'Cloud & DevOps', status: 'published', students: 198, rating: 4.7, lessons: 40, duration: '12 weeks', updated: '2025-05-10', slug: 'cloud-devops' },
  { title: 'Intro to Programming', status: 'archived', students: 156, rating: 4.5, lessons: 20, duration: '6 weeks', updated: '2025-04-01', slug: 'intro-programming' },
];

export default function ManageCourses() {
  const [search, setSearch] = useState('');

  const filtered = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

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
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.students} students</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> {course.rating || 'N/A'}</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {course.lessons} lessons</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        course.status === 'published' ? 'success' :
                        course.status === 'draft' ? 'warning' : 'default'
                      } size="sm">
                        {course.status}
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
                  <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4 text-red-500" />} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, Users, Star, DollarSign, Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const courses = [
  { title: 'Full-Stack Web Development', instructor: 'Dr. Alex Rivera', students: 2340, rating: 4.9, revenue: '$58,500', status: 'published', updated: '2025-05-28' },
  { title: 'Data Science & ML', instructor: 'Maya Patel', students: 1870, rating: 4.8, revenue: '$46,750', status: 'published', updated: '2025-05-25' },
  { title: 'Mobile App Development', instructor: 'David Kim', students: 1560, rating: 4.7, revenue: '$39,000', status: 'published', updated: '2025-05-20' },
  { title: 'Cloud & DevOps', instructor: 'Sarah Mitchell', students: 1120, rating: 4.9, revenue: '$28,000', status: 'published', updated: '2025-05-15' },
  { title: 'Cybersecurity Fundamentals', instructor: 'Dr. Alex Rivera', students: 980, rating: 4.6, revenue: '$24,500', status: 'draft', updated: '2025-05-10' },
  { title: 'Advanced React Patterns', instructor: 'Maya Patel', students: 0, rating: 0, revenue: '$0', status: 'draft', updated: '2025-05-05' },
];

export default function AdminCourses() {
  const [search, setSearch] = useState('');

  const filtered = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Course Management</h1>
          <p className="text-gray-500">Oversee all courses on the platform.</p>
        </div>
      </div>

      <div className="mb-6">
        <Input icon={<Search className="w-4 h-4" />} placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left pb-3 pl-3">Course</th>
              <th className="text-left pb-3">Instructor</th>
              <th className="text-left pb-3">Students</th>
              <th className="text-left pb-3">Rating</th>
              <th className="text-left pb-3">Revenue</th>
              <th className="text-left pb-3">Status</th>
              <th className="text-right pb-3 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {filtered.map((course) => (
              <tr key={course.title} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-3 pl-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{course.title}</span>
                  </div>
                </td>
                <td className="py-3 text-sm text-gray-500">{course.instructor}</td>
                <td className="py-3 text-sm text-gray-500">{course.students.toLocaleString()}</td>
                <td className="py-3">
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    {course.rating || 'N/A'}
                  </div>
                </td>
                <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">{course.revenue}</td>
                <td className="py-3">
                  <Badge variant={course.status === 'published' ? 'success' : 'warning'} size="sm">{course.status}</Badge>
                </td>
                <td className="py-3 pr-3 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />} />
                    <Button variant="ghost" size="sm" icon={<Edit className="w-3.5 h-3.5" />} />
                    <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

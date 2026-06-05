import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Mail, Star, BookOpen, MoreHorizontal, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const students = [
  { name: 'Emma Wilson', email: 'emma@example.com', courses: 3, progress: 85, rating: 4.9, joined: '2025-01-15', status: 'active', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { name: 'Michael Chen', email: 'michael@example.com', courses: 2, progress: 72, rating: 4.7, joined: '2025-02-20', status: 'active', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
  { name: 'Sarah Johnson', email: 'sarah@example.com', courses: 4, progress: 90, rating: 5.0, joined: '2025-01-10', status: 'active', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
  { name: 'James Wilson', email: 'james@example.com', courses: 1, progress: 45, rating: 4.5, joined: '2025-03-05', status: 'at-risk', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
  { name: 'Lisa Anderson', email: 'lisa@example.com', courses: 2, progress: 68, rating: 4.8, joined: '2025-02-01', status: 'active', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop' },
  { name: 'David Brown', email: 'david@example.com', courses: 3, progress: 35, rating: 4.2, joined: '2025-03-15', status: 'at-risk', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop' },
];

export default function Students() {
  const [search, setSearch] = useState('');

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Students</h1>
          <p className="text-gray-500">Manage and monitor your enrolled students.</p>
        </div>
        <Badge variant="primary" size="md">
          <Users className="w-4 h-4 inline mr-1" /> {students.length} Total
        </Badge>
      </div>

      <div className="mb-6">
        <Input icon={<Search className="w-4 h-4" />} placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left pb-3 pl-3">Student</th>
              <th className="text-left pb-3">Courses</th>
              <th className="text-left pb-3">Progress</th>
              <th className="text-left pb-3">Rating</th>
              <th className="text-left pb-3">Status</th>
              <th className="text-right pb-3 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {filtered.map((student) => (
              <tr key={student.email} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-3 pl-3">
                  <div className="flex items-center gap-3">
                    <img src={student.avatar} alt={student.name} className="w-9 h-9 rounded-full object-cover" />
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{student.name}</div>
                      <div className="text-xs text-gray-500">{student.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1 text-sm">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                    {student.courses}
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full gradient-bg rounded-full" style={{ width: `${student.progress}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-500">{student.progress}%</span>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    {student.rating}
                  </div>
                </td>
                <td className="py-3">
                  <Badge variant={student.status === 'active' ? 'success' : 'warning'} size="sm">
                    {student.status}
                  </Badge>
                </td>
                <td className="py-3 pr-3 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" icon={<Mail className="w-3.5 h-3.5" />} />
                    <Button variant="ghost" size="sm" icon={<TrendingUp className="w-3.5 h-3.5" />} />
                    <Button variant="ghost" size="sm" icon={<MoreHorizontal className="w-3.5 h-3.5" />} />
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

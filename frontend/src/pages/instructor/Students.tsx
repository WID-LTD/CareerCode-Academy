import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Mail, Star, BookOpen, MoreHorizontal, TrendingUp, Users, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/axios';

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchStudents() {
      try {
        const { data } = await api.get('/instructor/students');
        setStudents(data.data || []);
      } catch {
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const filtered = students.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Students</h1>
          <p className="text-gray-500">Manage and monitor your enrolled students.</p>
        </div>
        {!isLoading && <Badge variant="primary" size="md">
          <Users className="w-4 h-4 inline mr-1" /> {students.length} Total
        </Badge>}
      </div>

      <div className="mb-6">
        <Input icon={<Search className="w-4 h-4" />} placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : (
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
              <tr key={student.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-3 pl-3">
                  <div className="flex items-center gap-3">
                    {student.avatar ? (
                      <img src={student.avatar} alt={student.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                        {student.name?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{student.name}</div>
                      <div className="text-xs text-gray-500">{student.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1 text-sm">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                    {student.courses_count}
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full gradient-bg rounded-full" style={{ width: `${student.avg_progress}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-500">{student.avg_progress}%</span>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    {parseFloat(student.avg_rating).toFixed(1)}
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
      )}
    </motion.div>
  );
}

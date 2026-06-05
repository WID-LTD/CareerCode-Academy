import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle, Clock, Users, Search, Filter } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

const submissions = [
  { student: 'Emma Wilson', course: 'Full-Stack Web Development', assignment: 'React Component Library', submitted: '2025-06-01', status: 'pending', grade: null },
  { student: 'Michael Chen', course: 'Full-Stack Web Development', assignment: 'CSS Grid Challenge', submitted: '2025-05-30', status: 'graded', grade: 'A' },
  { student: 'Sarah Johnson', course: 'Data Science & ML', assignment: 'Data Analysis Report', submitted: '2025-05-28', status: 'graded', grade: 'A+' },
  { student: 'James Wilson', course: 'Mobile App Development', assignment: 'App Wireframe', submitted: '2025-05-25', status: 'pending', grade: null },
  { student: 'Lisa Anderson', course: 'Full-Stack Web Development', assignment: 'REST API Design', submitted: '2025-05-22', status: 'graded', grade: 'B+' },
  { student: 'David Brown', course: 'Data Science & ML', assignment: 'Data Visualization', submitted: '2025-05-20', status: 'pending', grade: null },
];

export default function InstructorAssignments() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = submissions.filter(s => {
    const matchSearch = s.student.toLowerCase().includes(search.toLowerCase()) || s.assignment.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || s.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Submissions</h1>
          <p className="text-gray-500">Review and grade student submissions.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input icon={<Search className="w-4 h-4" />} placeholder="Search students or assignments..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'graded'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize', filter === f ? 'bg-primary-500 text-white' : 'glass')}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((sub, i) => (
          <motion.div key={`${sub.student}-${sub.assignment}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <GlassCard className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0 text-white font-semibold">
                  {sub.student.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{sub.student}</h3>
                      <p className="text-sm text-gray-500">{sub.assignment}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.grade && <Badge variant="success" size="md">{sub.grade}</Badge>}
                      <Badge variant={sub.status === 'graded' ? 'success' : 'warning'} size="sm">{sub.status}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                    <span><Users className="w-3 h-3 inline" /> {sub.course}</span>
                    <span><Clock className="w-3 h-3 inline" /> Submitted: {sub.submitted}</span>
                    <div className="ml-auto flex gap-2">
                      <Button variant="ghost" size="sm" icon={<Download className="w-3.5 h-3.5" />}>Download</Button>
                      <Button variant="primary" size="sm" icon={<CheckCircle className="w-3.5 h-3.5" />}>Grade</Button>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

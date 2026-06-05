import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, CheckCircle, AlertCircle, Upload, Calendar, ChevronDown } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const assignments = [
  { title: 'Build a Personal Portfolio Page', course: 'Full-Stack Web Development', due: '2025-06-10', status: 'pending', grade: null, description: 'Create a responsive personal portfolio website using HTML5, CSS3, and JavaScript. Include sections for about, projects, skills, and contact.' },
  { title: 'CSS Grid Layout Challenge', course: 'Full-Stack Web Development', due: '2025-06-05', status: 'submitted', grade: 'A', description: 'Recreate a complex magazine-style layout using CSS Grid.' },
  { title: 'Data Analysis Report', course: 'Data Science & ML', due: '2025-06-15', status: 'in-progress', grade: null, description: 'Analyze the provided dataset and create a comprehensive report with visualizations.' },
  { title: 'JavaScript Calculator App', course: 'Full-Stack Web Development', due: '2025-05-28', status: 'graded', grade: 'A+', description: 'Build a fully functional calculator with basic arithmetic operations.' },
  { title: 'UI Component Library', course: 'UI/UX Design', due: '2025-06-20', status: 'not-started', grade: null, description: 'Design and document a reusable component library in Figma.' },
  { title: 'REST API Design', course: 'Backend Development', due: '2025-06-01', status: 'graded', grade: 'B+', description: 'Design and implement a RESTful API for a blog platform.' },
];

export default function Assignments() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? assignments : assignments.filter(a => a.status === filter);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Assignments</h1>
          <p className="text-gray-500">Track and submit your coursework.</p>
        </div>
        <Button variant="outline" icon={<Upload className="w-4 h-4" />}>Submit Assignment</Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'not-started', 'in-progress', 'submitted', 'graded', 'pending'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize',
              filter === f ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'glass hover:bg-white/80 dark:hover:bg-gray-800/80'
            )}
          >
            {f.replace('-', ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((assignment, i) => (
          <motion.div
            key={assignment.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <GlassCard hover className="p-5">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  assignment.status === 'graded' ? 'bg-green-500/10' :
                  assignment.status === 'submitted' ? 'bg-blue-500/10' :
                  assignment.status === 'in-progress' ? 'bg-yellow-500/10' :
                  assignment.status === 'pending' ? 'bg-orange-500/10' :
                  'bg-gray-500/10'
                }`}>
                  {assignment.status === 'graded' ? <CheckCircle className="w-5 h-5 text-green-500" /> :
                   assignment.status === 'submitted' ? <Upload className="w-5 h-5 text-blue-500" /> :
                   assignment.status === 'in-progress' ? <Clock className="w-5 h-5 text-yellow-500" /> :
                   assignment.status === 'pending' ? <AlertCircle className="w-5 h-5 text-orange-500" /> :
                   <FileText className="w-5 h-5 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{assignment.title}</h3>
                      <p className="text-sm text-gray-500">{assignment.course}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {assignment.grade && <Badge variant="success" size="md">{assignment.grade}</Badge>}
                      <Badge variant={
                        assignment.status === 'graded' ? 'success' :
                        assignment.status === 'submitted' ? 'primary' :
                        assignment.status === 'in-progress' ? 'warning' :
                        assignment.status === 'pending' ? 'warning' : 'default'
                      } size="sm">
                        {assignment.status.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-1">{assignment.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {assignment.due}</div>
                    {assignment.status !== 'not-started' && assignment.status !== 'graded' && (
                      <Button variant="ghost" size="sm">View Details</Button>
                    )}
                    {assignment.status === 'not-started' && (
                      <Button variant="primary" size="sm">Start Assignment</Button>
                    )}
                    {assignment.status === 'pending' && (
                      <Button variant="primary" size="sm">Submit Now</Button>
                    )}
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

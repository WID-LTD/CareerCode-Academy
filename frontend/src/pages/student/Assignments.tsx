import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Clock, CheckCircle, AlertCircle, Upload, Calendar, X, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/utils';
import { useStudentStore } from '@/store/studentStore';

export default function Assignments() {
  const { assignments, assignmentsPagination, fetchAssignments, submitAssignment, isLoading } = useStudentStore();
  const [filter, setFilter] = useState('all');
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    fetchAssignments({ page, limit: pageSize });
  }, [fetchAssignments, page, pageSize]);

  const filtered = filter === 'all' ? assignments : assignments.filter(a => a.status === filter);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !fileUrl) return;
    
    setIsSubmitting(true);
    try {
      await submitAssignment(selectedAssignment, fileUrl);
      setSelectedAssignment(null);
      setFileUrl('');
    } catch (error) {
      // Silently handle
    } finally {
      setIsSubmitting(false);
    }
  };


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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : (
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
                    {assignment.feedback && (
                      <div className="ml-4 text-xs text-primary-500 max-w-xs truncate" title={assignment.feedback}>
                        Feedback: {assignment.feedback}
                      </div>
                    )}
                    <div className="flex-1" />
                    {assignment.status !== 'not-started' && assignment.status !== 'graded' && assignment.status !== 'submitted' && (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedAssignment(assignment.id)}>Submit Now</Button>
                    )}
                    {assignment.status === 'not-started' && (
                      <Button variant="primary" size="sm" onClick={() => setSelectedAssignment(assignment.id)}>Start Assignment</Button>
                    )}
                    {assignment.status === 'pending' && (
                      <Button variant="primary" size="sm" onClick={() => setSelectedAssignment(assignment.id)}>Submit Now</Button>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No assignments found.
          </div>
        )}
      </div>
      )}

      {assignmentsPagination && (
        <Pagination
          page={page}
          totalPages={assignmentsPagination.pages}
          totalItems={assignmentsPagination.total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Submission Modal */}
      <AnimatePresence>
        {selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h2 className="text-xl font-bold">Submit Assignment</h2>
                <button onClick={() => setSelectedAssignment(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Project URL / File Link</label>
                  <Input 
                    placeholder="https://github.com/..." 
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">Please provide a link to your repository, live project, or Google Doc.</p>
                </div>
                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setSelectedAssignment(null)}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting || !fileUrl}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Submit'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

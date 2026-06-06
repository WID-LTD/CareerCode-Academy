import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInstructorExtendedStore } from '@/store/instructorExtendedStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FileText, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InstructorSubmissions() {
  const { submissions, fetchSubmissions, gradeSubmission, isLoading } = useInstructorExtendedStore();
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [score, setScore] = useState<number | ''>('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleGradeSubmit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (score === '') return toast.error('Please enter a score');
    try {
      await gradeSubmission(id, Number(score), feedback);
      toast.success('Submission graded successfully');
      setGradingId(null);
      setScore('');
      setFeedback('');
    } catch (error) {
      toast.error('Failed to grade submission');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Submissions & Grading</h1>
        <p className="text-gray-500">Review student assignments and provide feedback.</p>
      </div>

      <div className="space-y-4">
        {submissions.map((sub) => (
          <GlassCard key={sub.id} className="p-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{sub.assignment_title}</h3>
                  {sub.score !== null ? (
                    <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Graded</Badge>
                  ) : (
                    <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
                  )}
                </div>
                <div className="text-sm text-gray-500 mb-4">
                  Submitted by <span className="font-medium text-gray-900 dark:text-gray-100">{sub.student_name}</span> ({sub.student_email}) on {new Date(sub.submitted_at).toLocaleDateString()}
                </div>
                
                {sub.file_url && (
                  <a href={sub.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 mb-4 bg-primary-50 dark:bg-primary-900/10 px-3 py-2 rounded-lg transition-colors">
                    <FileText className="w-4 h-4" />
                    View Submission File
                  </a>
                )}

                {sub.score !== null && gradingId !== sub.id && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mt-4">
                    <div className="font-medium mb-1">Score: {sub.score} / {sub.max_score}</div>
                    {sub.feedback && <div className="text-sm text-gray-600 dark:text-gray-300">Feedback: {sub.feedback}</div>}
                  </div>
                )}
              </div>

              <div className="w-full md:w-auto">
                {gradingId === sub.id ? (
                  <form onSubmit={(e) => handleGradeSubmit(e, sub.id)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-xl min-w-[300px]">
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Score (out of {sub.max_score})</label>
                      <input 
                        type="number" 
                        max={sub.max_score}
                        min={0}
                        required
                        value={score}
                        onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Feedback</label>
                      <textarea 
                        rows={3}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent resize-none"
                      ></textarea>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setGradingId(null)}>Cancel</Button>
                      <Button type="submit" variant="primary" className="flex-1">Save Grade</Button>
                    </div>
                  </form>
                ) : (
                  <Button variant="outline" onClick={() => {
                    setGradingId(sub.id);
                    setScore(sub.score ?? '');
                    setFeedback(sub.feedback ?? '');
                  }}>
                    {sub.score !== null ? 'Edit Grade' : 'Grade Submission'}
                  </Button>
                )}
              </div>
            </div>
          </GlassCard>
        ))}

        {submissions.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            No submissions found for your courses.
          </div>
        )}
      </div>
    </motion.div>
  );
}

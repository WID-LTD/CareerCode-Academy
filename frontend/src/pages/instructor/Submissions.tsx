import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FileText, CheckCircle, Clock, Code, ChevronDown, ChevronUp } from 'lucide-react';
import CodeEditor from '@/components/student/CodeEditor';
import { api } from '@/lib/axios';
import toast from 'react-hot-toast';
import { PageSkeleton } from '@/components/student/SkeletonLoader';

type Tab = 'assignments' | 'challenges';

export default function InstructorSubmissions() {
  const [tab, setTab] = useState<Tab>('assignments');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [challengeSubs, setChallengeSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [score, setScore] = useState<number | ''>('');
  const [feedback, setFeedback] = useState('');
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignRes, challengeRes] = await Promise.all([
        api.get('/instructor/submissions'),
        api.get('/instructor/challenge-submissions'),
      ]);
      setSubmissions(assignRes.data.data || []);
      setChallengeSubs(challengeRes.data.data || []);
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent, id: string, type: Tab) => {
    e.preventDefault();
    if (score === '') return toast.error('Please enter a score');
    try {
      const endpoint = type === 'assignments'
        ? `/instructor/submissions/${id}/grade`
        : `/instructor/challenge-submissions/${id}/grade`;
      await api.put(endpoint, { score: Number(score), feedback });
      toast.success('Submission graded successfully');
      setGradingId(null);
      setScore('');
      setFeedback('');
      fetchData();
    } catch {
      toast.error('Failed to grade submission');
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Submissions & Grading</h1>
        <p className="text-gray-500">Review student submissions and provide feedback.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-800">
        {([
          { key: 'assignments' as Tab, label: 'Assignments', count: submissions.length },
          { key: 'challenges' as Tab, label: 'Challenges', count: challengeSubs.length },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'text-blue-400 border-blue-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {tab === 'assignments' && submissions.map((sub) => (
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
                  <form onSubmit={(e) => handleGradeSubmit(e, sub.id, 'assignments')} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-xl min-w-[300px]">
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Score (out of {sub.max_score})</label>
                      <input type="number" max={sub.max_score} min={0} required value={score}
                        onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent" />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Feedback</label>
                      <textarea rows={3} value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent resize-none" />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setGradingId(null)}>Cancel</Button>
                      <Button type="submit" variant="primary" className="flex-1">Save Grade</Button>
                    </div>
                  </form>
                ) : (
                  <Button variant="outline" onClick={() => { setGradingId(sub.id); setScore(sub.score ?? ''); setFeedback(sub.feedback ?? ''); }}>
                    {sub.score !== null ? 'Edit Grade' : 'Grade Submission'}
                  </Button>
                )}
              </div>
            </div>
          </GlassCard>
        ))}

        {tab === 'challenges' && challengeSubs.map((sub) => (
          <GlassCard key={sub.id} className="p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-lg">{sub.challenge_title}</h3>
                  {sub.score !== null ? (
                    <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Graded</Badge>
                  ) : (
                    <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
                  )}
                  <Badge className="bg-blue-500/10 text-blue-400">{sub.language}</Badge>
                </div>
                <div className="text-sm text-gray-500">
                  Submitted by <span className="font-medium text-gray-900 dark:text-gray-100">{sub.student_name}</span> ({sub.student_email})
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {sub.course_title} &mdash; {sub.lesson_title}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}>
                {expandedSub === sub.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {expandedSub === sub.id && (
              <div className="mt-3 pt-3 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2">Submitted Code:</p>
                <div className="rounded-lg overflow-hidden border border-gray-800">
                  <CodeEditor
                    language={sub.language || 'javascript'}
                    initialCode={sub.code}
                    readOnly
                  />
                </div>

                {sub.score !== null && gradingId !== sub.id && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mt-4">
                    <div className="font-medium mb-1">Score: {sub.score}</div>
                    {sub.feedback && <div className="text-sm text-gray-600 dark:text-gray-300">Feedback: {sub.feedback}</div>}
                  </div>
                )}

                <div className="mt-4">
                  {gradingId === sub.id ? (
                    <form onSubmit={(e) => handleGradeSubmit(e, sub.id, 'challenges')} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-xl">
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Score</label>
                        <input type="number" min={0} max={100} required value={score}
                          onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent" />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Feedback</label>
                        <textarea rows={3} value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent resize-none" />
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setGradingId(null)}>Cancel</Button>
                        <Button type="submit" variant="primary" className="flex-1">Save Grade</Button>
                      </div>
                    </form>
                  ) : (
                    <Button variant="outline" onClick={() => { setGradingId(sub.id); setScore(sub.score ?? ''); setFeedback(sub.feedback ?? ''); }}>
                      {sub.score !== null ? 'Edit Grade' : 'Grade Submission'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </GlassCard>
        ))}

        {tab === 'assignments' && submissions.length === 0 && (
          <div className="text-center py-12 text-gray-500">No assignment submissions found.</div>
        )}
        {tab === 'challenges' && challengeSubs.length === 0 && (
          <div className="text-center py-12 text-gray-500">No challenge submissions found.</div>
        )}
      </div>
    </motion.div>
  );
}

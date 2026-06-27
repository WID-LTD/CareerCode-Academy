import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FileText, CheckCircle, Clock, Code, ChevronDown, ChevronUp, Palette, Image, Briefcase, PenLine, ExternalLink, BookOpen } from 'lucide-react';
import CodeEditor from '@/components/student/CodeEditor';
import { api } from '@/lib/axios';
import toast from 'react-hot-toast';
import { PageSkeleton } from '@/components/student/SkeletonLoader';

type Tab = 'assignments' | 'challenges';
type Filter = 'all' | 'pending' | 'graded';

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  code: { icon: Code, label: 'Code', color: 'text-purple-500 bg-purple-500/10' },
  practical: { icon: FileText, label: 'Practical', color: 'text-orange-500 bg-orange-500/10' },
  design: { icon: Palette, label: 'Design', color: 'text-pink-500 bg-pink-500/10' },
  media: { icon: Image, label: 'Media', color: 'text-cyan-500 bg-cyan-500/10' },
  business: { icon: Briefcase, label: 'Business', color: 'text-emerald-500 bg-emerald-500/10' },
  essay: { icon: PenLine, label: 'Essay', color: 'text-amber-500 bg-amber-500/10' },
};

export default function InstructorSubmissions() {
  const [tab, setTab] = useState<Tab>('challenges');
  const [filter, setFilter] = useState<Filter>('all');
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

  const filteredChallenges = challengeSubs.filter((sub) => {
    if (filter === 'pending') return sub.score === null;
    if (filter === 'graded') return sub.score !== null;
    return true;
  });

  const pendingCount = challengeSubs.filter((s) => s.score === null).length;

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
          { key: 'challenges' as Tab, label: 'Challenges', count: challengeSubs.length, pending: pendingCount },
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
            {(t as any).pending > 0 && (
              <Badge className="ml-1.5 bg-amber-500/20 text-amber-400 text-[10px]">{(t as any).pending} pending</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Challenge filter tabs */}
      {tab === 'challenges' && (
        <div className="flex gap-3 mb-4">
          {(['all', 'pending', 'graded'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filter === f
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-800/50 text-gray-500 hover:text-gray-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

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

        {tab === 'challenges' && filteredChallenges.map((sub) => {
          const tc = typeConfig[sub.type] || typeConfig.code;
          const TypeIcon = tc.icon;
          const isCodeType = sub.type === 'code' || !sub.type;

          return (
            <GlassCard key={sub.id} className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tc.color}`}>
                      <TypeIcon className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-semibold text-lg">{sub.challenge_title}</h3>
                    {sub.score !== null ? (
                      <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Graded</Badge>
                    ) : (
                      <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
                    )}
                    <Badge className="bg-gray-500/10 text-gray-400 text-[10px]">{tc.label}</Badge>
                    {sub.difficulty && (
                      <Badge className="bg-blue-500/10 text-blue-400 text-[10px]">{sub.difficulty}</Badge>
                    )}
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
                <div className="mt-3 pt-3 border-t border-gray-800 space-y-4">
                  {/* Code content */}
                  {isCodeType && sub.code && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Submitted Code:</p>
                      <div className="rounded-lg overflow-hidden border border-gray-800">
                        <CodeEditor
                          language={sub.language || 'javascript'}
                          initialCode={sub.code}
                          readOnly
                        />
                      </div>
                    </div>
                  )}

                  {/* Non-code content */}
                  {!isCodeType && (
                    <div className="space-y-3">
                      {sub.file_url && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Submitted File:</p>
                          <a
                            href={sub.file_url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 bg-primary-900/10 px-3 py-2 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Submission File
                            {sub.allowed_file_types && (
                              <span className="text-gray-500 text-[10px]">({sub.allowed_file_types})</span>
                            )}
                          </a>
                        </div>
                      )}
                      {sub.text_answer && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Text Answer:</p>
                          <div className="bg-gray-800/50 rounded-xl p-4 text-sm text-gray-300 whitespace-pre-wrap">
                            {sub.text_answer}
                          </div>
                        </div>
                      )}
                      {!sub.file_url && !sub.text_answer && (
                        <p className="text-xs text-gray-500 italic">No submission content available.</p>
                      )}
                    </div>
                  )}

                  {/* Rubric hint */}
                  {sub.rubric && gradingId === sub.id && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs font-medium text-amber-400 mb-1 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Rubric
                      </p>
                      <p className="text-xs text-amber-300/80 whitespace-pre-wrap">{sub.rubric}</p>
                    </div>
                  )}

                  {/* Existing grade display */}
                  {sub.score !== null && gradingId !== sub.id && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                      <div className="font-medium mb-1">Score: {sub.score}/100</div>
                      {sub.feedback && <div className="text-sm text-gray-600 dark:text-gray-300">Feedback: {sub.feedback}</div>}
                    </div>
                  )}

                  {/* Grade form */}
                  <div>
                    {gradingId === sub.id ? (
                      <form onSubmit={(e) => handleGradeSubmit(e, sub.id, 'challenges')} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-xl">
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-1">Score (0-100)</label>
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
          );
        })}

        {tab === 'assignments' && submissions.length === 0 && (
          <div className="text-center py-12 text-gray-500">No assignment submissions found.</div>
        )}
        {tab === 'challenges' && filteredChallenges.length === 0 && (
          <div className="text-center py-12 text-gray-500">No {filter !== 'all' ? filter : ''} challenge submissions found.</div>
        )}
      </div>
    </motion.div>
  );
}
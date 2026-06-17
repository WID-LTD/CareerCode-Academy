import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Award, Clock, ArrowLeft, Loader2, PartyPopper, AlertTriangle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/axios';
import toast from 'react-hot-toast';

export default function ExamResults() {
  const { examId, attemptId } = useParams<{ examId: string; attemptId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [examId, attemptId]);

  const loadResults = async () => {
    if (!examId || !attemptId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/exams/student/${examId}/results/${attemptId}`);
      setResult(data.data);
    } catch {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>Result not found.</p>
        <Link to="/student/exams" className="text-primary-400 hover:underline mt-2 inline-block">Back to Exams</Link>
      </div>
    );
  }

  const { attempt, exam, answers } = result;
  const passed = attempt.passed;
  const score = attempt.score;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/student/exams')}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Exams
      </Button>

      {/* Score Card */}
      <GlassCard className={`p-6 text-center ${passed ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
        {passed ? (
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5 }}>
            <PartyPopper className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
          </motion.div>
        ) : (
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-3" />
        )}

        <h1 className={`text-2xl font-bold mb-1 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
          {passed ? 'Congratulations!' : 'Not Passed'}
        </h1>
        <p className="text-gray-500 mb-4">{exam?.title}</p>

        <div className="flex items-center justify-center gap-8 mb-4">
          <div className="text-center">
            <p className="text-4xl font-bold text-white">{score}%</p>
            <p className="text-xs text-gray-500 mt-1">Your Score</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-400">{exam?.passing_score}%</p>
            <p className="text-xs text-gray-500 mt-1">Passing Score</p>
          </div>
        </div>

        <Badge variant={passed ? 'success' : 'danger'} size="md" className="text-base px-6 py-2">
          {passed ? 'PASSED' : 'FAILED'}
        </Badge>
      </GlassCard>

      {/* Summary */}
      <GlassCard className="p-5">
        <h2 className="font-semibold mb-3">Summary</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Status</span>
            <p className="font-medium capitalize">{attempt.status}</p>
          </div>
          <div>
            <span className="text-gray-500">Submitted</span>
            <p className="font-medium">{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">Questions</span>
            <p className="font-medium">{answers?.length || 0}</p>
          </div>
          <div>
            <span className="text-gray-500">Correct</span>
            <p className="font-medium text-emerald-400">{answers?.filter((a: any) => a.is_correct).length || 0}</p>
          </div>
          {exam?.negative_marking && (
            <div className="col-span-2">
              <span className="text-gray-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-red-400" />Negative Marking</span>
              <p className="font-medium text-red-400">{exam.negative_percentage}% deducted per wrong answer</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Answer Review */}
      {exam?.show_results !== false && answers?.length > 0 && (
        <GlassCard className="p-5">
          <h2 className="font-semibold mb-4">Answer Review</h2>
          <div className="space-y-4">
            {answers.map((ans: any, i: number) => (
              <div key={ans.id} className={`p-4 rounded-xl ${
                ans.is_correct ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-red-500/5 border border-red-500/10'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {ans.is_correct ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary-400">Q{i + 1}</span>
                      <Badge className="text-[10px]">{ans.question_type}</Badge>
                      <span className="text-[10px] text-gray-500">{ans.points} pt(s)</span>
                    </div>
                    <p className="text-sm mb-2">{ans.question}</p>
                    <div className="text-xs space-y-1">
                      <p>Your answer: <span className={ans.is_correct ? 'text-emerald-400' : 'text-red-400'}>{ans.answer || '(no answer)'}</span></p>
                      {!ans.is_correct && (
                        <p>Correct answer: <span className="text-emerald-400">{ans.correct_answer}</span></p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Points earned: {ans.points_earned}/{ans.points}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <div className="flex justify-center gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate('/student/exams')}>Back to Exams</Button>
        {passed && (
          <Link to="/student/certificates">
            <Button>View Certificates</Button>
          </Link>
        )}
      </div>
    </motion.div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, Loader2, ChevronLeft, ChevronRight, Flag, CheckCircle, XCircle, Eye } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/axios';
import toast from 'react-hot-toast';

export default function ExamTake() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const [warnTime, setWarnTime] = useState(false);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    loadExam();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examId]);

  const loadExam = async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const startRes = await api.post(`/exams/student/${examId}/start`);
      setAttemptId(startRes.data.data.attempt.id);

      const { data } = await api.get(`/exams/student/${examId}`);
      setExam(data.data);
      setQuestions(data.data.questions || []);

      const durationMs = (data.data.duration_minutes || 60) * 60;
      setTimeLeft(durationMs);

      if (startRes.data.data.resumed && data.data.activeAttemptStartedAt) {
        const startedAt = new Date(data.data.activeAttemptStartedAt).getTime();
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        const remaining = Math.max(0, durationMs - elapsed);
        setTimeLeft(remaining);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load exam');
      navigate('/student/exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitting) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        const newTime = prev - 1;
        if (newTime <= 300) setWarnTime(true);
        return newTime;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, submitting]);

  const handleTimeout = useCallback(async () => {
    if (!examId || !attemptId) return;
    try {
      const { data } = await api.post(`/exams/student/${examId}/timeout`);
      toast('Time is up! Your exam has been auto-submitted.');
      navigate(`/student/exams/${examId}/results/${data.data.attemptId}`);
    } catch {
      toast.error('Failed to submit on timeout');
    }
  }, [examId, attemptId]);

  const handleSubmit = async () => {
    if (!examId || !attemptId || !questions.length) return;
    if (!confirm('Are you sure you want to submit your exam?')) return;

    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const answerArray = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    try {
      const { data } = await api.post(`/exams/student/${examId}/submit`, {
        answers: answerArray,
        flaggedQuestions,
      });
      toast.success(data.data.passed ? 'Congratulations! You passed!' : 'You did not pass this time.');
      navigate(`/student/exams/${examId}/results/${data.data.attemptId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit');
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flaggedQuestions.length;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleFlag = (qId: string) => {
    setFlaggedQuestions(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!exam) return null;

  // Review screen
  if (showReview) {
    return (
      <div className="min-h-[80vh] flex flex-col">
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-white font-semibold text-sm">Review Your Answers</h1>
          <Button size="sm" variant="outline" onClick={() => setShowReview(false)}>Back to Exam</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {questions.map((q, i) => {
            const ans = answers[q.id];
            return (
              <GlassCard key={q.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary-400">Q{i + 1}</span>
                    <Badge className="text-[10px]">{q.question_type}</Badge>
                    {flaggedQuestions.includes(q.id) && <Flag className="w-3.5 h-3.5 text-yellow-400" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {ans ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-500" />
                    )}
                    <span className={`text-xs ${ans ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {ans ? 'Answered' : 'Unanswered'}
                    </span>
                  </div>
                </div>
                <p className="text-sm mb-2">{q.question}</p>
                {q.question_type === 'essay' ? (
                  <div className="p-3 rounded-lg bg-gray-800/50">
                    <p className="text-xs text-gray-500 mb-1">Your answer:</p>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{ans || '(no answer)'}</p>
                  </div>
                ) : (
                  <p className="text-sm">Selected: <span className={ans ? 'text-emerald-400' : 'text-gray-500'}>{ans || '(none)'}</span></p>
                )}
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => { setCurrentIndex(i); setShowReview(false); }}>
                  Edit Answer
                </Button>
              </GlassCard>
            );
          })}

          <div className="flex justify-center gap-3 pb-8">
            <Button variant="outline" onClick={() => setShowReview(false)}>Back to Exam</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Submit Exam
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Header with timer and progress */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h1 className="text-white font-semibold text-sm truncate">{exam.title}</h1>
          <p className="text-gray-500 text-xs">{exam.course_title}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-32 bg-gray-800 rounded-full h-2">
              <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500">{answeredCount}/{questions.length}</span>
          </div>

          {flaggedCount > 0 && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <Flag className="w-3 h-3" /> {flaggedCount}
            </span>
          )}

          {exam.negative_marking && (
            <span className="text-xs text-red-400">-{exam.negative_percentage}%/wrong</span>
          )}

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold ${
            warnTime ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-gray-800 text-gray-200'
          }`}>
            <Clock className="w-4 h-4" />
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question Navigator */}
        <div className="w-20 lg:w-28 bg-gray-900 border-r border-gray-800 overflow-y-auto shrink-0 p-2">
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-1.5">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-full aspect-square rounded-lg text-xs font-medium transition-colors relative ${
                  i === currentIndex
                    ? 'bg-primary-500 text-white'
                    : answers[q.id]
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                }`}
              >
                {i + 1}
                {flaggedQuestions.includes(q.id) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Review button */}
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-3 text-[10px]"
            onClick={() => setShowReview(true)}
          >
            <Eye className="w-3 h-3 mr-1" /> Review
          </Button>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {currentQuestion && (
              <motion.div key={currentQuestion.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge>Question {currentIndex + 1} of {questions.length}</Badge>
                    <Badge className="bg-blue-500/10 text-blue-400 text-[10px]">{currentQuestion.question_type}</Badge>
                    <span className="text-xs text-gray-500">{currentQuestion.points} pt(s)</span>
                  </div>
                  <button
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className={`p-1.5 rounded-lg transition-colors ${flaggedQuestions.includes(currentQuestion.id) ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 hover:text-gray-300'}`}
                    title={flaggedQuestions.includes(currentQuestion.id) ? 'Unflag question' : 'Flag for review'}
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                </div>

                <h2 className="text-lg font-medium text-white mb-6">{currentQuestion.question}</h2>

                {currentQuestion.question_type === 'essay' ? (
                  <textarea
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
                    className="w-full h-48 rounded-xl bg-gray-800 border border-gray-700 text-gray-200 p-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500/50 resize-none"
                    placeholder="Type your answer here..."
                  />
                ) : (
                  <div className="space-y-3">
                    {(currentQuestion.options || []).map((opt: string, i: number) => {
                      const isSelected = answers[currentQuestion.id] === opt;
                      return (
                        <label
                          key={i}
                          className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-primary-500/10 border border-primary-500/30'
                              : 'bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-600'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-sm text-gray-200">{opt}</span>
                          <input
                            type="radio"
                            name={`q-${currentQuestion.id}`}
                            value={opt}
                            checked={isSelected}
                            onChange={() => setAnswers({ ...answers, [currentQuestion.id]: opt })}
                            className="hidden"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="bg-gray-900 border-t border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {currentIndex + 1} / {questions.length}
              </span>
            </div>

            {currentIndex < questions.length - 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowReview(true)}
              >
                <Eye className="w-4 h-4 mr-1" /> Review & Submit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

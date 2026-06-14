import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuizStore } from '@/store/quizStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import {
  Clock, AlertCircle, CheckCircle, XCircle, FileQuestion,
  ArrowLeft, ArrowRight, Send, Loader2, BarChart3,
} from 'lucide-react';

export default function StudentQuizTake() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { currentQuiz, isLoading, submitting, error, fetchQuiz, submitAttempt, clearCurrentQuiz, clearError } = useQuizStore();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (quizId) fetchQuiz(quizId);
    return () => { clearCurrentQuiz(); if (timerRef.current) clearInterval(timerRef.current); };
  }, [quizId]);

  useEffect(() => {
    if (currentQuiz && currentQuiz.time_limit > 0) {
      setTimeLeft(currentQuiz.time_limit * 60);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [currentQuiz?.id]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!quizId) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const formatted = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
    const res = await submitAttempt(quizId, formatted);
    if (res) setResult(res);
  };

  const questions = currentQuiz?.questions || [];
  const progress = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0;

  // Loading
  if (isLoading && !currentQuiz) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // Error
  if (error && !currentQuiz) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-8 text-center max-w-md" hover={false}>
          <AlertCircle className="w-12 h-12 text-danger-400 mx-auto mb-3" />
          <p className="font-medium mb-1">Unable to load quiz</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="primary" onClick={() => quizId && fetchQuiz(quizId)}>Retry</Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Result view
  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto">
        <GlassCard className={`p-8 text-center ${result.passed ? 'border-success-500/30' : 'border-danger-500/30'}`} hover={false}>
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${result.passed ? 'bg-success-500/10' : 'bg-danger-500/10'}`}>
            {result.passed ? <CheckCircle className="w-10 h-10 text-success-500" /> : <XCircle className="w-10 h-10 text-danger-500" />}
          </div>
          <h2 className="text-2xl font-bold mb-1">{result.passed ? 'Congratulations!' : 'Not this time'}</h2>
          <p className="text-gray-500 text-sm mb-6">{result.passed ? 'You passed the quiz!' : 'Keep studying and try again.'}</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-2xl font-bold text-primary-500">{result.score}%</p>
              <p className="text-xs text-gray-500">Your Score</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-2xl font-bold">{result.correctCount}/{result.totalQuestions}</p>
              <p className="text-xs text-gray-500">Correct</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className={`text-2xl font-bold ${result.passed ? 'text-success-500' : 'text-danger-500'}`}>{result.passed ? 'Passed' : 'Failed'}</p>
              <p className="text-xs text-gray-500">Status</p>
            </div>
          </div>
          <Button variant="primary" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Course
          </Button>
        </GlassCard>

        {/* Review answers */}
        <GlassCard className="mt-4 p-5" hover={false}>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary-500" /> Review Answers</h3>
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const userAns = answers[q.id] || 'No answer';
              const isCorrect = userAns === q.correct_answer;
              return (
                <div key={q.id} className={`p-4 rounded-xl ${isCorrect ? 'bg-success-50 dark:bg-success-900/10 border border-success-200 dark:border-success-900/30' : 'bg-danger-50 dark:bg-danger-900/10 border border-danger-200 dark:border-danger-900/30'}`}>
                  <p className="text-sm font-medium mb-2"><span className={isCorrect ? 'text-success-600' : 'text-danger-600'}>Q{idx + 1}.</span> {q.question}</p>
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => {
                      const isSelected = userAns === opt;
                      const isCorrectOpt = opt === q.correct_answer;
                      return (
                        <div key={oi} className={`text-xs px-3 py-1.5 rounded-lg ${isCorrectOpt ? 'bg-success-500/10 text-success-600 font-medium' : isSelected && !isCorrectOpt ? 'bg-danger-500/10 text-danger-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                          {String.fromCharCode(65 + oi)}. {opt}
                          {isCorrectOpt && <CheckCircle className="w-3 h-3 inline ml-1 text-success-500" />}
                          {isSelected && !isCorrectOpt && <XCircle className="w-3 h-3 inline ml-1 text-danger-500" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>
    );
  }

  // Quiz taking view
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-4">
      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <span className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</span>
          <Button size="sm" variant="ghost" onClick={clearError}>Dismiss</Button>
        </div>
      )}

      {/* Header */}
      <GlassCard className="p-4" hover={false}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">{currentQuiz?.title}</h1>
            <p className="text-xs text-gray-500 mt-0.5">{currentQuiz?.description}</p>
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${timeLeft < 60 ? 'bg-danger-50 text-danger-600 animate-pulse' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{Object.keys(answers).length} of {questions.length} answered</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </GlassCard>

      {/* Question card */}
      {questions.length > 0 && (
        <GlassCard className="p-6" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-primary-500 bg-primary-500/10 px-2.5 py-1 rounded-full">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-xs text-gray-400">{questions[currentIndex].points} point{questions[currentIndex].points > 1 ? 's' : ''}</span>
          </div>
          <h2 className="text-lg font-medium mb-5">{questions[currentIndex].question}</h2>
          <div className="space-y-2.5">
            {questions[currentIndex].options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => setAnswers({ ...answers, [questions[currentIndex].id]: opt })}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${
                  answers[questions[currentIndex].id] === opt
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-300 font-medium'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span> {opt}
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {questions.length === 0 && !isLoading && (
        <GlassCard className="p-8 text-center" hover={false}>
          <FileQuestion className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">This quiz has no questions yet.</p>
        </GlassCard>
      )}

      {/* Navigation */}
      {questions.length > 0 && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <div className="flex items-center gap-2">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  idx === currentIndex
                    ? 'bg-primary-500 text-white'
                    : answers[questions[idx].id]
                    ? 'bg-primary-500/10 text-primary-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          {currentIndex < questions.length - 1 ? (
            <Button variant="ghost" onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Submit
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

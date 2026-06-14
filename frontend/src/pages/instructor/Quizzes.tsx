import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuizStore } from '@/store/quizStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import {
  Plus, Edit3, Trash2, X, Check, ChevronDown, ChevronUp,
  Clock, FileQuestion, Users, BarChart3, Save, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InstructorQuizzes() {
  const {
    quizzes, currentQuiz, instructorCourses, isLoading, error,
    fetchQuizzesByCourse, fetchQuiz, createQuiz, updateQuiz, deleteQuiz,
    addQuestion, updateQuestion, deleteQuestion, fetchInstructorCourses, clearCurrentQuiz, clearError,
  } = useQuizStore();

  const [selectedCourse, setSelectedCourse] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [quizForm, setQuizForm] = useState({ title: '', description: '', time_limit: 0, passing_score: 70, max_attempts: 1 });
  const [editQuestion, setEditQuestion] = useState<{ quizId: string; id?: string; question: string; options: string[]; correct_answer: string; points: number } | null>(null);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);

  useEffect(() => {
    fetchInstructorCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) fetchQuizzesByCourse(selectedCourse);
    else clearCurrentQuiz();
  }, [selectedCourse]);

  useEffect(() => {
    if (expandedQuiz) fetchQuiz(expandedQuiz);
  }, [expandedQuiz]);

  const handleCreate = async () => {
    if (!quizForm.title.trim() || !selectedCourse) return;
    const q = await createQuiz({ ...quizForm, course_id: selectedCourse });
    if (q) {
      setShowCreate(false);
      setQuizForm({ title: '', description: '', time_limit: 0, passing_score: 70, max_attempts: 1 });
      toast.success('Quiz created');
      setExpandedQuiz(q.id);
    }
  };

  const handleAddQuestion = async () => {
    if (!editQuestion || !editQuestion.quizId || !editQuestion.question.trim() || editQuestion.options.length < 2) {
      toast.error('Question must have at least 2 options');
      return;
    }
    if (!editQuestion.options.includes(editQuestion.correct_answer)) {
      toast.error('Correct answer must be one of the options');
      return;
    }
    if (editQuestion.id) {
      await updateQuestion(editQuestion.id, { question: editQuestion.question, options: editQuestion.options, correct_answer: editQuestion.correct_answer, points: editQuestion.points });
      toast.success('Question updated');
    } else {
      await addQuestion(editQuestion.quizId, { question: editQuestion.question, options: editQuestion.options, correct_answer: editQuestion.correct_answer, points: editQuestion.points, order_index: (currentQuiz?.questions?.length || 0) + 1 });
      toast.success('Question added');
    }
    setEditQuestion(null);
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('Delete this quiz and all its questions?')) return;
    await deleteQuiz(id);
    toast.success('Quiz deleted');
    if (expandedQuiz === id) setExpandedQuiz(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Quizzes</h1>
          <p className="text-gray-500 mt-1">Create and manage course quizzes.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
          <span className="text-sm text-danger-600 dark:text-danger-400 flex-1">{error}</span>
          <Button size="sm" variant="ghost" onClick={clearError}>Dismiss</Button>
        </div>
      )}

      {/* Course selector */}
      <GlassCard className="p-4" hover={false}>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCourse}
            onChange={(e) => { setSelectedCourse(e.target.value); setShowCreate(false); }}
            className="flex-1 min-w-[200px] bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm border-0 outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="">Select a course...</option>
            {instructorCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          {selectedCourse && (
            <Button onClick={() => setShowCreate(!showCreate)} variant="primary">
              <Plus className="w-4 h-4 mr-1" /> New Quiz
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Create quiz form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard className="p-5" hover={false}>
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-primary-500" /> New Quiz</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Title</label>
                  <input value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="Quiz title" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Description (optional)</label>
                  <textarea value={quizForm.description} onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 resize-none h-20" placeholder="Describe what this quiz covers..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Time Limit (minutes, 0 = unlimited)</label>
                  <input type="number" min={0} value={quizForm.time_limit} onChange={(e) => setQuizForm({ ...quizForm, time_limit: parseInt(e.target.value) || 0 })} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Passing Score (%)</label>
                  <input type="number" min={0} max={100} value={quizForm.passing_score} onChange={(e) => setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) || 70 })} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Max Attempts</label>
                  <input type="number" min={1} max={10} value={quizForm.max_attempts} onChange={(e) => setQuizForm({ ...quizForm, max_attempts: parseInt(e.target.value) || 1 })} className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleCreate} variant="primary"><Save className="w-4 h-4 mr-1" /> Create Quiz</Button>
                <Button onClick={() => setShowCreate(false)} variant="ghost">Cancel</Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz list */}
      {isLoading && !quizzes.length && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {selectedCourse && !isLoading && quizzes.length === 0 && (
        <GlassCard className="p-8 text-center" hover={false}>
          <FileQuestion className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No quizzes for this course yet.</p>
          <Button variant="primary" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create your first quiz
          </Button>
        </GlassCard>
      )}

      <div className="space-y-4">
        {quizzes.map((quiz) => (
          <GlassCard key={quiz.id} className="overflow-hidden" hover={false}>
            <button
              onClick={() => setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)}
              className="w-full p-5 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <FileQuestion className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{quiz.title}</div>
                <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1"><FileQuestion className="w-3 h-3" /> {quiz.questionCount || 0} questions</span>
                  {quiz.time_limit > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {quiz.time_limit} min</span>}
                  <span>Pass: {quiz.passing_score}%</span>
                  <span>Attempts: {quiz.max_attempts}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz.id); }} className="p-2 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4 text-danger-400" />
                </button>
                {expandedQuiz === quiz.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>
            </button>

            {/* Expanded quiz details */}
            <AnimatePresence>
              {expandedQuiz === quiz.id && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-gray-100 dark:border-gray-800">
                  <div className="p-5 space-y-4">
                    {isLoading && !currentQuiz && (
                      <div className="flex justify-center py-4"><div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                    )}

                    {currentQuiz?.id === quiz.id && (
                      <>
                        {/* Existing questions */}
                        <div className="space-y-3">
                          {(currentQuiz.questions || []).map((q, idx) => (
                            <div key={q.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <p className="text-sm font-medium"><span className="text-primary-500">Q{idx + 1}.</span> {q.question}</p>
                                  <div className="mt-2 space-y-1">
                                    {q.options.map((opt, oi) => (
                                      <div key={oi} className={`text-xs px-3 py-1.5 rounded-lg ${opt === q.correct_answer ? 'bg-success-500/10 text-success-600 font-medium' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                        {String.fromCharCode(65 + oi)}. {opt} {opt === q.correct_answer && <Check className="w-3 h-3 inline text-success-500" />}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className="text-xs text-gray-400">{q.points}pt</span>
                                  <button
                                    onClick={() => setEditQuestion({ quizId: quiz.id, id: q.id, question: q.question, options: [...q.options], correct_answer: q.correct_answer, points: q.points })}
                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                                  </button>
                                  <button onClick={async () => { await deleteQuestion(q.id); toast.success('Question deleted'); }} className="p-1.5 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors">
                                    <Trash2 className="w-3.5 h-3.5 text-danger-400" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {editQuestion && editQuestion.quizId === quiz.id && (
                          <div className="bg-primary-50 dark:bg-primary-900/10 rounded-xl p-4 border border-primary-200 dark:border-primary-800/30">
                            <h4 className="text-sm font-semibold mb-3">{editQuestion.id ? 'Edit Question' : 'Add Question'}</h4>
                            <div className="space-y-3">
                              <input
                                value={editQuestion.question} onChange={(e) => setEditQuestion({ ...editQuestion, question: e.target.value })}
                                placeholder="Enter question..." className="w-full bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30"
                              />
                              <div className="space-y-2">
                                {editQuestion.options.map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500 w-5">{String.fromCharCode(65 + oi)}.</span>
                                    <input
                                      value={opt} onChange={(e) => {
                                        const opts = [...editQuestion.options];
                                        opts[oi] = e.target.value;
                                        setEditQuestion({ ...editQuestion, options: opts });
                                      }}
                                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                      className="flex-1 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30"
                                    />
                                    <button
                                      onClick={() => setEditQuestion({ ...editQuestion, correct_answer: opt })}
                                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${editQuestion.correct_answer === opt ? 'bg-success-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
                                    >
                                      {editQuestion.correct_answer === opt ? <Check className="w-3.5 h-3.5" /> : 'Correct'}
                                    </button>
                                    {editQuestion.options.length > 2 && (
                                      <button onClick={() => setEditQuestion({ ...editQuestion, options: editQuestion.options.filter((_, j) => j !== oi), correct_answer: editQuestion.correct_answer === opt ? '' : editQuestion.correct_answer })} className="p-1 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg">
                                        <X className="w-3.5 h-3.5 text-danger-400" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => setEditQuestion({ ...editQuestion, options: [...editQuestion.options, ''] })}
                                className="text-xs text-primary-500 hover:text-primary-600"
                              >
                                + Add option
                              </button>
                              <div className="flex items-center gap-3">
                                <label className="text-xs font-medium text-gray-500">Points:</label>
                                <input type="number" min={1} value={editQuestion.points} onChange={(e) => setEditQuestion({ ...editQuestion, points: parseInt(e.target.value) || 1 })} className="w-20 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="primary" onClick={handleAddQuestion}><Save className="w-3.5 h-3.5 mr-1" /> {editQuestion.id ? 'Update' : 'Add'} Question</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditQuestion(null)}>Cancel</Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Add question button */}
                        {(!editQuestion || editQuestion.quizId !== quiz.id) && (
                          <button
                            onClick={() => setEditQuestion({ quizId: quiz.id, question: '', options: ['', ''], correct_answer: '', points: 1 })}
                            className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 transition-colors"
                          >
                            <Plus className="w-4 h-4" /> Add Question
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        ))}
      </div>
    </motion.div>
  );
}

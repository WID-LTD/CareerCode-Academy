import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, X, Check, AlertCircle, ClipboardList, Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Copy, Download, UserCheck } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { api } from '@/lib/axios';
import toast from 'react-hot-toast';

interface Exam {
  id: string;
  course_id: string;
  course_title: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  shuffle_questions: boolean;
  show_results: boolean;
  is_published: boolean;
  starts_at: string | null;
  ends_at: string | null;
  instructions: string | null;
  random_questions_count: number;
  negative_marking: boolean;
  negative_percentage: number;
  created_at: string;
}

interface ExamQuestion {
  id: string;
  exam_id: string;
  question: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}

interface AttemptEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  score: number;
  passed: boolean;
  status: string;
  started_at: string;
  submitted_at: string | null;
  manual_score: number | null;
  reviewed: boolean;
}

export default function AdminExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ExamQuestion | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Attempts viewer state
  const [showAttempts, setShowAttempts] = useState(false);
  const [attempts, setAttempts] = useState<AttemptEntry[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptEntry | null>(null);
  const [attemptAnswers, setAttemptAnswers] = useState<any[]>([]);
  const [loadingAttemptDetail, setLoadingAttemptDetail] = useState(false);
  const [gradingScore, setGradingScore] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  const [form, setForm] = useState({
    courseId: '',
    title: '',
    description: '',
    durationMinutes: 60,
    passingScore: 70,
    maxAttempts: 1,
    shuffleQuestions: false,
    showResults: true,
    isPublished: false,
    startsAt: '',
    endsAt: '',
    instructions: '',
    randomQuestionsCount: 0,
    negativeMarking: false,
    negativePercentage: 0,
  });

  const [questionForm, setQuestionForm] = useState({
    question: '',
    questionType: 'mcq' as 'mcq' | 'true_false' | 'essay',
    options: ['', ''],
    correctAnswer: '',
    points: 1,
  });

  useEffect(() => { fetchExams(); }, [page, pageSize]);
  useEffect(() => { fetchCourses(); }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/exams?page=${page}&limit=${pageSize}`);
      setExams(data.data || []);
      if (data.pagination) {
        setTotalItems(data.pagination.total);
        setTotalPages(data.pagination.pages);
      }
    } catch {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data } = await api.get('/exams/courses');
      setCourses(data.data || []);
    } catch { /* ignore */ }
  };

  const resetForm = () => {
    setForm({
      courseId: '', title: '', description: '', durationMinutes: 60,
      passingScore: 70, maxAttempts: 1, shuffleQuestions: false, showResults: true,
      isPublished: false, startsAt: '', endsAt: '', instructions: '',
      randomQuestionsCount: 0, negativeMarking: false, negativePercentage: 0,
    });
    setEditingExam(null);
    setShowForm(false);
  };

  const handleEdit = (exam: Exam) => {
    setForm({
      courseId: exam.course_id,
      title: exam.title,
      description: exam.description || '',
      durationMinutes: exam.duration_minutes,
      passingScore: exam.passing_score,
      maxAttempts: exam.max_attempts,
      shuffleQuestions: exam.shuffle_questions,
      showResults: exam.show_results,
      isPublished: exam.is_published,
      startsAt: exam.starts_at ? exam.starts_at.slice(0, 16) : '',
      endsAt: exam.ends_at ? exam.ends_at.slice(0, 16) : '',
      instructions: exam.instructions || '',
      randomQuestionsCount: exam.random_questions_count,
      negativeMarking: exam.negative_marking,
      negativePercentage: exam.negative_percentage,
    });
    setEditingExam(exam);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.courseId) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };

      if (editingExam) {
        await api.put(`/exams/${editingExam.id}`, payload);
        toast.success('Exam updated');
      } else {
        await api.post('/exams', payload);
        toast.success('Exam created');
      }
      resetForm();
      fetchExams();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save exam';
      const errors = err?.response?.data?.errors;
      let fullMsg = msg;
      if (errors) {
        fullMsg += ': ' + Object.entries(errors).map(([k, v]) => `${k}=${(v as string[]).join(',')}`).join('; ');
      }
      console.error('Exam save error:', err?.response?.data);
      toast.error(fullMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this exam and all its questions?')) return;
    try {
      await api.delete(`/exams/${id}`);
      toast.success('Exam deleted');
      if (selectedExam?.id === id) setSelectedExam(null);
      fetchExams();
    } catch {
      toast.error('Failed to delete exam');
    }
  };

  const togglePublished = async (exam: Exam) => {
    try {
      await api.put(`/exams/${exam.id}`, { isPublished: !exam.is_published });
      toast.success(exam.is_published ? 'Exam unpublished' : 'Exam published');
      fetchExams();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDuplicate = async (exam: Exam) => {
    try {
      const { data } = await api.post(`/exams/${exam.id}/duplicate`, { title: `${exam.title} (Copy)` });
      toast.success('Exam duplicated');
      fetchExams();
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const handleExport = async (exam: Exam) => {
    try {
      const { data } = await api.get(`/exams/${exam.id}/export`, { responseType: 'blob' });
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exam.title.replace(/[^a-z0-9]/gi, '_')}-results.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Results exported');
    } catch {
      toast.error('Failed to export');
    }
  };

  const loadQuestions = async (exam: Exam) => {
    setSelectedExam(exam);
    setLoadingQuestions(true);
    setShowQuestionForm(false);
    setEditingQuestion(null);
    setShowAttempts(false);
    try {
      const { data } = await api.get(`/exams/${exam.id}`);
      setQuestions(data.data?.questions || []);
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const reorderQuestion = async (qId: string, direction: 'up' | 'down') => {
    if (!selectedExam) return;
    const idx = questions.findIndex(q => q.id === qId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= questions.length) return;

    const updated = [...questions];
    const temp = { ...updated[idx], order_index: swapIdx };
    const temp2 = { ...updated[swapIdx], order_index: idx };
    updated[idx] = temp2;
    updated[swapIdx] = temp;

    setQuestions(updated);

    try {
      await api.put(`/exams/${selectedExam.id}/questions/${qId}`, {
        question: questions[idx].question,
        questionType: questions[idx].question_type,
        options: questions[idx].options,
        correctAnswer: questions[idx].correct_answer,
        points: questions[idx].points,
        orderIndex: swapIdx,
      });
      await api.put(`/exams/${selectedExam.id}/questions/${updated[idx].id}`, {
        question: questions[swapIdx].question,
        questionType: questions[swapIdx].question_type,
        options: questions[swapIdx].options,
        correctAnswer: questions[swapIdx].correct_answer,
        points: questions[swapIdx].points,
        orderIndex: idx,
      });
    } catch {
      loadQuestions(selectedExam);
    }
  };

  const loadAttempts = async (exam: Exam) => {
    setShowAttempts(true);
    setSelectedAttempt(null);
    setAttemptAnswers([]);
    setLoadingAttempts(true);
    try {
      const { data } = await api.get(`/exams/${exam.id}/attempts`);
      setAttempts(data.data || []);
    } catch {
      toast.error('Failed to load attempts');
    } finally {
      setLoadingAttempts(false);
    }
  };

  const loadAttemptDetail = async (attempt: AttemptEntry) => {
    if (!selectedExam) return;
    setSelectedAttempt(attempt);
    setGradingScore(attempt.manual_score?.toString() || attempt.score?.toString() || '');
    setLoadingAttemptDetail(true);
    try {
      const { data } = await api.get(`/exams/${selectedExam.id}/attempts/${attempt.id}`);
      setAttemptAnswers(data.data?.answers || []);
    } catch {
      toast.error('Failed to load attempt details');
    } finally {
      setLoadingAttemptDetail(false);
    }
  };

  const handleGrade = async () => {
    if (!selectedExam || !selectedAttempt) return;
    const score = parseInt(gradingScore);
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error('Score must be 0-100');
      return;
    }
    setSavingGrade(true);
    try {
      await api.put(`/exams/${selectedExam.id}/attempts/${selectedAttempt.id}/grade`, { manualScore: score });
      toast.success('Grade updated');
      loadAttempts(selectedExam);
      setSelectedAttempt(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to grade');
    } finally {
      setSavingGrade(false);
    }
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question: '', questionType: 'mcq', options: ['', ''],
      correctAnswer: '', points: 1,
    });
    setEditingQuestion(null);
    setShowQuestionForm(false);
  };

  const handleEditQuestion = (q: ExamQuestion) => {
    setQuestionForm({
      question: q.question,
      questionType: q.question_type as 'mcq' | 'true_false' | 'essay',
      options: q.options?.length ? q.options : ['', ''],
      correctAnswer: q.correct_answer,
      points: q.points,
    });
    setEditingQuestion(q);
    setShowQuestionForm(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question || !questionForm.correctAnswer) return;
    if (!selectedExam) return;
    setSavingQuestion(true);
    try {
      const payload = {
        ...questionForm,
        options: questionForm.questionType === 'true_false' ? ['True', 'False'] : questionForm.options.filter(Boolean),
      };

      if (editingQuestion) {
        await api.put(`/exams/${selectedExam.id}/questions/${editingQuestion.id}`, payload);
        toast.success('Question updated');
      } else {
        await api.post(`/exams/${selectedExam.id}/questions`, payload);
        toast.success('Question added');
      }
      resetQuestionForm();
      loadQuestions(selectedExam);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save question');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Delete this question?')) return;
    if (!selectedExam) return;
    try {
      await api.delete(`/exams/${selectedExam.id}/questions/${qId}`);
      toast.success('Question deleted');
      loadQuestions(selectedExam);
    } catch {
      toast.error('Failed to delete question');
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = value;
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const addOption = () => {
    setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] });
  };

  const removeOption = (index: number) => {
    if (questionForm.options.length <= 2) return;
    setQuestionForm({ ...questionForm, options: questionForm.options.filter((_, i) => i !== index) });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Exams</h1>
          <p className="text-gray-500 mt-1">Create and manage certification exams linked to courses.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Exam
        </Button>
      </div>

      {/* Exam Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-2xl p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{editingExam ? 'Edit Exam' : 'New Exam'}</h3>
              <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Course *</label>
                  <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30">
                    <option value="">Select a course...</option>
                    {courses.map((c: any) => (
                      <option key={c._id || c.id} value={c._id || c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Title *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="Final Certification Exam" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" placeholder="Exam description..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Duration (minutes)</label>
                  <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 60 })}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Passing Score (%)</label>
                  <input type="number" value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: parseInt(e.target.value) || 70 })}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Max Attempts</label>
                  <input type="number" value={form.maxAttempts} onChange={(e) => setForm({ ...form, maxAttempts: parseInt(e.target.value) || 1 })}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Random Questions (0 = all)</label>
                  <input type="number" value={form.randomQuestionsCount} onChange={(e) => setForm({ ...form, randomQuestionsCount: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Starts At</label>
                  <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Ends At</label>
                  <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Instructions</label>
                  <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={3}
                    className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" placeholder="Instructions shown to students before starting the exam..." />
                </div>
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.shuffleQuestions} onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600" />
                  Shuffle Questions
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.showResults} onChange={(e) => setForm({ ...form, showResults: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600" />
                  Show Results
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600" />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.negativeMarking} onChange={(e) => setForm({ ...form, negativeMarking: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600" />
                  Negative Marking
                </label>
                {form.negativeMarking && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Deduct</span>
                    <input type="number" value={form.negativePercentage} onChange={(e) => setForm({ ...form, negativePercentage: parseInt(e.target.value) || 0 })}
                      className="w-16 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 text-center" />
                    <span className="text-xs text-gray-500">% per wrong answer</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title || !form.courseId}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {editingExam ? 'Update' : 'Create'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Attempts Modal */}
      {showAttempts && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-4xl p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Attempts — {selectedExam.title}</h3>
              <button onClick={() => setShowAttempts(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
            </div>

            {selectedAttempt ? (
              <div>
                <button onClick={() => { setSelectedAttempt(null); setAttemptAnswers([]); }} className="text-sm text-primary-400 hover:underline mb-3">&larr; Back to attempts list</button>
                <div className="mb-4">
                  <p className="font-medium">{selectedAttempt.user_name} ({selectedAttempt.user_email})</p>
                  <p className="text-xs text-gray-500">Score: {selectedAttempt.score}% | {selectedAttempt.passed ? 'Passed' : 'Failed'} | {selectedAttempt.status}</p>
                </div>

                <div className="space-y-3 mb-4">
                  {loadingAttemptDetail ? (
                    <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                  ) : (
                    attemptAnswers.map((ans, i) => (
                      <div key={ans.id} className={`p-3 rounded-xl ${ans.is_correct ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-red-500/5 border border-red-500/10'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-primary-400">Q{i + 1}</span>
                          <Badge className="text-[10px]">{ans.question_type}</Badge>
                          <span className="text-[10px] text-gray-500">{ans.points}pt</span>
                        </div>
                        <p className="text-sm mb-1">{ans.question}</p>
                        <p className="text-xs">Answer: <span className={ans.is_correct ? 'text-emerald-400' : 'text-red-400'}>{ans.answer || '(none)'}</span></p>
                        {!ans.is_correct && <p className="text-xs text-emerald-400">Correct: {ans.correct_answer}</p>}
                        <p className="text-xs text-gray-500">Points earned: {ans.points_earned}/{ans.points}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-sm font-medium mb-2">Manual Grading</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Override score (0-100):</span>
                    <input type="number" value={gradingScore} onChange={(e) => setGradingScore(e.target.value)}
                      className="w-20 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 text-center" />
                    <span className="text-xs text-gray-500">%</span>
                    <Button size="sm" onClick={handleGrade} disabled={savingGrade}>
                      {savingGrade ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                      Save Grade
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {loadingAttempts ? (
                  <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : attempts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No attempts yet.</p>
                ) : (
                  <div className="space-y-2">
                    {attempts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 cursor-pointer hover:bg-gray-800 transition-colors" onClick={() => loadAttemptDetail(a)}>
                        <div>
                          <p className="text-sm font-medium">{a.user_name}</p>
                          <p className="text-xs text-gray-500">{a.user_email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={a.passed ? 'success' : 'danger'}>{a.passed ? 'Passed' : 'Failed'}</Badge>
                          <span className="text-sm font-bold">{a.score}%</span>
                          <Badge variant={a.status === 'completed' ? 'success' : a.status === 'timeout' ? 'warning' : 'default'}>{a.status}</Badge>
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Main Content: Exam List + Question Panel */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Exam List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16 text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />Loading exams...</div>
          ) : exams.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No exams yet.</div>
          ) : (
            exams.map((exam) => (
              <motion.div key={exam.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className={`cursor-pointer transition-all ${selectedExam?.id === exam.id ? 'ring-2 ring-primary-500 rounded-2xl' : ''}`} onClick={() => loadQuestions(exam)}>
                  <GlassCard className="p-4" hover>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{exam.title}</h3>
                        <p className="text-xs text-gray-500 truncate">{exam.course_title}</p>
                      </div>
                      <Badge variant={exam.is_published ? 'success' : 'default'}>{exam.is_published ? 'Published' : 'Draft'}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-2 flex-wrap">
                      <span>{exam.duration_minutes}min</span>
                      <span>Pass: {exam.passing_score}%</span>
                      <span>{exam.max_attempts} attempt(s)</span>
                      {exam.random_questions_count > 0 && <span>Random: {exam.random_questions_count}</span>}
                      {exam.negative_marking && <span className="text-red-400">-{exam.negative_percentage}%</span>}
                    </div>
                    {exam.starts_at && (
                      <p className="text-[10px] text-gray-600 mb-2">
                        Schedule: {new Date(exam.starts_at).toLocaleString()}{exam.ends_at ? ` — ${new Date(exam.ends_at).toLocaleString()}` : ''}
                      </p>
                    )}
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); togglePublished(exam); }} title={exam.is_published ? 'Unpublish' : 'Publish'}>
                        {exam.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDuplicate(exam); }} title="Duplicate"><Copy className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); loadAttempts(exam); }} title="View Attempts"><UserCheck className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleExport(exam); }} title="Export CSV"><Download className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleEdit(exam); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(exam.id); }} className="text-danger-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </GlassCard>
                </div>
              </motion.div>
            ))
          )}

          <Pagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} />
        </div>

        {/* Question Panel */}
        <div className="space-y-4">
          {selectedExam ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-sm">{selectedExam.title}</h2>
                  <p className="text-xs text-gray-500">{questions.length} question(s)</p>
                </div>
                <Button size="sm" onClick={() => { resetQuestionForm(); setShowQuestionForm(true); }}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
                </Button>
              </div>

              {showQuestionForm && (
                <GlassCard className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">{editingQuestion ? 'Edit Question' : 'New Question'}</h3>
                    <button onClick={resetQuestionForm} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Question *</label>
                      <textarea value={questionForm.question} onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })} rows={2}
                        className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" placeholder="What is 2 + 2?" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
                      <select value={questionForm.questionType} onChange={(e) => {
                        const t = e.target.value as 'mcq' | 'true_false' | 'essay';
                        setQuestionForm({
                          ...questionForm,
                          questionType: t,
                          options: t === 'true_false' ? ['True', 'False'] : t === 'mcq' ? ['', ''] : [],
                        });
                      }}
                        className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30">
                        <option value="mcq">Multiple Choice</option>
                        <option value="true_false">True / False</option>
                        <option value="essay">Essay</option>
                      </select>
                    </div>

                    {questionForm.questionType === 'mcq' && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Options</label>
                        {questionForm.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                            <input value={opt} onChange={(e) => updateOption(i, e.target.value)}
                              className="flex-1 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" placeholder={`Option ${i + 1}`} />
                            {questionForm.options.length > 2 && (
                              <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-danger-500"><X className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        ))}
                        <Button size="sm" variant="ghost" onClick={addOption} className="mt-1 text-xs">+ Add Option</Button>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Correct Answer *</label>
                      {questionForm.questionType === 'true_false' ? (
                        <select value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                          className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30">
                          <option value="">Select...</option>
                          <option value="True">True</option>
                          <option value="False">False</option>
                        </select>
                      ) : questionForm.questionType === 'mcq' ? (
                        <select value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                          className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30">
                          <option value="">Select correct option...</option>
                          {questionForm.options.filter(Boolean).map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                          className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="Expected answer keywords..." />
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Points</label>
                      <input type="number" value={questionForm.points} onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                        className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" size="sm" onClick={resetQuestionForm}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveQuestion} disabled={savingQuestion || !questionForm.question || !questionForm.correctAnswer}>
                      {savingQuestion ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      {editingQuestion ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </GlassCard>
              )}

              <div className="space-y-2">
                {loadingQuestions ? (
                  <div className="text-center py-8 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : questions.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No questions yet. Add your first question.</p>
                ) : (
                  questions.map((q, i) => (
                    <GlassCard key={q.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-primary-400">Q{i + 1}</span>
                            <Badge className="text-[10px]">{q.question_type}</Badge>
                            <span className="text-[10px] text-gray-500">{q.points}pt(s)</span>
                          </div>
                          <p className="text-sm">{q.question}</p>
                          <p className="text-xs text-gray-500 mt-1">Answer: <span className="text-emerald-400">{q.correct_answer}</span></p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <div className="flex gap-0.5">
                            <Button size="sm" variant="ghost" onClick={() => reorderQuestion(q.id, 'up')} disabled={i === 0} className="p-1"><ChevronUp className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => reorderQuestion(q.id, 'down')} disabled={i === questions.length - 1} className="p-1"><ChevronDown className="w-3 h-3" /></Button>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEditQuestion(q)} className="text-xs">Edit</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteQuestion(q.id)} className="text-danger-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Select an exam to manage questions</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

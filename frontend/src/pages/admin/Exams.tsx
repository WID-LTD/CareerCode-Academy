import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2, X, Check, AlertCircle, ClipboardList, Eye, EyeOff, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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
      const { data } = await api.get('/admin/courses?limit=200');
      setCourses(data.data || []);
    } catch { /* ignore */ }
  };

  const resetForm = () => {
    setForm({
      courseId: '', title: '', description: '', durationMinutes: 60,
      passingScore: 70, maxAttempts: 1, shuffleQuestions: false, showResults: true, isPublished: false,
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
    });
    setEditingExam(exam);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.courseId) return;
    setSaving(true);
    try {
      if (editingExam) {
        await api.put(`/exams/${editingExam.id}`, form);
        toast.success('Exam updated');
      } else {
        await api.post('/exams', form);
        toast.success('Exam created');
      }
      resetForm();
      fetchExams();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save exam');
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

  const loadQuestions = async (exam: Exam) => {
    setSelectedExam(exam);
    setLoadingQuestions(true);
    setShowQuestionForm(false);
    setEditingQuestion(null);
    try {
      const { data } = await api.get(`/exams/${exam.id}`);
      setQuestions(data.data?.questions || []);
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setLoadingQuestions(false);
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
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-lg p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{editingExam ? 'Edit Exam' : 'New Exam'}</h3>
              <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Course *</label>
                <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                  className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30">
                  <option value="">Select a course...</option>
                  {courses.map((c: any) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="Final Certification Exam" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 resize-none" placeholder="Exam description..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="flex items-center gap-6">
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
                  <GlassCard className={`p-4 ${selectedExam?.id === exam.id ? '' : ''}`} hover>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{exam.title}</h3>
                      <p className="text-xs text-gray-500 truncate">{exam.course_title}</p>
                    </div>
                    <Badge variant={exam.is_published ? 'success' : 'default'}>{exam.is_published ? 'Published' : 'Draft'}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                    <span>{exam.duration_minutes}min</span>
                    <span>Pass: {exam.passing_score}%</span>
                    <span>{exam.max_attempts} attempt(s)</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); togglePublished(exam); }} title={exam.is_published ? 'Unpublish' : 'Publish'}>
                      {exam.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
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
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => handleEditQuestion(q)}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteQuestion(q.id)} className="text-danger-500"><Trash2 className="w-3.5 h-3.5" /></Button>
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

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, Edit3, Trash2, X, Save, Eye, AlertCircle, RefreshCw, CheckCircle, XCircle, BookOpen, Clock, BarChart3, Users, FileQuestion, HelpCircle, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { DataTable, Column } from '@/components/ui/DataTable';
import SEO from '@/components/seo/SEO';
import { PageSkeleton } from '@/components/student/SkeletonLoader';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface ExamQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'essay';
  options: string[];
  correct_answer: string;
  points: number;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  course_id: string;
  course_title: string;
  duration: number;
  pass_percentage: number;
  status: 'draft' | 'published';
  questions: ExamQuestion[];
  questionCount: number;
  attemptCount: number;
  passRate: number;
  createdAt: string;
}

interface ExamForm {
  title: string;
  course_id: string;
  duration: number;
  pass_percentage: number;
  description: string;
}

const emptyForm: ExamForm = {
  title: '',
  course_id: '',
  duration: 60,
  pass_percentage: 70,
  description: '',
};

const questionTypeLabels: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True/False',
  essay: 'Essay',
};

export default function Exams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [myCourses, setMyCourses] = useState<{ id: string; title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [form, setForm] = useState<ExamForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [expandedExam, setExpandedExam] = useState<Exam | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [newQuestion, setNewQuestion] = useState<{ question: string; type: 'multiple_choice' | 'true_false' | 'essay'; options: string[]; correct_answer: string; points: number } | null>(null);

  const loadExams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/exams');
      setExams(data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      const { data } = await api.get('/courses/instructor');
      setMyCourses((data.data || []).map((c: any) => ({ id: c.id, title: c.title })));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadExams();
    loadCourses();
  }, [loadExams, loadCourses]);

  const loadExamDetail = async (examId: string) => {
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/exams/${examId}`);
      setExpandedExam(data.data);
      if (data.data?.questions) {
        setExams(prev => prev.map(e => e.id === examId ? { ...e, questions: data.data.questions, questionCount: data.data.questions.length } : e));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load exam details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingExam(null);
    setShowFormModal(true);
  };

  const openEdit = (exam: Exam) => {
    setForm({
      title: exam.title,
      course_id: exam.course_id,
      duration: exam.duration,
      pass_percentage: exam.pass_percentage,
      description: exam.description || '',
    });
    setEditingExam(exam);
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.course_id) { toast.error('Course is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim() };
      if (editingExam) {
        const { data } = await api.put(`/exams/${editingExam.id}`, payload);
        setExams(prev => prev.map(e => e.id === editingExam.id ? { ...e, ...data.data } : e));
        toast.success('Exam updated');
      } else {
        const { data } = await api.post('/exams', payload);
        setExams(prev => [data.data, ...prev]);
        toast.success('Exam created');
      }
      setShowFormModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exam: Exam) => {
    if (!window.confirm(`Delete "${exam.title}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/exams/${exam.id}`);
      setExams(prev => prev.filter(e => e.id !== exam.id));
      toast.success('Exam deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete exam');
    }
  };

  const toggleStatus = async (exam: Exam) => {
    const newStatus = exam.status === 'published' ? 'draft' : 'published';
    try {
      await api.put(`/exams/${exam.id}`, { status: newStatus });
      setExams(prev => prev.map(e => e.id === exam.id ? { ...e, status: newStatus } : e));
      toast.success(`Exam ${newStatus === 'published' ? 'published' : 'unpublished'}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  };

  const toggleExpand = async (examId: string) => {
    if (expandedExamId === examId) {
      setExpandedExamId(null);
      setExpandedExam(null);
      setNewQuestion(null);
      return;
    }
    setExpandedExamId(examId);
    setNewQuestion(null);
    const existing = exams.find(e => e.id === examId);
    if (existing?.questions) {
      setExpandedExam(existing);
    } else {
      await loadExamDetail(examId);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion || !expandedExamId) return;
    if (!newQuestion.question.trim()) { toast.error('Question text is required'); return; }
    try {
      const { data } = await api.post(`/exams/${expandedExamId}/questions`, {
        question: newQuestion.question.trim(),
        type: newQuestion.type,
        options: newQuestion.type !== 'essay' ? newQuestion.options : [],
        correct_answer: newQuestion.correct_answer,
        points: newQuestion.points || 1,
        order_index: (expandedExam?.questions?.length || 0) + 1,
      });
      const q = data.data || data;
      setExpandedExam(prev => prev ? { ...prev, questions: [...(prev.questions || []), q], questionCount: (prev.questionCount || 0) + 1 } : prev);
      setExams(prev => prev.map(e => e.id === expandedExamId ? { ...e, questions: [...(e.questions || []), q], questionCount: (e.questionCount || 0) + 1 } : e));
      setNewQuestion(null);
      toast.success('Question added');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`/exams/${expandedExamId}/questions/${questionId}`);
      setExpandedExam(prev => prev ? { ...prev, questions: prev.questions.filter(q => q.id !== questionId), questionCount: Math.max(0, (prev.questionCount || 0) - 1) } : prev);
      setExams(prev => prev.map(e => e.id === expandedExamId ? { ...e, questions: e.questions.filter(q => q.id !== questionId), questionCount: Math.max(0, (e.questionCount || 0) - 1) } : e));
      toast.success('Question deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete question');
    }
  };

  const filtered = exams.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Exam>[] = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (exam) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-4 h-4 text-primary-500" />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">{exam.title}</span>
        </div>
      ),
      mobileRender: (exam) => (
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900 dark:text-white">{exam.title}</span>
          <Badge variant={exam.status === 'published' ? 'success' : 'warning'} size="sm">{exam.status}</Badge>
        </div>
      ),
    },
    {
      key: 'course_title',
      label: 'Course',
      sortable: true,
      render: (exam) => (
        <Badge variant="primary" size="sm">{exam.course_title}</Badge>
      ),
    },
    {
      key: 'questionCount',
      label: 'Questions',
      sortable: true,
      render: (exam) => (
        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm">
          <FileQuestion className="w-3.5 h-3.5" /> {exam.questionCount || 0}
        </span>
      ),
    },
    {
      key: 'duration',
      label: 'Duration (min)',
      sortable: true,
      render: (exam) => (
        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm">
          <Clock className="w-3.5 h-3.5" /> {exam.duration}
        </span>
      ),
    },
    {
      key: 'pass_percentage',
      label: 'Pass Rate',
      sortable: true,
      render: (exam) => (
        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm">
          <BarChart3 className="w-3.5 h-3.5" /> {exam.pass_percentage}%
        </span>
      ),
    },
    {
      key: 'attemptCount',
      label: 'Attempts',
      sortable: true,
      render: (exam) => (
        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm">
          <Users className="w-3.5 h-3.5" /> {exam.attemptCount || 0}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (exam) => (
        <Badge variant={exam.status === 'published' ? 'success' : 'warning'} size="sm">
          {exam.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (exam) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost" size="sm"
            icon={<Eye className="w-4 h-4 text-blue-500" />}
            onClick={() => toggleExpand(exam.id)}
            title="Manage questions"
          />
          <Button
            variant="ghost" size="sm"
            icon={<Edit3 className="w-4 h-4 text-gray-500" />}
            onClick={() => openEdit(exam)}
            title="Edit exam"
          />
          <Button
            variant="ghost" size="sm"
            icon={exam.status === 'published' ? <XCircle className="w-4 h-4 text-yellow-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
            onClick={() => toggleStatus(exam)}
            title={exam.status === 'published' ? 'Unpublish' : 'Publish'}
          />
          <Button
            variant="ghost" size="sm"
            icon={<Trash2 className="w-4 h-4 text-red-500" />}
            onClick={() => handleDelete(exam)}
            title="Delete"
          />
        </div>
      ),
      mobileRender: (exam) => (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Button variant="outline" size="sm" icon={<Eye className="w-4 h-4" />} onClick={() => toggleExpand(exam.id)}>Questions</Button>
          <Button variant="outline" size="sm" icon={<Edit3 className="w-4 h-4" />} onClick={() => openEdit(exam)}>Edit</Button>
          <Button variant="outline" size="sm" icon={exam.status === 'published' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />} onClick={() => toggleStatus(exam)}>
            {exam.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
          <Button variant="outline" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => handleDelete(exam)}>Delete</Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SEO title="Exams" />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Exams</h1>
          <p className="text-gray-500">Create, manage, and publish exams for your courses.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Create Exam
        </Button>
      </div>

      {/* Search */}
      {exams.length > 0 && (
        <div className="mb-4">
          <Input
            icon={<ClipboardList className="w-4 h-4" />}
            placeholder="Search exams..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <GlassCard hover={false} className="p-8 mb-6">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to load exams</h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={loadExams}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Exams table */}
      {!error && (
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(exam) => exam.id}
          isLoading={isLoading}
          emptyTitle="No exams created yet"
          emptyDescription="Create your first exam to start assessing your students."
          emptyAction={{
            label: 'Create Exam',
            onClick: openCreate,
          }}
        />
      )}

      {/* Expanded exam detail */}
      <AnimatePresence>
        {expandedExamId && expandedExam && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <GlassCard hover={false} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <ClipboardList className="w-5 h-5 text-primary-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">{expandedExam.title} — Questions</h3>
                  <Badge variant="primary" size="sm">{expandedExam.questionCount || 0} total</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setExpandedExamId(null); setExpandedExam(null); setNewQuestion(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {loadingDetail ? (
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                </div>
              ) : (
                <>
                  {/* Questions list */}
                  {(!expandedExam.questions || expandedExam.questions.length === 0) && !newQuestion ? (
                    <div className="text-center py-8 text-gray-500">
                      <HelpCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No questions yet. Add your first question below.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {(expandedExam.questions || []).map((q, idx) => (
                        <div key={q.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="default" size="sm">{questionTypeLabels[q.type] || q.type}</Badge>
                                <span className="text-xs text-gray-400">{q.points}pt</span>
                              </div>
                              <p className="text-sm font-medium">
                                <span className="text-primary-500">Q{idx + 1}.</span> {q.question}
                              </p>
                              {q.type !== 'essay' && q.options?.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {q.options.map((opt, oi) => (
                                    <div key={oi} className={cn(
                                      'text-xs px-3 py-1.5 rounded-lg',
                                      opt === q.correct_answer
                                        ? 'bg-success-500/10 text-success-600 font-medium'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                    )}>
                                      {String.fromCharCode(65 + oi)}. {opt} {opt === q.correct_answer && <Check className="w-3 h-3 inline text-success-500" />}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {q.type === 'essay' && (
                                <div className="mt-2 text-xs text-gray-500 italic">Essay answer (manual grading)</div>
                              )}
                              {q.type === 'true_false' && (
                                <div className="mt-2 text-xs">
                                  <span className={cn(
                                    'px-2 py-0.5 rounded font-medium',
                                    q.correct_answer === 'true'
                                      ? 'bg-success-500/10 text-success-600'
                                      : 'bg-danger-500/10 text-danger-600'
                                  )}>
                                    Correct: {q.correct_answer === 'true' ? 'True' : 'False'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1.5 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors flex-shrink-0"
                              title="Delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-danger-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add question form */}
                  {newQuestion ? (
                    <div className="bg-primary-50 dark:bg-primary-900/10 rounded-xl p-4 border border-primary-200 dark:border-primary-800/30">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-primary-500" /> Add Question
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Question Type</label>
                          <div className="flex flex-wrap gap-2">
                            {(['multiple_choice', 'true_false', 'essay'] as const).map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setNewQuestion({
                                  ...newQuestion,
                                  type,
                                  options: type === 'multiple_choice' ? ['', ''] : type === 'true_false' ? ['True', 'False'] : [],
                                  correct_answer: '',
                                })}
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                  newQuestion.type === type
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                )}
                              >
                                {questionTypeLabels[type]}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">Question</label>
                          <textarea
                            value={newQuestion.question}
                            onChange={e => setNewQuestion({ ...newQuestion, question: e.target.value })}
                            placeholder="Enter question text..."
                            rows={2}
                            className="w-full bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 resize-none border border-gray-200 dark:border-gray-700"
                          />
                        </div>

                        {(newQuestion.type === 'multiple_choice') && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Options</label>
                            {newQuestion.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500 w-5">{String.fromCharCode(65 + oi)}.</span>
                                <input
                                  value={opt}
                                  onChange={e => {
                                    const opts = [...newQuestion.options];
                                    opts[oi] = e.target.value;
                                    setNewQuestion({ ...newQuestion, options: opts });
                                  }}
                                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                  className="flex-1 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 border border-gray-200 dark:border-gray-700"
                                />
                                <button
                                  type="button"
                                  onClick={() => setNewQuestion({ ...newQuestion, correct_answer: opt })}
                                  className={cn(
                                    'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                    newQuestion.correct_answer === opt
                                      ? 'bg-success-500 text-white'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                  )}
                                >
                                  {newQuestion.correct_answer === opt ? <Check className="w-3.5 h-3.5" /> : 'Correct'}
                                </button>
                                {newQuestion.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const opts = newQuestion.options.filter((_, j) => j !== oi);
                                      setNewQuestion({
                                        ...newQuestion,
                                        options: opts,
                                        correct_answer: newQuestion.correct_answer === opt ? '' : newQuestion.correct_answer,
                                      });
                                    }}
                                    className="p-1 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg"
                                  >
                                    <X className="w-3.5 h-3.5 text-danger-400" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, ''] })}
                              className="text-xs text-primary-500 hover:text-primary-600"
                            >
                              + Add option
                            </button>
                          </div>
                        )}

                        {newQuestion.type === 'true_false' && (
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Correct Answer</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setNewQuestion({ ...newQuestion, correct_answer: 'true' })}
                                className={cn(
                                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                  newQuestion.correct_answer === 'true'
                                    ? 'bg-success-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                )}
                              >
                                True
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewQuestion({ ...newQuestion, correct_answer: 'false' })}
                                className={cn(
                                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                  newQuestion.correct_answer === 'false'
                                    ? 'bg-success-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                )}
                              >
                                False
                              </button>
                            </div>
                          </div>
                        )}

                        {newQuestion.type === 'essay' && (
                          <p className="text-xs text-gray-500 italic">Essay questions are graded manually.</p>
                        )}

                        <div className="flex items-center gap-3">
                          <label className="text-xs font-medium text-gray-500">Points:</label>
                          <input
                            type="number"
                            min={1}
                            value={newQuestion.points}
                            onChange={e => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })}
                            className="w-20 bg-white dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/30 border border-gray-200 dark:border-gray-700"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" variant="primary" onClick={handleAddQuestion}>
                            <Save className="w-3.5 h-3.5 mr-1" /> Add Question
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setNewQuestion(null)}>Cancel</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (!expandedExam) return;
                        setNewQuestion({
                          question: '',
                          type: 'multiple_choice',
                          options: ['', ''],
                          correct_answer: '',
                          points: 1,
                        });
                      }}
                      className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Question
                    </button>
                  )}
                </>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Exam Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingExam ? 'Edit Exam' : 'Create Exam'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Exam Title *"
            placeholder="e.g. Final Assessment"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />

          <Select
            label="Course *"
            placeholder="-- Select a course --"
            options={myCourses.map(c => ({ value: c.id, label: c.title }))}
            value={form.course_id}
            onChange={e => setForm({ ...form, course_id: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duration (minutes)"
              type="number"
              min={1}
              value={form.duration}
              onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 60 })}
            />
            <Input
              label="Pass Percentage (%)"
              type="number"
              min={0}
              max={100}
              value={form.pass_percentage}
              onChange={e => setForm({ ...form, pass_percentage: parseInt(e.target.value) || 70 })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 resize-none"
              placeholder="Describe what this exam covers..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowFormModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editingExam ? 'Update Exam' : 'Create Exam'}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

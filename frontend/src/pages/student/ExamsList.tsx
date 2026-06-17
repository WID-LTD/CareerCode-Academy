import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Clock, CheckCircle, AlertCircle, Loader2, Play, RotateCcw } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/axios';
import toast from 'react-hot-toast';

export default function ExamsList() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'available' | 'history'>('available');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [availRes, histRes] = await Promise.all([
        api.get('/exams/student/list'),
        api.get('/exams/student/history'),
      ]);
      setExams(availRes.data.data || []);
      setHistory(histRes.data.data || []);
    } catch {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const startExam = async (examId: string) => {
    try {
      const { data } = await api.post(`/exams/student/${examId}/start`);
      if (data.data?.resumed) {
        toast('Resuming previous attempt');
      }
      navigate(`/student/exams/${examId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start exam');
    }
  };

  const getStatusBadge = (exam: any) => {
    if (exam.active_attempt_status === 'in_progress') {
      return <Badge variant="warning">In Progress</Badge>;
    }
    if (exam.attempt_count >= exam.max_attempts) {
      return <Badge variant="default">Exhausted</Badge>;
    }
    if (exam.attempt_count > 0) {
      return <Badge variant="primary">Retake Available</Badge>;
    }
    return <Badge variant="success">Available</Badge>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Exams</h1>
        <p className="text-gray-500 mt-1">Take certification exams for your enrolled courses.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setTab('available')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === 'available' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Available Exams
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === 'history' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          History
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : tab === 'available' ? (
        exams.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No exams available for your enrolled courses.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam) => (
              <motion.div key={exam.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{exam.title}</h3>
                      <p className="text-sm text-gray-500">{exam.course_title}</p>
                    </div>
                    {getStatusBadge(exam)}
                  </div>
                  {exam.description && (
                    <p className="text-sm text-gray-400 mb-3">{exam.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {exam.duration_minutes} min</span>
                    <span>Pass: {exam.passing_score}%</span>
                    <span>Attempts: {exam.attempt_count}/{exam.max_attempts}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => startExam(exam.id)}
                    disabled={exam.active_attempt_status === 'in_progress' ? false : exam.attempt_count >= exam.max_attempts}
                  >
                    {exam.active_attempt_status === 'in_progress' ? (
                      <><Play className="w-3.5 h-3.5 mr-1" /> Resume</>
                    ) : exam.attempt_count > 0 ? (
                      <><RotateCcw className="w-3.5 h-3.5 mr-1" /> Retake</>
                    ) : (
                      <><Play className="w-3.5 h-3.5 mr-1" /> Start Exam</>
                    )}
                  </Button>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No exam history yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {history.map((entry) => (
              <motion.div key={entry.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{entry.exam_title}</h3>
                      <p className="text-xs text-gray-500">{entry.course_title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(entry.started_at).toLocaleDateString()} {new Date(entry.started_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Badge variant={entry.passed ? 'success' : 'danger'}>
                          {entry.passed ? 'Passed' : 'Failed'}
                        </Badge>
                        <Badge variant={entry.status === 'completed' ? 'success' : entry.status === 'timeout' ? 'warning' : 'default'}>
                          {entry.status}
                        </Badge>
                      </div>
                      <p className="text-lg font-bold mt-1">{entry.score}%</p>
                    </div>
                  </div>
                  {entry.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => navigate(`/student/exams/${entry.exam_id}/results/${entry.id}`)}
                    >
                      View Results
                    </Button>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )
      )}
    </motion.div>
  );
}

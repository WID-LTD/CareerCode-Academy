import { useState, useEffect } from 'react';
import { api } from '../../lib/axios';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { Loader } from '../../components/ui/Loader';
import CodeEditor from '../../components/student/CodeEditor';
import { Code, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';

export default function Challenges() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadChallenges();
  }, [page, pageSize]);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/student/challenges?page=${page}&limit=${pageSize}`);
      setChallenges(data.data || []);
      if (data.pagination) {
        setTotalItems(data.pagination.total);
        setTotalPages(data.pagination.pages);
      }
    } catch {
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Coding Challenges</h1>
        <p className="text-gray-500">Practice coding with interactive challenges from your courses.</p>
      </div>

      <div className="space-y-4">
        {challenges.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Code className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No coding challenges available yet.</p>
          </GlassCard>
        ) : (
          challenges.map((ch: any) => {
            const isOpen = expanded === ch.id;
            const sub = ch.submission;
            return (
              <GlassCard key={ch.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{ch.title}</h3>
                      {sub && (
                        <Badge className={sub.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}>
                          {sub.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      )}
                      <Badge className="bg-blue-500/10 text-blue-400 text-[10px]">{ch.difficulty}</Badge>
                    </div>
                    <p className="text-gray-400 text-sm">{ch.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{ch.language}</span>
                      <span>Course: {ch.course_title}</span>
                      <span>Lesson: {ch.lesson_title}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(isOpen ? null : ch.id)}
                  >
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="text-sm text-gray-300 mb-3 whitespace-pre-wrap">{ch.instructions}</div>
                    {sub?.feedback && (
                      <div className="text-xs text-gray-400 mb-3 p-2 rounded-lg bg-gray-800/50">
                        Feedback: {sub.feedback}
                      </div>
                    )}
                    <CodeEditor
                      starterCode={ch.starter_code}
                      language={ch.language}
                      initialCode={sub?.code}
                      onSubmit={async (code) => {
                        try {
                          const { data } = await api.post(`/challenges/${ch.id}/submit`, { code, passed: false });
                          loadChallenges();
                          return { passed: data.data.passed };
                        } catch {
                          return { passed: false, output: 'Submission failed' };
                        }
                      }}
                    />
                  </div>
                )}
              </GlassCard>
            );
          })
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}

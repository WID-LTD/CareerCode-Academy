import { useState, useEffect } from 'react';
import { api } from '../../lib/axios';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { Loader } from '../../components/ui/Loader';
import SolveChallenge from '../../components/student/SolveChallenge';
import { Code, FileText, Palette, Image, Briefcase, PenLine, ChevronDown, ChevronUp, Zap, Award } from 'lucide-react';

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  code: { icon: Code, label: 'Code', color: 'text-purple-500 bg-purple-500/10' },
  practical: { icon: FileText, label: 'Practical', color: 'text-orange-500 bg-orange-500/10' },
  design: { icon: Palette, label: 'Design', color: 'text-pink-500 bg-pink-500/10' },
  media: { icon: Image, label: 'Media', color: 'text-cyan-500 bg-cyan-500/10' },
  business: { icon: Briefcase, label: 'Business', color: 'text-emerald-500 bg-emerald-500/10' },
  essay: { icon: PenLine, label: 'Essay', color: 'text-amber-500 bg-amber-500/10' },
};

export default function Challenges() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { loadChallenges(); }, [page, pageSize]);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/student/challenges?page=${page}&limit=${pageSize}`);
      setChallenges(data.data || []);
      if (data.pagination) {
        setTotalItems(data.pagination.total);
        setTotalPages(data.pagination.pages);
      }
    } catch { setChallenges([]); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader size="lg" /></div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Challenges</h1>
        <p className="text-gray-500">Practice with interactive challenges from your courses.</p>
      </div>

      <div className="space-y-4">
        {challenges.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Code className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No challenges available yet.</p>
          </GlassCard>
        ) : (
          challenges.map((ch: any) => {
            const isOpen = expanded === ch.id;
            const sub = ch.submission;
            const tc = typeConfig[ch.type] || typeConfig.code;
            const Icon = tc.icon;
            return (
              <GlassCard key={ch.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tc.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-white font-semibold">{ch.title}</h3>
                      {sub && (
                        <Badge className={sub.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}>
                          {sub.passed ? 'Passed' : sub.score !== null ? 'Graded' : 'Submitted'}
                        </Badge>
                      )}
                      <Badge className="bg-blue-500/10 text-blue-400 text-[10px]">{ch.difficulty}</Badge>
                      <Badge className="bg-gray-500/10 text-gray-400 text-[10px]">{tc.label}</Badge>
                      {sub?.score !== null && sub?.score !== undefined && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                          <Zap className="w-3 h-3" /> {sub.score}/100
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{ch.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {ch.language && <span>{ch.language}</span>}
                      <span>Course: {ch.course_title}</span>
                      <span>Lesson: {ch.lesson_title}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(isOpen ? null : ch.id)}>
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
                    <SolveChallenge
                      challenge={ch}
                      submission={sub}
                      onSubmitted={loadChallenges}
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
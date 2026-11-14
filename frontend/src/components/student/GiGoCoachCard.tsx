import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, MessageSquare, Sparkles, Target } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useStudentStore } from '@/store/studentStore';

export function GiGoCoachCard() {
  const { recentCourses, stats } = useStudentStore();
  const active = recentCourses.find((c: any) => c.progress > 0 && c.progress < 100) || recentCourses[0];
  const next = active
    ? `Continue ${active.title}`
    : stats?.enrolledCourses
      ? 'Open your courses and choose the next lesson'
      : 'Start with a free trial and pick your first course';

  const ask = (prompt: string) => {
    window.dispatchEvent(new CustomEvent('gigo:open', { detail: { prompt } }));
  };

  return (
    <GlassCard className="p-5" hover={false}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">GiGo coach</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Ready</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{next}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {active && (
              <Link to={`/student/courses/${active.slug}`}>
                <Button size="sm" variant="primary"><BookOpen className="w-3.5 h-3.5 mr-1" /> Continue learning</Button>
              </Link>
            )}
            <Button size="sm" variant="outline" onClick={() => ask('Look at my dashboard and tell me exactly what to do next this week.')}>
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Ask GiGo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => ask('Build me a realistic study plan for the next 7 days and add it to my To-Do list.')}>
              <Target className="w-3.5 h-3.5 mr-1" /> Build a plan <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

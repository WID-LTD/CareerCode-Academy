import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Compass, GraduationCap, MessageSquare, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import SEO from '@/components/seo/SEO';

const guides = {
  student: {
    icon: GraduationCap,
    title: 'Student guide',
    intro: 'Go from sign-up to your first verified project without guessing what to do next.',
    steps: [
      { title: 'Tell us your goal', body: 'The welcome wizard asks what you want to become, your experience and your weekly time.', link: '/student/dashboard', action: 'Open dashboard' },
      { title: 'Start your free trial', body: 'A trial unlocks every published course for seven days. No card is needed to start.', link: '/courses', action: 'Browse courses' },
      { title: 'Learn and practise', body: 'Open a lesson, take the quiz, then submit the project. Your progress is saved automatically.', link: '/student/courses', action: 'My courses' },
      { title: 'Ask GiGo', body: 'GiGo explains concepts, reviews screenshots, watches screen recordings and builds study plans.', link: '/student/dashboard', action: 'Ask GiGo' },
      { title: 'Earn a certificate', body: 'Complete the lessons, pass required quizzes and exams, and verify at least one project.', link: '/student/certificates', action: 'Certificates' },
    ],
  },
  instructor: {
    icon: Users,
    title: 'Instructor guide',
    intro: 'Create courses, run live classes, review projects and understand your earnings.',
    steps: [
      { title: 'Build your course', body: 'Use the course builder to add modules, lessons, quizzes, projects and resources.', link: '/instructor/courses', action: 'My courses' },
      { title: 'Run a live lab', body: 'Schedule a live class with a meeting link. Join is enabled only while the meeting is live.', link: '/instructor/live-classes', action: 'Live classes' },
      { title: 'Review learner work', body: 'Grade assignments, review project repositories and approve oral defenses and badges.', link: '/instructor/submissions', action: 'Submissions' },
      { title: 'See your earnings', body: 'Revenue is calculated from completed payments and shown in your earnings and payouts pages.', link: '/instructor/earnings', action: 'Earnings' },
    ],
  },
  admin: {
    icon: ShieldCheck,
    title: 'Admin guide',
    intro: 'Operate the platform: users, trials, payments, content quality and health.',
    steps: [
      { title: 'Manage learners', body: 'Open Users to see enrolled courses, trial days remaining, payments, progress and project status.', link: '/admin/users', action: 'Users' },
      { title: 'Control the trial', body: 'Set dates, duration, limits and per-user or per-course overrides in Trial Settings.', link: '/admin/trial-settings', action: 'Trial settings' },
      { title: 'Check money', body: 'Payments shows completed, pending and refunded transactions. Refunds call the provider and revoke access.', link: '/admin/payments', action: 'Payments' },
      { title: 'Review health', body: 'System Health shows services, scheduled jobs, Artificial Intelligence usage, open bug reports and an independent Claude review.', link: '/admin/system-health', action: 'System health' },
    ],
  },
};

export default function Guide() {
  const [role, setRole] = useState<keyof typeof guides>('student');
  const current = guides[role];
  const Icon = current.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12">
      <SEO title="User guide" description="Step-by-step CareerCode Academy guide for students, instructors and administrators." />
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <Badge variant="primary" size="md" className="mb-3"><Compass className="w-3.5 h-3.5 mr-1" /> CareerCode guide</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold">Know exactly what to do next</h1>
          <p className="text-gray-500 mt-3 max-w-2xl mx-auto">Follow the arrows, open the page, or ask GiGo to walk you through it in your own words.</p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <Button size="sm" onClick={() => window.dispatchEvent(new Event('tour:open'))}><Compass className="w-4 h-4 mr-1" /> Start guided tour</Button>
            <Button size="sm" variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('gigo:open', { detail: { prompt: 'Walk me through CareerCode Academy step by step. Ask me what I want to do first.' } }))}><MessageSquare className="w-4 h-4 mr-1" /> Ask GiGo</Button>
          </div>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {(Object.keys(guides) as Array<keyof typeof guides>).map((key) => {
            const G = guides[key];
            return (
              <button key={key} onClick={() => setRole(key)} className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${role === key ? 'bg-primary-500/10 border-primary-500/30 text-primary-600 dark:text-primary-400' : 'border-gray-200 dark:border-gray-800 text-gray-500'}`}>
                <G.icon className="w-4 h-4 inline mr-1.5" /> {G.title}
              </button>
            );
          })}
        </div>

        <GlassCard className="p-6 sm:p-8" hover={false}>
          <div className="flex items-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-primary-500/10 grid place-items-center"><Icon className="w-5 h-5 text-primary-500" /></div>
            <div>
              <h2 className="text-xl font-bold">{current.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{current.intro}</p>
            </div>
          </div>

          <div className="space-y-3">
            {current.steps.map((step, index) => (
              <div key={step.title} className="relative flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center gap-3 sm:w-10">
                  <div className="w-8 h-8 rounded-full bg-primary-500 text-white grid place-items-center text-sm font-bold">{index + 1}</div>
                  {index < current.steps.length - 1 && <ArrowRight className="hidden sm:block w-4 h-4 text-primary-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{step.body}</p>
                </div>
                <Link to={step.link}><Button size="sm" variant="outline">{step.action} <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button></Link>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
            <p className="text-xs text-gray-500">Still stuck? Use <strong>Report a problem</strong> in the top bar or ask GiGo. Every report includes the page and browser details so support can reproduce it.</p>
          </div>
        </GlassCard>

        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {[
            { icon: BookOpen, title: 'Courses', body: 'Browse the catalogue and start a trial.', link: '/courses' },
            { icon: Sparkles, title: 'Trial', body: 'See what the free trial unlocks.', link: '/trial' },
            { icon: MessageSquare, title: 'Community', body: 'Ask questions and meet other learners.', link: '/community' },
          ].map((item) => (
            <Link key={item.title} to={item.link}>
              <GlassCard className="p-4 h-full" hover>
                <item.icon className="w-5 h-5 text-primary-500 mb-2" />
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-gray-500 mt-1">{item.body}</p>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

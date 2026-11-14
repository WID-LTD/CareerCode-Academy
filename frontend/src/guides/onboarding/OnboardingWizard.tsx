import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Compass, Rocket, Sparkles, Target, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { useOnboarding } from '../OnboardingContext';
import toast from 'react-hot-toast';

const levels = [
  { id: 'beginner', label: 'Just starting', note: 'I am new to this field.' },
  { id: 'intermediate', label: 'Some experience', note: 'I have built a few things.' },
  { id: 'advanced', label: 'Confident', note: 'I want depth and portfolio work.' },
];
const times = [
  { id: 'light', label: '2–4 hours a week', note: 'Steady and realistic.' },
  { id: 'steady', label: '5–8 hours a week', note: 'A good learning rhythm.' },
  { id: 'intense', label: '10+ hours a week', note: 'I want to move quickly.' },
];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { dismissOnboarding } = useOnboarding();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<any[]>([]);
  const [goal, setGoal] = useState<any>(null);
  const [level, setLevel] = useState('beginner');
  const [time, setTime] = useState('steady');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/career-goals').then(({ data }) => setGoals((data.data || []).slice(0, 8))).catch(() => {});
  }, []);

  const finish = async (browse = false) => {
    setSaving(true);
    const preferences = { onboarding: { goal: goal?.slug || null, level, time, completedAt: new Date().toISOString() } };
    try {
      localStorage.setItem('careercode-onboarding', JSON.stringify(preferences));
      if (isAuthenticated) await api.put('/users/me/preferences', preferences).catch(() => {});
      dismissOnboarding();
      if (browse) navigate('/courses');
      else if (goal?.slug && isAuthenticated) navigate(`/student/career-goals/${goal.slug}`);
      else if (goal?.slug) navigate(`/signup?next=${encodeURIComponent(`/student/career-goals/${goal.slug}`)}`);
      else navigate('/courses');
    } catch {
      toast.error('Could not save your choices, but you can still browse.');
      dismissOnboarding();
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      icon: Target,
      title: 'What do you want to become?',
      subtitle: 'Pick a direction. You can change it later.',
      body: (
        <div className="grid sm:grid-cols-2 gap-2.5 max-h-[46vh] overflow-y-auto pr-1">
          {goals.map((g) => (
            <button
              key={g.slug}
              onClick={() => setGoal(g)}
              className={`text-left p-3 rounded-xl border transition-all ${goal?.slug === g.slug ? 'border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30' : 'border-gray-200 dark:border-gray-800 hover:border-primary-300'}`}
            >
              <p className="font-semibold text-sm">{g.role_title || g.title}</p>
              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{g.summary || g.title}</p>
            </button>
          ))}
          {goals.length === 0 && <p className="text-sm text-gray-500 col-span-full">Loading pathways…</p>}
        </div>
      ),
      canNext: !!goal,
    },
    {
      icon: UserRound,
      title: 'Where are you starting from?',
      subtitle: 'This helps GiGo choose the right pace.',
      body: (
        <div className="space-y-2">
          {levels.map((l) => (
            <button key={l.id} onClick={() => setLevel(l.id)} className={`w-full text-left p-3 rounded-xl border transition-all ${level === l.id ? 'border-primary-500 bg-primary-500/10' : 'border-gray-200 dark:border-gray-800'}`}>
              <p className="font-medium text-sm">{l.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{l.note}</p>
            </button>
          ))}
        </div>
      ),
      canNext: true,
    },
    {
      icon: Clock,
      title: 'How much time can you give?',
      subtitle: 'A realistic plan beats an ambitious one you cannot keep.',
      body: (
        <div className="space-y-2">
          {times.map((t) => (
            <button key={t.id} onClick={() => setTime(t.id)} className={`w-full text-left p-3 rounded-xl border transition-all ${time === t.id ? 'border-primary-500 bg-primary-500/10' : 'border-gray-200 dark:border-gray-800'}`}>
              <p className="font-medium text-sm">{t.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.note}</p>
            </button>
          ))}
        </div>
      ),
      canNext: true,
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div>
      <div className="text-center mb-5">
        <div className="w-12 h-12 rounded-2xl bg-primary-500/10 grid place-items-center mx-auto mb-3">
          <Icon className="w-6 h-6 text-primary-500" />
        </div>
        <h3 className="text-lg font-bold">{current.title}</h3>
        <p className="text-sm text-gray-500 mt-1">{current.subtitle}</p>
      </div>
      {current.body}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
        <Button variant="ghost" size="sm" onClick={() => finish(true)}>Browse myself</Button>
        <div className="flex gap-2">
          {step > 0 && <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>Back</Button>}
          {step < steps.length - 1 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!current.canNext}>
              Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => finish(false)} disabled={saving}>
              <Sparkles className="w-3.5 h-3.5 mr-1" /> {saving ? 'Saving…' : 'Show my pathway'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

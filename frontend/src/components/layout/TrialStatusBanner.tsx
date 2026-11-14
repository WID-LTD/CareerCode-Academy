import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, Sparkles } from 'lucide-react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

export function TrialStatusBanner() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [trial, setTrial] = useState<any>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    const load = () => {
      api.get('/enrollments?limit=100').then(({ data }) => {
        const t = (data.data || []).find((e: any) => e.access_type === 'trial' && Number(e.trial_days_remaining) > 0);
        setTrial(t || null);
      }).catch(() => {});
    };
    load();
    window.addEventListener('trial:updated', load);
    return () => window.removeEventListener('trial:updated', load);
  }, [isAuthenticated]);
  if (!trial) return null;
  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-amber-700 dark:text-amber-300">
      <div className="container-page flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
        <span className="inline-flex items-center gap-2 font-medium"><Sparkles className="w-4 h-4" /> All-course free trial active — {trial.trial_days_remaining} day{trial.trial_days_remaining === 1 ? '' : 's'} left.</span>
        <Link to="/student/courses" className="inline-flex items-center gap-1 font-semibold underline">Open my courses <Clock3 className="w-3.5 h-3.5" /></Link>
      </div>
    </div>
  );
}

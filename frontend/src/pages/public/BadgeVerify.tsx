import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Award, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import api from '@/lib/axios';

export default function BadgeVerify() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!code) { setLoading(false); return; }
    api.get(`/hub/badges/verify/${code}`).then(({ data }) => setData(data.data)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [code]);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 grid place-items-center px-4 py-16">
      <GlassCard className="p-8 max-w-md w-full text-center" hover={false}>
        {loading ? <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" /> : data ? (
          <>
            <Award className="w-14 h-14 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">{data.title}</h1>
            <p className="text-sm text-gray-500 mt-2">{data.description}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 text-emerald-500 px-3 py-1 text-sm"><CheckCircle2 className="w-4 h-4" /> {data.status === 'awarded' ? 'Verified badge' : data.status}</div>
            <p className="text-sm mt-4">Awarded to <strong>{data.learner_name}</strong></p>
            {data.awarded_at && <p className="text-xs text-gray-400 mt-1">{new Date(data.awarded_at).toLocaleDateString()}</p>}
            <p className="text-[11px] text-gray-400 mt-6">CareerCode Academy · WID LTD · RC 8824091</p>
          </>
        ) : (
          <>
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold">Badge not found</h1>
            <p className="text-sm text-gray-500 mt-2">This verification code is invalid or has been removed.</p>
          </>
        )}
      </GlassCard>
    </div>
  );
}

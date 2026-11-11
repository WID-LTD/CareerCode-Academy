import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle, Users } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/axios';

export default function CommunityInvite() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [state, setState] = useState<'loading' | 'joined' | 'error' | 'login'>('loading');
  const [message, setMessage] = useState('');
  const [community, setCommunity] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) { setState('login'); return; }
    if (!code) { setState('error'); setMessage('Invite code is missing.'); return; }
    let alive = true;
    (async () => {
      try {
        const { data } = await api.post(`/community/communities/invites/${code}/join`);
        if (!alive) return;
        setCommunity(data.data?.community || null);
        setState('joined');
        const joined = data.data?.community;
        if (joined?.slug) setTimeout(() => navigate(`/c/${joined.slug}`, { replace: true }), 900);
        else if (joined?.id) setTimeout(() => navigate(`/community/${joined.id}`, { replace: true }), 900);
      } catch (e: any) {
        if (!alive) return;
        setState('error');
        setMessage(e?.response?.data?.message || 'This invite is invalid or has expired.');
      }
    })();
    return () => { alive = false; };
  }, [code, isAuthenticated, navigate]);

  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-16 bg-gray-950">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <GlassCard className="p-8 text-center" hover={false}>
          {state === 'loading' && (
            <>
              <Loader2 className="w-10 h-10 text-primary-400 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Joining community…</h1>
              <p className="text-sm text-gray-400">Checking your invite link.</p>
            </>
          )}
          {state === 'joined' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">You're in!</h1>
              <p className="text-sm text-gray-400 mb-5">You joined {community?.name || 'the community'}. Opening it now…</p>
              {(community?.slug || community?.id) && <Button onClick={() => navigate(community.slug ? `/c/${community.slug}` : `/community/${community.id}`, { replace: true })}>Open community</Button>}
            </>
          )}
          {state === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Invite not available</h1>
              <p className="text-sm text-gray-400 mb-5">{message}</p>
              <Link to="/community"><Button variant="outline">Browse communities</Button></Link>
            </>
          )}
          {state === 'login' && (
            <>
              <Users className="w-12 h-12 text-primary-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Log in to join</h1>
              <p className="text-sm text-gray-400 mb-5">This invite is valid. Sign in, then open the link again to join the community.</p>
              <Link to="/login"><Button>Log in</Button></Link>
            </>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}

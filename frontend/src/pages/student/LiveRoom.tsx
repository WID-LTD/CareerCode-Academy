import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import SEO from '@/components/seo/SEO';
import toast from 'react-hot-toast';

interface RemotePeer {
  id: string;
  stream: MediaStream;
}

// Native live classroom on Cloudflare Realtime SFU (free 1,000 GB/mo).
// Signaling/tokens come from our worker (/api/v1/live/*); media uses
// standard WHIP (publish) + WHEP (subscribe) with native RTCPeerConnection
// — no extra SDK dependency.
export default function LiveRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const pcsRef = useRef<RTCPeerConnection[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<'loading' | 'live' | 'ended' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [role, setRole] = useState('student');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remotes, setRemotes] = useState<RemotePeer[]>([]);

  const cleanup = useCallback(() => {
    pcsRef.current.forEach((pc) => {
      try { pc.close(); } catch { /* ignore */ }
    });
    pcsRef.current = [];
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const leave = useCallback(async () => {
    try {
      if (sessionId) await api.post(`/live/sessions/${sessionId}/leave`);
    } catch { /* ignore */ }
    cleanup();
    setPhase('ended');
  }, [sessionId, cleanup]);

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session id');
      setPhase('error');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.post(`/live/sessions/${sessionId}/join`);
        if (cancelled) return;
        const { session, role: myRole, realtime } = data.data;
        setTitle(session.title);
        setRole(myRole);
        if (!realtime || realtime.error || (!realtime.whipUrl && !realtime.whepUrl)) {
          throw new Error(realtime?.error || 'Live media is not provisioned for this session yet (Realtime token pending).');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play().catch(() => {});
        }

        // Publish local media (WHIP)
        if (realtime.whipUrl) {
          const pub = new RTCPeerConnection();
          pcsRef.current.push(pub);
          stream.getTracks().forEach((t) => pub.addTrack(t, stream));
          const offer = await pub.createOffer();
          await pub.setLocalDescription(offer);
          const res = await fetch(realtime.whipUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/sdp',
              ...(realtime.token ? { Authorization: `Bearer ${realtime.token}` } : {}),
            },
            body: offer.sdp,
          });
          if (!res.ok) throw new Error(`Publish failed (${res.status})`);
          await pub.setRemoteDescription({ type: 'answer', sdp: await res.text() });
        }

        // Subscribe to room mix (WHEP)
        if (realtime.whepUrl) {
          const sub = new RTCPeerConnection();
          pcsRef.current.push(sub);
          sub.addTransceiver('video', { direction: 'recvonly' });
          sub.addTransceiver('audio', { direction: 'recvonly' });
          sub.ontrack = (ev) => {
            const [s] = ev.streams;
            if (!s) return;
            setRemotes((prev) => (prev.some((p) => p.id === s.id) ? prev : [...prev, { id: s.id, stream: s }]));
          };
          const offer = await sub.createOffer();
          await sub.setLocalDescription(offer);
          const res = await fetch(realtime.whepUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/sdp',
              ...(realtime.token ? { Authorization: `Bearer ${realtime.token}` } : {}),
            },
            body: offer.sdp,
          });
          if (!res.ok) throw new Error(`Subscribe failed (${res.status})`);
          await sub.setRemoteDescription({ type: 'answer', sdp: await res.text() });
        }

        setPhase('live');
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.response?.data?.message || e?.message || 'Could not join the live session');
          setPhase('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => () => { cleanup(); }, [cleanup]);

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted(!muted);
  };
  const toggleCamera = () => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = cameraOff; });
    setCameraOff(!cameraOff);
  };

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <p className="text-sm text-gray-500">Joining live session…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <GlassCard className="p-8 max-w-md text-center">
          <SEO title="Live session unavailable" />
          <h2 className="text-lg font-semibold mb-2">Couldn’t join</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>Go back</Button>
        </GlassCard>
      </div>
    );
  }

  if (phase === 'ended') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <GlassCard className="p-8 max-w-md text-center">
          <SEO title="Session ended" />
          <h2 className="text-lg font-semibold mb-2">You left the session</h2>
          <p className="text-sm text-gray-500 mb-4">Your attendance was recorded. See you next time!</p>
          <Button onClick={() => navigate('/student/dashboard')}>Back to dashboard</Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6">
      <SEO title={title || 'Live session'} />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {remotes.length + 1} in room · you are {role}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(window.location.href).catch(() => {}); toast.success('Invite link copied'); }}>
            Copy invite link
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
            <video ref={localVideoRef} muted playsInline className="w-full h-full object-cover" />
            <span className="absolute bottom-2 left-2 text-xs bg-black/60 px-2 py-1 rounded">You{muted ? ' (muted)' : ''}</span>
          </div>
          {remotes.map((p) => (
            <RemoteTile key={p.id} stream={p.stream} />
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={toggleMute} aria-label="Toggle mic" className={`w-12 h-12 rounded-full flex items-center justify-center ${muted ? 'bg-red-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
            {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button onClick={toggleCamera} aria-label="Toggle camera" className={`w-12 h-12 rounded-full flex items-center justify-center ${cameraOff ? 'bg-red-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
            {cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
          <button onClick={leave} aria-label="Leave" className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 flex items-center gap-2 font-medium">
            <PhoneOff className="w-5 h-5" /> Leave
          </button>
        </div>
      </div>
    </div>
  );
}

function RemoteTile({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);
  return (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
      <video ref={ref} playsInline className="w-full h-full object-cover" />
    </div>
  );
}

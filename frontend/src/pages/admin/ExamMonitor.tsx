import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Camera, Clock, User, AlertCircle, Loader2, Maximize2, Minimize2, WifiOff, Wifi } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import api from '@/lib/axios';
import { useSocket } from '@/hooks/useSocket';

export default function ExamMonitor() {
  const { socket } = useSocket();
  const [activeAttempts, setActiveAttempts] = useState<any[]>([]);
  const [frames, setFrames] = useState<Record<string, { screen?: string; camera?: string; faceDetected: boolean; violations: number }>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [connectedCount, setConnectedCount] = useState(0);

  useEffect(() => {
    loadActiveAttempts();

    if (socket) {
      socket.emit('exam:monitor:join');

      const onFrame = (data: any) => {
        setFrames(prev => ({ ...prev, [data.userId]: { screen: data.screen, camera: data.camera, faceDetected: data.faceDetected, violations: data.violations } }));
      };
      const onUserLeave = (data: any) => {
        setActiveAttempts(prev => prev.filter(a => a.user_id !== data.userId));
        setFrames(prev => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      };

      socket.on('exam:frame', onFrame);
      socket.on('exam:monitor:user:leave', onUserLeave);

      return () => {
        socket.emit('exam:monitor:leave');
        socket.off('exam:frame', onFrame);
        socket.off('exam:monitor:user:leave', onUserLeave);
      };
    }
  }, [socket]);

  const loadActiveAttempts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/exams/active-attempts');
      setActiveAttempts(data.data || []);
      setConnectedCount((data.data || []).length);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const attemptTime = (startedAt: string) => {
    const ms = Date.now() - new Date(startedAt).getTime();
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Live Exam Monitor</h1>
          <p className="text-gray-500 mt-1">Real-time view of all active exam sessions.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm">
            <Wifi className={`w-4 h-4 ${socket?.connected ? 'text-emerald-400' : 'text-gray-500'}`} />
            {socket?.connected ? 'Connected' : 'Disconnected'}
          </span>
          <Badge variant="primary">{connectedCount} active</Badge>
          <Button size="sm" variant="outline" onClick={loadActiveAttempts}><Loader2 className="w-3 h-3 mr-1" /> Refresh</Button>
        </div>
      </div>

      {activeAttempts.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Monitor className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No active exam sessions</p>
          <p className="text-sm mt-1">Students' live feeds will appear here when they start an exam.</p>
        </div>
      ) : (
        <div className={expanded ? 'space-y-4' : 'grid md:grid-cols-2 xl:grid-cols-3 gap-4'}>
          {activeAttempts.map((attempt) => {
            const frame = frames[attempt.user_id];
            const isExpanded = expanded === attempt.user_id;

            return (
              <motion.div
                key={attempt.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={isExpanded ? 'col-span-full' : ''}
              >
                <GlassCard className={`p-4 ${isExpanded ? 'max-w-4xl mx-auto' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{attempt.user_name}</p>
                        <p className="text-xs text-gray-500 truncate">{attempt.exam_title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {frame && (
                        <span className={`w-2 h-2 rounded-full ${frame.faceDetected ? 'bg-emerald-400' : 'bg-red-400'}`} title={frame.faceDetected ? 'Face detected' : 'No face detected'} />
                      )}
                      <Badge variant={frame ? 'success' : 'default'} className="text-[10px]">
                        {frame ? 'Live' : 'No feed'}
                      </Badge>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : attempt.user_id)}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {attemptTime(attempt.started_at)}</span>
                    <span>{attempt.course_title}</span>
                    {frame && <span className={`${frame.violations > 0 ? 'text-red-400' : ''}`}>{frame.violations} violation(s)</span>}
                  </div>

                  <div className={`grid gap-2 ${isExpanded ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`}>
                    {/* Screen feed */}
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                      {frame?.screen ? (
                        <img src={frame.screen} alt="Screen" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-center text-gray-600">
                          <Monitor className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">No screen feed</p>
                        </div>
                      )}
                      <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-gray-400">Screen</span>
                    </div>

                    {/* Camera feed */}
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                      {frame?.camera ? (
                        <img src={frame.camera} alt="Camera" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-center text-gray-600">
                          <Camera className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">No camera feed</p>
                        </div>
                      )}
                      <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-gray-400">Camera</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                      <div className="p-2 rounded-lg bg-gray-800/50">
                        <p className="text-gray-500">Duration</p>
                        <p className="font-medium text-white">{attemptTime(attempt.started_at)}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-800/50">
                        <p className="text-gray-500">Face</p>
                        <p className={`font-medium ${frame?.faceDetected ? 'text-emerald-400' : 'text-red-400'}`}>{frame?.faceDetected ? 'Detected' : 'Missing'}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-800/50">
                        <p className="text-gray-500">Violations</p>
                        <p className={`font-medium ${frame && frame.violations > 0 ? 'text-red-400' : 'text-white'}`}>{frame?.violations || 0}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-800/50">
                        <p className="text-gray-500">Max Attempts</p>
                        <p className="font-medium text-white">{attempt.max_attempts}</p>
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Camera, Clock, User, AlertCircle, Loader2, Maximize2, Minimize2, WifiOff, Wifi, History, Search, Trash2, Play, X, Film, HardDrive, Calendar } from 'lucide-react';
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
  const [tab, setTab] = useState<'live' | 'history'>('live');
  const [viewModes, setViewModes] = useState<Record<string, 'composite' | 'screen' | 'camera'>>({});
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const knownUsersRef = useRef<Set<string>>(new Set());

  // History state
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyOffset, setHistoryOffset] = useState(0);
  const [viewingRecording, setViewingRecording] = useState<any>(null);
  const historyLimit = 20;

  useEffect(() => {
    loadActiveAttempts();
    if (socket) {
      socket.emit('exam:monitor:join');
      const onFrame = (data: any) => {
        if (!knownUsersRef.current.has(data.userId)) {
          knownUsersRef.current.add(data.userId);
          loadActiveAttempts();
        }
        setFrames(prev => ({ ...prev, [data.userId]: { screen: data.screen, camera: data.camera, faceDetected: data.faceDetected, violations: data.violations } }));
      };
      const onUserLeave = (data: any) => {
        setActiveAttempts(prev => prev.filter(a => a.user_id !== data.userId));
        setFrames(prev => { const next = { ...prev }; delete next[data.userId]; return next; });
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
      const { data } = await api.get('/exams/monitor/active-attempts');
      setActiveAttempts(data.data || []);
      setConnectedCount((data.data || []).length);
      (data.data || []).forEach((a: any) => knownUsersRef.current.add(a.user_id));
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadHistory = useCallback(async (search?: string, offset?: number) => {
    setHistoryLoading(true);
    try {
      const limit = historyLimit;
      const currentOffset = offset ?? historyOffset;
      const currentSearch = search ?? historySearch;
      const { data } = await api.get(`/exams/monitor/proctoring-history?limit=${limit}&offset=${currentOffset}&search=${encodeURIComponent(currentSearch)}`);
      setHistoryData(data.data || []);
      setHistoryTotal(data.total || 0);
    } catch { /* ignore */ }
    setHistoryLoading(false);
  }, [historyLimit, historyOffset, historySearch]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const handleSearch = () => {
    setHistoryOffset(0);
    loadHistory(historySearch, 0);
  };

  const handleDeleteRecording = async (recordingId: string) => {
    if (!confirm('Delete this recording permanently?')) return;
    try {
      await api.delete(`/admin/exams/proctoring-recording/${recordingId}`);
      setHistoryData(prev => prev.filter(h => h.recording_id !== recordingId));
    } catch { /* ignore */ }
  };

  const attemptTime = (startedAt: string) => {
    const ms = Date.now() - new Date(startedAt).getTime();
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  const drawFrameToCanvas = useCallback((userId: string) => {
    const canvas = canvasRefs.current[userId];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const frame = frames[userId];
    const mode = viewModes[userId] || 'composite';

    const img = new Image();
    if (mode === 'camera' && frame?.camera) {
      img.src = frame.camera;
    } else if (mode === 'screen' && frame?.screen) {
      img.src = frame.screen;
    } else if (frame?.screen) {
      img.src = frame.screen;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    img.onload = () => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (!cw || !ch) return;
      canvas.width = cw * (window.devicePixelRatio || 1);
      canvas.height = ch * (window.devicePixelRatio || 1);
      ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      const iw = img.width;
      const ih = img.height;
      const scale = Math.min(cw / iw, ch / ih);
      const ox = (cw - iw * scale) / 2;
      const oy = (ch - ih * scale) / 2;
      ctx.drawImage(img, ox, oy, iw * scale, ih * scale);

      // Composite overlay: draw camera PiP on top-right for composite mode
      if (mode === 'composite' && frame?.camera) {
        const pipW = cw * 0.2;
        const pipH = (pipW * 3) / 4;
        const pipX = cw - pipW - 12;
        const pipY = 12;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pipX, pipY, pipW, pipH);
        const camImg = new Image();
        camImg.src = frame.camera;
        camImg.onload = () => {
          ctx.drawImage(camImg, pipX, pipY, pipW, pipH);
        };
      }
    };
  }, [frames, viewModes]);

  // Redraw canvases whenever frames or viewModes change
  useEffect(() => {
    const userIds = Object.keys(canvasRefs.current);
    for (const userId of userIds) {
      drawFrameToCanvas(userId);
    }
  }, [frames, viewModes, drawFrameToCanvas]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Exam Monitor</h1>
          <p className="text-gray-500 mt-1">Live monitoring and recorded history of exam sessions.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="relative flex w-2.5 h-2.5">
              {socket?.connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${socket?.connected ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
            </span>
            {socket?.connected ? 'Live Sync Active' : 'Disconnected'}
          </span>
          {tab === 'live' && <Badge variant="primary">{connectedCount} active</Badge>}
          {tab === 'live' && <Button size="sm" variant="outline" onClick={loadActiveAttempts}><Loader2 className="w-3 h-3 mr-1" /> Refresh</Button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setTab('live')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${tab === 'live' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Wifi className="w-4 h-4" /> Live
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${tab === 'history' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <History className="w-4 h-4" /> History
        </button>
      </div>

      {/* Live Tab */}
      {tab === 'live' && (
        activeAttempts.length === 0 ? (
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
              const viewMode = viewModes[attempt.user_id] || 'composite';
              return (
                <motion.div key={attempt.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={isExpanded ? 'col-span-full' : ''}>
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

                    {/* View mode toggle */}
                    <div className="flex gap-1 mb-3">
                      {(['composite', 'screen', 'camera'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setViewModes(prev => ({ ...prev, [attempt.user_id]: mode }))}
                          className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors capitalize ${
                            viewMode === mode
                              ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                              : 'bg-gray-800/50 text-gray-500 hover:text-gray-300 border border-transparent'
                          }`}
                        >
                          {mode === 'composite' ? 'Screen+Camera' : mode}
                        </button>
                      ))}
                    </div>

                    {/* Canvas live feed */}
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                      <canvas
                        ref={(el) => { canvasRefs.current[attempt.user_id] = el; }}
                        className="w-full h-full object-contain"
                      />
                      {!frame && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-600 bg-gray-900/80">
                          <div className="text-center">
                            <Monitor className="w-8 h-8 mx-auto mb-1 opacity-50" />
                            <p className="text-xs">Waiting for feed...</p>
                          </div>
                        </div>
                      )}
                      <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-gray-400">
                        {viewMode === 'composite' ? 'Screen + Camera' : viewMode === 'screen' ? 'Screen only' : 'Camera only'}
                      </span>
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
        )
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by student name or email..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleSearch}><Search className="w-3.5 h-3.5 mr-1" /> Search</Button>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : historyData.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No exam history</p>
              <p className="text-sm mt-1">Completed exam sessions with recordings will appear here.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                {historyData.map((entry) => {
                  const hasRecording = !!entry.recording_id;
                  const expiresIn = entry.recording_expires_at
                    ? Math.ceil((new Date(entry.recording_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <GlassCard key={entry.attempt_id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-primary-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{entry.user_name}</p>
                            <p className="text-xs text-gray-500 truncate">{entry.exam_title} — {entry.course_title}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {entry.submitted_at ? new Date(entry.submitted_at).toLocaleDateString() : '—'}
                              </span>
                              <Badge variant={entry.passed ? 'success' : 'danger'} className="text-[10px]">
                                {entry.score}% {entry.passed ? 'Passed' : 'Failed'}
                              </Badge>
                              <Badge variant={entry.status === 'completed' ? 'success' : 'warning'} className="text-[10px]">
                                {entry.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {hasRecording && entry.recording_url ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setViewingRecording(entry)}>
                                <Play className="w-3.5 h-3.5 mr-1" /> View Recording
                              </Button>
                              <button
                                onClick={() => handleDeleteRecording(entry.recording_id)}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                                title="Delete recording"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-600">No recording</span>
                          )}
                        </div>
                      </div>
                      {hasRecording && expiresIn !== null && (
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-600">
                          <HardDrive className="w-3 h-3" />
                          {entry.file_size_bytes ? `${(entry.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : 'Unknown size'}
                          {entry.duration_seconds ? ` · ${Math.floor(entry.duration_seconds / 60)}m ${entry.duration_seconds % 60}s` : ''}
                          {expiresIn > 0 ? ` · Auto-deletes in ${expiresIn} day(s)` : ' · Expired'}
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>

              {/* Pagination */}
              {historyTotal > historyLimit && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={historyOffset === 0}
                    onClick={() => { const newOff = Math.max(0, historyOffset - historyLimit); setHistoryOffset(newOff); loadHistory(historySearch, newOff); }}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-gray-500">
                    Page {Math.floor(historyOffset / historyLimit) + 1} of {Math.ceil(historyTotal / historyLimit)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={historyOffset + historyLimit >= historyTotal}
                    onClick={() => { const newOff = historyOffset + historyLimit; setHistoryOffset(newOff); loadHistory(historySearch, newOff); }}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Recording Viewer Modal */}
      {viewingRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewingRecording(null)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900 rounded-2xl w-full max-w-4xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
              <div>
                <h3 className="font-semibold text-lg">{viewingRecording.user_name}'s Session</h3>
                <p className="text-sm text-gray-400 mt-0.5">{viewingRecording.exam_title}</p>
              </div>
              <button onClick={() => setViewingRecording(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>
            <div className="p-6 bg-gradient-to-b from-transparent to-black/20">
              {viewingRecording.recording_url ? (
                <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black">
                  <video
                    controls
                    autoPlay
                    className="w-full"
                    style={{ maxHeight: '70vh' }}
                  src={viewingRecording.recording_url}
                >
                  </video>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500 bg-black/20 rounded-2xl ring-1 ring-white/5">
                  <Film className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium text-lg">Recording unavailable</p>
                  <p className="text-sm mt-1 text-gray-600">The video file could not be loaded.</p>
                </div>
              )}
              <div className="flex items-center gap-4 mt-6 text-sm text-gray-400 bg-white/5 rounded-xl p-4 ring-1 ring-white/10">
                {viewingRecording.duration_seconds && (
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-500" /> {Math.floor(viewingRecording.duration_seconds / 60)}m {viewingRecording.duration_seconds % 60}s</span>
                )}
                {viewingRecording.file_size_bytes && (
                  <span className="flex items-center gap-1.5"><HardDrive className="w-4 h-4 text-gray-500" /> {(viewingRecording.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                )}
                <div className="flex-1" />
                <Badge variant={viewingRecording.passed ? 'success' : 'danger'} className="px-3 py-1 text-sm font-medium">
                  Score: {viewingRecording.score}% ({viewingRecording.passed ? 'Passed' : 'Failed'})
                </Badge>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

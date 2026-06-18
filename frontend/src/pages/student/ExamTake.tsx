import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, Loader2, ChevronLeft, ChevronRight, Flag, CheckCircle, XCircle, Eye, Monitor, Camera, Ban, FileText, Shield, Loader } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/axios';
import toast from 'react-hot-toast';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useSocket } from '@/hooks/useSocket';

export default function ExamTake() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const [warnTime, setWarnTime] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isResumed, setIsResumed] = useState(false);

  // Proctoring state
  const [showRules, setShowRules] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [violations, setViolations] = useState(0);
  const violationLimit = 3;
  const [proctorWarn, setProctorWarn] = useState('');

  // Refs for stale closure prevention
  const proctoringActiveRef = useRef(false);
  const submittingRef = useRef(false);
  const cleanupRef = useRef(false);
  const answersRef = useRef(answers);
  const flaggedQuestionsRef = useRef(flaggedQuestions);
  const violationsRef = useRef(violations);

  // Sync refs with state
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { flaggedQuestionsRef.current = flaggedQuestions; }, [flaggedQuestions]);
  useEffect(() => { violationsRef.current = violations; }, [violations]);

  // Face detection — pre-init when rules screen shows (not only after accept)
  const { faceDetectedRef, hasCamera, cameraError, cameraReady, videoRef: cameraVideoRef } = useFaceDetection(showRules || rulesAccepted);
  const [faceMissingCountdown, setFaceMissingCountdown] = useState(0);
  const faceTimerRef = useRef<any>(null);
  const faceBeepRef = useRef<any>(null);
  const faceMissingStartRef = useRef(0);
  const FACE_MISSING_TIMEOUT = 60;

  // Screen sharing + socket streaming
  const { socket } = useSocket();
  const screenStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<any>(null);
  const screenCaptureVideoRef = useRef<HTMLVideoElement | null>(null);

  // Audio context singleton (no more AudioContext leak)
  const audioCtxRef = useRef<AudioContext | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  // Stored listener refs for proper cleanup
  const boundVisibilityRef = useRef<((e: Event) => void) | null>(null);
  const boundBlurRef = useRef<((e: Event) => void) | null>(null);
  const boundFullscreenRef = useRef<((e: Event) => void) | null>(null);

  // Synchronous answers updater — keeps ref in sync immediately
  const updateAnswers = (questionId: string, value: string) => {
    setAnswers(prev => {
      const next = { ...prev, [questionId]: value };
      answersRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    cleanupRef.current = false;
    loadExam();
    return () => {
      cleanupRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (faceTimerRef.current) clearInterval(faceTimerRef.current);
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (faceBeepRef.current) clearInterval(faceBeepRef.current);
      if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      if (screenCaptureVideoRef.current && screenCaptureVideoRef.current.parentNode) {
        screenCaptureVideoRef.current.parentNode.removeChild(screenCaptureVideoRef.current);
        screenCaptureVideoRef.current = null;
      }
      if (boundVisibilityRef.current) document.removeEventListener('visibilitychange', boundVisibilityRef.current);
      if (boundBlurRef.current) window.removeEventListener('blur', boundBlurRef.current);
      if (boundFullscreenRef.current) document.removeEventListener('fullscreenchange', boundFullscreenRef.current);
    };
  }, [examId]);

  const autoSubmitViolation = useCallback(async (reason: string) => {
    if (submittingRef.current || !examId || !attemptId) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    toast.error(`Auto-submitted due to: ${reason}`);
    try {
      const answerArray = Object.entries(answersRef.current).map(([qId, answer]) => ({ questionId: qId, answer }));
      const { data } = await api.post(`/exams/student/${examId}/submit`, { answers: answerArray, flaggedQuestions: flaggedQuestionsRef.current });
      navigate(`/student/exams/${examId}/results/${data.data.attemptId}`);
      return;
    } catch (err: any) {
      console.error('Auto-submit failed, trying timeout:', err?.response?.data || err.message);
    }
    try {
      const { data } = await api.post(`/exams/student/${examId}/timeout`);
      navigate(`/student/exams/${examId}/results/${data.data.attemptId}`);
      return;
    } catch (err: any) {
      console.error('Timeout fallback failed:', err?.response?.data || err.message);
      toast.error('Failed to auto-submit. Please contact support.');
    }
    submittingRef.current = false;
    setSubmitting(false);
  }, [examId, attemptId]);

  const handleViolation = useCallback((reason: string, warning: string) => {
    setViolations(prev => {
      const next = prev + 1;
      setProctorWarn(`${warning} (${next}/${violationLimit})`);
      return next;
    });
    if (violationsRef.current + 1 >= violationLimit) {
      autoSubmitViolation(reason);
    }
  }, [autoSubmitViolation]);

  const onVisibilityChange = useCallback((_e?: Event) => {
    if (document.hidden && proctoringActiveRef.current) {
      handleViolation('Repeated tab switching', 'Warning: Tab switch detected');
    }
  }, [handleViolation]);

  const onWindowBlur = useCallback((_e?: Event) => {
    if (proctoringActiveRef.current) {
      handleViolation('Repeated loss of window focus', 'Warning: Window focus lost');
    }
  }, [handleViolation]);

  const onFullscreenChange = useCallback((_e?: Event) => {
    if (proctoringActiveRef.current && !document.fullscreenElement) {
      handleViolation('Fullscreen was disabled', 'Warning: Fullscreen exited');
    }
  }, [handleViolation]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
      });
      screenStreamRef.current = stream;

      // Auto-reprompt if user stops sharing — up to 3 retries
      const handler = async () => {
        if (cleanupRef.current) return;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const newStream = await navigator.mediaDevices.getDisplayMedia({
              video: { displaySurface: 'monitor' },
              audio: false,
            });
            screenStreamRef.current = newStream;
            newStream.getVideoTracks()[0]?.addEventListener('ended', handler);
            return;
          } catch {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
        handleViolation('Screen sharing could not be restored', 'Warning: Screen sharing lost');
      };
      stream.getVideoTracks()[0]?.addEventListener('ended', handler);
    } catch {
      handleViolation('Screen sharing was denied', 'Warning: Screen sharing was denied');
    }
  }, [handleViolation]);

  const startProctoring = useCallback(async () => {
    proctoringActiveRef.current = true;

    const visHandler = (e: Event) => onVisibilityChange(e);
    const blurHandler = (e: Event) => onWindowBlur(e);
    const fsHandler = (e: Event) => onFullscreenChange(e);

    boundVisibilityRef.current = visHandler;
    boundBlurRef.current = blurHandler;
    boundFullscreenRef.current = fsHandler;

    document.addEventListener('visibilitychange', visHandler);
    window.addEventListener('blur', blurHandler);
    document.addEventListener('fullscreenchange', fsHandler);

    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        handleViolation('Failed to enter fullscreen', 'Warning: Fullscreen was denied');
      });
    }

    await startScreenShare();

    setRulesAccepted(true);
    setShowRules(false);
  }, [onVisibilityChange, onWindowBlur, onFullscreenChange, startScreenShare, handleViolation]);

  const loadExam = async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const startRes = await api.post(`/exams/student/${examId}/start`);
      setAttemptId(startRes.data.data.attempt.id);
      setIsResumed(!!startRes.data.data.resumed);

      const { data } = await api.get(`/exams/student/${examId}`);
      setExam(data.data);
      setQuestions(data.data.questions || []);

      const durationMs = (data.data.duration_minutes || 60) * 60;
      setTimeLeft(durationMs);

      if (startRes.data.data.resumed && data.data.activeAttemptStartedAt) {
        const startedAt = new Date(data.data.activeAttemptStartedAt).getTime();
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        const remaining = Math.max(0, durationMs - elapsed);
        setTimeLeft(remaining);
      }

      if (!startRes.data.data.resumed) {
        setShowRules(true);
      } else {
        setRulesAccepted(true);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load exam');
      navigate('/student/exams');
    } finally {
      setLoading(false);
    }
  };

  // Singleton AudioContext — no more memory leak
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playBeep = useCallback((frequency: number, duration: number) => {
    try {
      const audioCtx = getAudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = frequency;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch { /* audio not available */ }
  }, [getAudioCtx]);

  // Frame streaming to admin monitoring — persistent video element, connected check
  useEffect(() => {
    if (!rulesAccepted || !socket || !examId) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const SCREEN_FPS = 3000;

    if (!screenCaptureVideoRef.current) {
      const vid = document.createElement('video');
      vid.style.display = 'none';
      vid.muted = true;
      vid.playsInline = true;
      document.body.appendChild(vid);
      screenCaptureVideoRef.current = vid;
    }
    const screenVideo = screenCaptureVideoRef.current;

    frameIntervalRef.current = setInterval(() => {
      const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
      if (!screenTrack || !ctx) return;

      try {
        const settings = screenTrack.getSettings();
        canvas.width = settings.width || 640;
        canvas.height = settings.height || 480;

        if (screenStreamRef.current && !screenVideo.srcObject) {
          screenVideo.srcObject = screenStreamRef.current;
          screenVideo.play().catch(() => {});
        }

        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        const screenBase64 = canvas.toDataURL('image/jpeg', 0.3);

        if (!socket.connected) return;
        socket.emit('exam:frame', {
          screen: screenBase64,
          userId: socket.id,
          examId,
          faceDetected: faceDetectedRef.current,
          violations: violationsRef.current,
        });
      } catch { /* frame capture failed */ }
    }, SCREEN_FPS);

    return () => {
      clearInterval(frameIntervalRef.current);
    };
  }, [rulesAccepted, socket, examId]);

  // Face detection countdown — faceMissingStart in ref to survive effect re-runs
  useEffect(() => {
    if (!rulesAccepted || submitting) return;
    let beepInterval: any = null;

    faceTimerRef.current = setInterval(() => {
      const hasFace = faceDetectedRef.current;
      if (!hasFace && hasCamera) {
        if (faceMissingStartRef.current === 0) {
          faceMissingStartRef.current = Date.now();
        }
        const elapsed = Math.floor((Date.now() - faceMissingStartRef.current) / 1000);
        const remaining = Math.max(0, FACE_MISSING_TIMEOUT - elapsed);
        setFaceMissingCountdown(remaining);

        // Start beep countdown at 5 seconds
        if (remaining <= 5 && remaining > 0 && !beepInterval) {
          beepInterval = setInterval(() => {
            playBeep(880, 0.3);
          }, 1000);
          // Immediately play first beep
          playBeep(880, 0.3);
        }

        if (elapsed >= FACE_MISSING_TIMEOUT) {
          clearInterval(faceTimerRef.current);
          if (beepInterval) clearInterval(beepInterval);
          autoSubmitViolation('Face not detected for 60 seconds');
        }
      } else {
        faceMissingStartRef.current = 0;
        setFaceMissingCountdown(0);
        if (beepInterval) {
          clearInterval(beepInterval);
          beepInterval = null;
        }
      }
    }, 1000);

    return () => {
      clearInterval(faceTimerRef.current);
      if (beepInterval) clearInterval(beepInterval);
    };
  }, [rulesAccepted, submitting, hasCamera, autoSubmitViolation, playBeep]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitting) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        const newTime = prev - 1;
        if (newTime <= 300) setWarnTime(true);
        return newTime;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, submitting]);

  const handleTimeout = useCallback(async () => {
    if (!examId || !attemptId) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/exams/student/${examId}/timeout`);
      toast('Time is up! Your exam has been auto-submitted.');
      navigate(`/student/exams/${examId}/results/${data.data.attemptId}`);
    } catch {
      toast.error('Failed to submit on timeout');
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [examId, attemptId]);

  const handleSubmit = async () => {
    if (!examId || !attemptId || !questions.length) return;
    if (!confirm('Are you sure you want to submit your exam?')) return;

    submittingRef.current = true;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const answerArray = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    try {
      const { data } = await api.post(`/exams/student/${examId}/submit`, {
        answers: answerArray,
        flaggedQuestions,
      });
      toast.success(data.data.passed ? 'Congratulations! You passed!' : 'You did not pass this time.');
      navigate(`/student/exams/${examId}/results/${data.data.attemptId}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit');
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = flaggedQuestions.length;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleFlag = (qId: string) => {
    setFlaggedQuestions(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!exam) return null;

  // Pre-exam Rules Overlay
  if (showRules && !rulesAccepted) {
    const deniedCamera = cameraError === 'Camera access denied.';
    const canStartExam = cameraReady || (cameraError && !deniedCamera);
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-2xl p-6 sm:p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{exam.title}</h2>
              <p className="text-sm text-gray-500">{exam.course_title}</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {exam.duration_minutes} minutes</span>
              <span>Pass: {exam.passing_score}%</span>
              <span>Attempts: {exam.attempt_count}/{exam.max_attempts}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Camera className="w-4 h-4" />
              {deniedCamera ? (
                <span className="text-red-400">Camera access denied — please allow camera access in browser settings</span>
              ) : cameraReady ? (
                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Camera ready</span>
              ) : cameraError ? (
                <span className="text-amber-400">{cameraError} — you can proceed without face detection</span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1"><Loader className="w-3.5 h-3.5 animate-spin" /> Initializing camera...</span>
              )}
            </div>

            <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-400">
                <Shield className="w-4 h-4" /> Exam Rules & Guidelines
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <Monitor className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span><strong>Fullscreen Required:</strong> This exam must be taken in fullscreen mode. Exiting fullscreen counts as a violation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Ban className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span><strong>No Tab Switching:</strong> Switching to another tab or window during the exam will be flagged. After 3 violations, the exam will be auto-submitted.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Ban className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span><strong>No Copy/Paste:</strong> Copying and pasting content is disabled during the exam.</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span><strong>No Right-Click:</strong> Context menus are disabled during the exam.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Camera className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span><strong>Proctoring Active:</strong> Your exam session is being monitored for suspicious activity.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span><strong>Time Limit:</strong> The exam will auto-submit when the timer reaches zero.</span>
                </li>
              </ul>
            </div>

            {exam.instructions && (
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <h4 className="text-sm font-medium text-white mb-2">Exam Instructions</h4>
                <p className="text-sm text-gray-400 whitespace-pre-wrap">{exam.instructions}</p>
              </div>
            )}

            {exam.negative_marking && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-400">Warning: {exam.negative_percentage}% will be deducted for each wrong answer.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setShowRules(false); navigate('/student/exams'); }}>
              Cancel
            </Button>
            <Button onClick={startProctoring} disabled={!canStartExam}>
              <CheckCircle className="w-4 h-4 mr-1.5" /> I Accept &amp; Begin Exam
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Review screen
  if (showReview) {
    return (
      <div
        ref={contentRef}
        className="min-h-[80vh] flex flex-col select-none"
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-white font-semibold text-sm">Review Your Answers</h1>
          <Button size="sm" variant="outline" onClick={() => setShowReview(false)}>Back to Exam</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {questions.map((q, i) => {
            const ans = answers[q.id];
            return (
              <GlassCard key={q.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary-400">Q{i + 1}</span>
                    <Badge className="text-[10px]">{q.question_type}</Badge>
                    {flaggedQuestions.includes(q.id) && <Flag className="w-3.5 h-3.5 text-yellow-400" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {ans ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-500" />
                    )}
                    <span className={`text-xs ${ans ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {ans ? 'Answered' : 'Unanswered'}
                    </span>
                  </div>
                </div>
                <p className="text-sm mb-2">{q.question}</p>
                {q.question_type === 'essay' ? (
                  <div className="p-3 rounded-lg bg-gray-800/50">
                    <p className="text-xs text-gray-500 mb-1">Your answer:</p>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{ans || '(no answer)'}</p>
                  </div>
                ) : (
                  <p className="text-sm">Selected: <span className={ans ? 'text-emerald-400' : 'text-gray-500'}>{ans || '(none)'}</span></p>
                )}
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => { setCurrentIndex(i); setShowReview(false); }}>
                  Edit Answer
                </Button>
              </GlassCard>
            );
          })}

          <div className="flex justify-center gap-3 pb-8">
            <Button variant="outline" onClick={() => setShowReview(false)}>Back to Exam</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Submit Exam
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[80vh] flex flex-col select-none"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Proctoring warning banner */}
      {proctorWarn && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-sm text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{proctorWarn}</span>
          <button onClick={() => setProctorWarn('')} className="text-amber-400/60 hover:text-amber-400">&times;</button>
        </div>
      )}
      {faceMissingCountdown > 0 && (
        <div className={`px-4 py-2 flex items-center gap-2 text-sm ${faceMissingCountdown <= 5 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-amber-500/10 text-amber-400'}`}>
          <Camera className="w-4 h-4 shrink-0" />
          <span className="flex-1">
            {cameraError
              ? `Camera: ${cameraError}`
              : !hasCamera
                ? 'Camera not available'
                : `Face not detected — auto-submit in ${faceMissingCountdown}s`}
          </span>
        </div>
      )}

      {/* Header with timer and progress */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h1 className="text-white font-semibold text-sm truncate">{exam.title}</h1>
          <p className="text-gray-500 text-xs">{exam.course_title}</p>
        </div>
        <div className="flex items-center gap-4">
          {violations > 0 && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {violations}/{violationLimit}
            </span>
          )}
          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-32 bg-gray-800 rounded-full h-2">
              <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500">{answeredCount}/{questions.length}</span>
          </div>

          {flaggedCount > 0 && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <Flag className="w-3 h-3" /> {flaggedCount}
            </span>
          )}

          {exam.negative_marking && (
            <span className="text-xs text-red-400">-{exam.negative_percentage}%/wrong</span>
          )}

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold ${
            warnTime ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-gray-800 text-gray-200'
          }`}>
            <Clock className="w-4 h-4" />
            {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question Navigator */}
        <div className="w-20 lg:w-28 bg-gray-900 border-r border-gray-800 overflow-y-auto shrink-0 p-2">
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-1.5">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`w-full aspect-square rounded-lg text-xs font-medium transition-colors relative ${
                  i === currentIndex
                    ? 'bg-primary-500 text-white'
                    : answers[q.id]
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                }`}
              >
                {i + 1}
                {flaggedQuestions.includes(q.id) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Review button */}
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-3 text-[10px]"
            onClick={() => setShowReview(true)}
          >
            <Eye className="w-3 h-3 mr-1" /> Review
          </Button>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {currentQuestion && (
              <motion.div key={currentQuestion.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge>Question {currentIndex + 1} of {questions.length}</Badge>
                    <Badge className="bg-blue-500/10 text-blue-400 text-[10px]">{currentQuestion.question_type}</Badge>
                    <span className="text-xs text-gray-500">{currentQuestion.points} pt(s)</span>
                  </div>
                  <button
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className={`p-1.5 rounded-lg transition-colors ${flaggedQuestions.includes(currentQuestion.id) ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 hover:text-gray-300'}`}
                    title={flaggedQuestions.includes(currentQuestion.id) ? 'Unflag question' : 'Flag for review'}
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                </div>

                <h2 className="text-lg font-medium text-white mb-6">{currentQuestion.question}</h2>

                {currentQuestion.question_type === 'essay' ? (
                  <textarea
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => updateAnswers(currentQuestion.id, e.target.value)}
                    className="w-full h-48 rounded-xl bg-gray-800 border border-gray-700 text-gray-200 p-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500/50 resize-none"
                    placeholder="Type your answer here..."
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onPaste={(e) => e.preventDefault()}
                  />
                ) : (
                  <div className="space-y-3">
                    {(currentQuestion.options || []).map((opt: string, i: number) => {
                      const isSelected = answers[currentQuestion.id] === opt;
                      return (
                        <label
                          key={i}
                          className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-primary-500/10 border border-primary-500/30'
                              : 'bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                            isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-600'
                          }`}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-sm text-gray-200">{opt}</span>
                          <input
                            type="radio"
                            name={`q-${currentQuestion.id}`}
                            value={opt}
                            checked={isSelected}
                            onChange={() => updateAnswers(currentQuestion.id, opt)}
                            className="hidden"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="bg-gray-900 border-t border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {currentIndex + 1} / {questions.length}
              </span>
            </div>

            {currentIndex < questions.length - 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowReview(true)}
              >
                <Eye className="w-4 h-4 mr-1" /> Review & Submit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

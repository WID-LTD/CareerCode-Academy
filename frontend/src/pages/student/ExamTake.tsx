import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, Loader2, ChevronLeft, ChevronRight, Flag, CheckCircle, XCircle, Eye, Monitor, Camera, Ban, FileText, Shield, Loader, Play } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/axios';
import toast from 'react-hot-toast';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/store/authStore';

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

  // Wizard state (3-step exam startup)
  const [wizardStep, setWizardStep] = useState(0);
  const [cameraConsent, setCameraConsent] = useState(false);
  const [screenShared, setScreenShared] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);

  // Proctoring state
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [violations, setViolations] = useState(0);
  const violationLimit = 3;
  const [proctorWarn, setProctorWarn] = useState('');

  const [recordingActive, setRecordingActive] = useState(false);

  // Refs for stale closure prevention
  const proctoringActiveRef = useRef(false);
  const submittingRef = useRef(false);
  const cleanupRef = useRef(false);
  const rulesAcceptedRef = useRef(false);
  const answersRef = useRef(answers);
  const flaggedQuestionsRef = useRef(flaggedQuestions);
  const violationsRef = useRef(violations);

  // Sync refs with state
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { flaggedQuestionsRef.current = flaggedQuestions; }, [flaggedQuestions]);
  useEffect(() => { violationsRef.current = violations; }, [violations]);
  useEffect(() => { rulesAcceptedRef.current = rulesAccepted; }, [rulesAccepted]);

  // Face detection — pre-init when rules screen shows (not only after accept)
  const { faceDetectedRef, hasCamera, cameraError, cameraReady, cameraStarting, videoRef: cameraVideoRef, streamRef: cameraStreamRef, enableCamera } = useFaceDetection(wizardStep >= 1 || rulesAccepted);
  const cameraPreviewRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (cameraPreviewRef.current && cameraStreamRef.current) {
      cameraPreviewRef.current.srcObject = cameraStreamRef.current;
      cameraPreviewRef.current.play().catch(() => {});
    }
  }, [cameraReady, cameraStreamRef.current]);
  const [faceMissingCountdown, setFaceMissingCountdown] = useState(0);
  const faceTimerRef = useRef<any>(null);
  const faceBeepRef = useRef<any>(null);
  const faceMissingStartRef = useRef(0);
  const FACE_MISSING_TIMEOUT = 9;

  // Screen sharing + socket streaming
  const { socket } = useSocket();
  const screenStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<any>(null);
  const screenCaptureVideoRef = useRef<HTMLVideoElement | null>(null);

  // Audio context singleton (no more AudioContext leak)
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Compositing canvas + MediaRecorder for WEBM recording
  const compositingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
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

  // Stop MediaRecorder + upload WEBM recording to S3 via axios
  const stopAndUploadRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    try {
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        if (recordedChunksRef.current.length === 0) return;
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType });
        const fd = new FormData();
        fd.append('recording', blob, `exam-${examId}-${Date.now()}.webm`);
        api.post(`/exams/student/${examId}/upload-recording`, fd)
          .then(() => console.log('Recording upload complete'))
          .catch(() => console.warn('Recording upload failed'));
      };
      recorder.stop();
    } catch { /* best-effort */ }
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
      stopAndUploadRecording();
      navigate(`/student/exams/${examId}/results/${data.data.attemptId}`);
      return;
    } catch (err: any) {
      console.error('Auto-submit failed, trying timeout:', err?.response?.data || err.message);
    }
    try {
      const { data } = await api.post(`/exams/student/${examId}/timeout`);
      stopAndUploadRecording();
      navigate(`/student/exams/${examId}/results/${data.data.attemptId}`);
      return;
    } catch (err: any) {
      console.error('Timeout fallback failed:', err?.response?.data || err.message);
      toast.error('Failed to auto-submit. Please contact support.');
    }
    submittingRef.current = false;
    setSubmitting(false);
  }, [examId, attemptId, stopAndUploadRecording]);

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

  const addProctoringListeners = useCallback(() => {
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
  }, [onVisibilityChange, onWindowBlur, onFullscreenChange]);

  const handleStartExam = useCallback(async () => {
    if (!examId) return;
    try {
      const startRes = await api.post(`/exams/student/${examId}/start`);
      setAttemptId(startRes.data.data.attempt.id);
      addProctoringListeners();
      rulesAcceptedRef.current = true;
      setRulesAccepted(true);
      setWizardStep(0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start exam');
    }
  }, [examId, addProctoringListeners]);

  const handleShareScreen = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
      });
      screenStreamRef.current = stream;
      setScreenShared(true);

      const handler = async () => {
        if (cleanupRef.current || !rulesAcceptedRef.current) return;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const newStream = await navigator.mediaDevices.getDisplayMedia({
              video: { displaySurface: 'monitor' },
              audio: false,
            });
            screenStreamRef.current = newStream;
            setScreenShared(true);
            newStream.getVideoTracks()[0]?.addEventListener('ended', handler);
            return;
          } catch {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
        setScreenShared(false);
        handleViolation('Screen sharing could not be restored', 'Warning: Screen sharing lost');
      };
      stream.getVideoTracks()[0]?.addEventListener('ended', handler);
    } catch {
      setScreenShared(false);
      toast.error('Screen sharing was denied — you must share your screen to take this exam.');
    }
  }, [handleViolation]);

  const handleEnterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenActive(true);
    } catch {
      setFullscreenActive(false);
      toast.error('Fullscreen was denied — you must enter fullscreen to take this exam.');
    }
  }, []);

  // Track fullscreen state during Step 3
  useEffect(() => {
    if (wizardStep !== 3) return;
    setFullscreenActive(!!document.fullscreenElement);
    const handler = () => setFullscreenActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [wizardStep]);

  const loadExam = async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/exams/student/${examId}`);
      setExam(data.data);
      setQuestions(data.data.questions || []);

      const durationMs = (data.data.duration_minutes || 60) * 60;
      setTimeLeft(durationMs);

      setWizardStep(1);
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

  // Compositing canvas + PiP live streaming + WEBM recording
  useEffect(() => {
    if (!rulesAccepted || !socket || !examId) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    compositingCanvasRef.current = canvas;
    const SCREEN_FPS = 500;

    if (!screenCaptureVideoRef.current) {
      const vid = document.createElement('video');
      vid.style.display = 'none';
      vid.muted = true;
      vid.playsInline = true;
      document.body.appendChild(vid);
      screenCaptureVideoRef.current = vid;
    }
    const screenVideo = screenCaptureVideoRef.current;

    // Start MediaRecorder on the compositing canvas for WEBM recording
    let mediaRecorder: MediaRecorder | null = null;
    (async () => {
      try {
        const canvasStream = canvas.captureStream(5);
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
            ? 'video/webm;codecs=vp8'
            : 'video/webm';
        mediaRecorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 1_000_000 });
        recordedChunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = () => setRecordingActive(false);
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setRecordingActive(true);
      } catch (err) {
        setRecordingActive(false);
        console.warn('Exam recording not available, proceeding without recording:', err);
      }
    })();

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

        // Draw screen as full background
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

        // Draw camera PiP in top-right corner (160x120)
        const cameraVideo = cameraVideoRef?.current;
        if (cameraVideo && cameraVideo.readyState >= 2) {
          const pipW = 160, pipH = 120;
          const pipX = canvas.width - pipW - 12;
          const pipY = 12;
          ctx.save();
          const r = 8;
          ctx.beginPath();
          ctx.moveTo(pipX - 3 + r, pipY - 3);
          ctx.lineTo(pipX - 3 + pipW + 6 - r, pipY - 3);
          ctx.quadraticCurveTo(pipX - 3 + pipW + 6, pipY - 3, pipX - 3 + pipW + 6, pipY - 3 + r);
          ctx.lineTo(pipX - 3 + pipW + 6, pipY - 3 + pipH + 6 - r);
          ctx.quadraticCurveTo(pipX - 3 + pipW + 6, pipY - 3 + pipH + 6, pipX - 3 + pipW + 6 - r, pipY - 3 + pipH + 6);
          ctx.lineTo(pipX - 3 + r, pipY - 3 + pipH + 6);
          ctx.quadraticCurveTo(pipX - 3, pipY - 3 + pipH + 6, pipX - 3, pipY - 3 + pipH + 6 - r);
          ctx.lineTo(pipX - 3, pipY - 3 + r);
          ctx.quadraticCurveTo(pipX - 3, pipY - 3, pipX - 3 + r, pipY - 3);
          ctx.closePath();
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fill();
          ctx.restore();
          ctx.drawImage(cameraVideo, pipX, pipY, pipW, pipH);
        }

        const compositeBase64 = canvas.toDataURL('image/jpeg', 0.3);

        let cameraBase64: string | undefined;
        const camVideo = cameraVideoRef?.current;
        if (camVideo && camVideo.readyState >= 2) {
          const camCanvas = document.createElement('canvas');
          camCanvas.width = 160;
          camCanvas.height = 120;
          const camCtx = camCanvas.getContext('2d');
          if (camCtx) {
            camCtx.drawImage(camVideo, 0, 0, 160, 120);
            cameraBase64 = camCanvas.toDataURL('image/jpeg', 0.3);
          }
        }

        if (!socket.connected) return;
        socket.emit('exam:frame', {
          screen: compositeBase64,
          camera: cameraBase64,
          userId: useAuthStore.getState().user?.id || '',
          examId,
          faceDetected: faceDetectedRef.current,
          violations: violationsRef.current,
        });
      } catch { /* frame capture failed */ }
    }, SCREEN_FPS);

    return () => {
      clearInterval(frameIntervalRef.current);
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      compositingCanvasRef.current = null;
    };
  }, [rulesAccepted, socket, examId, cameraVideoRef]);

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

        // Start beep countdown immediately when face is missing
        if (remaining > 0 && !beepInterval) {
          beepInterval = setInterval(() => {
            playBeep(880, 0.3);
          }, 1000);
          playBeep(880, 0.3);
        }

        if (elapsed >= FACE_MISSING_TIMEOUT) {
          clearInterval(faceTimerRef.current);
          if (beepInterval) clearInterval(beepInterval);
          autoSubmitViolation('Face not detected for 9 seconds');
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
      stopAndUploadRecording();
      navigate(`/student/exams/${examId}/results/${data.data.attemptId}`);
    } catch {
      toast.error('Failed to submit on timeout');
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [examId, attemptId, stopAndUploadRecording]);

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
      stopAndUploadRecording();
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

  // Pre-exam 3-Step Wizard
  if (wizardStep >= 1 && !rulesAccepted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div key={wizardStep} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-2xl p-6 sm:p-8 rounded-2xl">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  wizardStep === step ? 'bg-primary-500 text-white' : wizardStep > step ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'
                }`}>
                  {wizardStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                </div>
                <div className="h-0.5 flex-1 bg-gray-800 last:hidden" />
              </div>
            ))}
          </div>

          {/* ════════ STEP 1: Rules + Camera Check ════════ */}
          {wizardStep === 1 && (
            <>
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

                {/* Camera preview */}
                <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-gray-700/50">
                  {cameraReady ? (
                    <video ref={cameraPreviewRef} className="w-full h-full object-cover" playsInline muted />
                  ) : cameraStarting ? (
                    <div className="text-center text-gray-600">
                      <Loader className="w-12 h-12 mx-auto mb-2 animate-spin opacity-50" />
                      <p className="text-sm text-amber-400">Requesting camera access...</p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-600 p-6">
                      <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm text-gray-400 mb-3">Camera is required for proctoring</p>
                      {cameraError && (
                        <p className="text-xs text-red-400 mb-3 break-all max-w-sm mx-auto">{cameraError}</p>
                      )}
                      <Button size="sm" onClick={enableCamera}>
                        <Camera className="w-4 h-4 mr-1.5" /> Enable Camera
                      </Button>
                    </div>
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
                <Button variant="ghost" onClick={() => { setWizardStep(0); navigate('/student/exams'); }}>
                  Cancel
                </Button>
                <Button onClick={() => setWizardStep(2)} disabled={!cameraReady}>
                  <Camera className="w-4 h-4 mr-1.5" /> Next — Camera Setup
                </Button>
              </div>
            </>
          )}

          {/* ════════ STEP 2: Camera Consent ════════ */}
          {wizardStep === 2 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Camera & Recording</h2>
                  <p className="text-sm text-gray-500">{exam.title}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {/* Camera feed preview — same stream the admin sees */}
                <div className="bg-gray-900 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-gray-700/50">
                  <video ref={cameraPreviewRef} className="w-full h-full object-cover" playsInline muted />
                </div>

                <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/20">
                  <p className="text-sm text-gray-300">
                    Your camera feed will be recorded during this exam for proctoring purposes. 
                    This recording is stored securely and auto-deleted after 7 days.
                    Face detection ensures you remain visible throughout the exam.
                  </p>
                </div>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cameraConsent}
                    onChange={(e) => setCameraConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-300">
                    I consent to camera recording and face detection during this exam session
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { setWizardStep(0); navigate('/student/exams'); }}>
                  Cancel
                </Button>
                <Button onClick={() => setWizardStep(3)} disabled={!cameraConsent}>
                  <Monitor className="w-4 h-4 mr-1.5" /> Next — Screen Sharing
                </Button>
              </div>
            </>
          )}

          {/* ════════ STEP 3: Screen Share + Fullscreen ════════ */}
          {wizardStep === 3 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Screen Sharing & Fullscreen</h2>
                  <p className="text-sm text-gray-500">{exam.title}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <p className="text-sm text-gray-400">
                  Share your entire screen and enter fullscreen mode. Your screen will be recorded 
                  with a camera picture-in-picture overlay for proctoring review.
                </p>

                {/* Screen share */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  screenShared ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gray-800/50 border-gray-700/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <Monitor className={`w-5 h-5 ${screenShared ? 'text-emerald-400' : 'text-gray-500'}`} />
                    <div>
                      <p className="text-sm font-medium">Screen Sharing</p>
                      <p className="text-xs text-gray-500">{screenShared ? 'Your screen is being shared' : 'Click to share your entire screen'}</p>
                    </div>
                  </div>
                  {screenShared ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Button size="sm" onClick={handleShareScreen}>
                      <Monitor className="w-3.5 h-3.5 mr-1" /> Share Screen
                    </Button>
                  )}
                </div>

                {/* Fullscreen */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  fullscreenActive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gray-800/50 border-gray-700/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <Monitor className={`w-5 h-5 ${fullscreenActive ? 'text-emerald-400' : 'text-gray-500'}`} />
                    <div>
                      <p className="text-sm font-medium">Fullscreen Mode</p>
                      <p className="text-xs text-gray-500">{fullscreenActive ? 'Fullscreen is active' : 'Click to enter fullscreen'}</p>
                    </div>
                  </div>
                  {fullscreenActive ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Button size="sm" onClick={handleEnterFullscreen}>
                      <Monitor className="w-3.5 h-3.5 mr-1" /> Enter Fullscreen
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { setWizardStep(0); navigate('/student/exams'); }}>
                  Cancel
                </Button>
                <Button onClick={handleStartExam} disabled={!screenShared || !fullscreenActive}>
                  <Play className="w-4 h-4 mr-1.5" /> Start Exam
                </Button>
              </div>
            </>
          )}
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
        <div className="px-4 py-2 flex items-center gap-2 text-sm bg-red-500/20 text-red-400 animate-pulse">
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

          {recordingActive && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-red-500/10 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
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
                    {(Array.isArray(currentQuestion.options) ? currentQuestion.options : typeof currentQuestion.options === 'string' ? JSON.parse(currentQuestion.options) : []).map((opt: string, i: number) => {
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

import { useRef, useEffect, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

interface FaceDetectionResult {
  faceDetectedRef: React.MutableRefObject<boolean>;
  hasCamera: boolean;
  cameraError: string | null;
  cameraReady: boolean;
}

export function useFaceDetection(enabled: boolean): FaceDetectionResult {
  const streamRef = useRef<MediaStream | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animFrameRef = useRef<number>(0);
  const faceDetectedRef = useRef(true);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const initializedRef = useRef(false);

  const startCamera = async (signal: { cancelled: boolean }) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
      audio: false,
    });
    if (signal.cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

    streamRef.current = stream;
    setHasCamera(true);
    setCameraError(null);

    const videoEl = document.createElement('video');
    videoEl.width = 320; videoEl.height = 240;
    videoEl.style.display = 'none'; videoEl.muted = true; videoEl.playsInline = true;
    document.body.appendChild(videoEl);
    videoEl.srcObject = stream;
    videoElRef.current = videoEl;
    await videoEl.play();

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm/'
    );
    if (signal.cancelled) return;

    faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });

    setCameraReady(true);

    const detectLoop = () => {
      if (signal.cancelled || !faceLandmarkerRef.current || !videoEl) return;
      try {
        const result = faceLandmarkerRef.current.detectForVideo(videoEl, performance.now());
        faceDetectedRef.current = result.faceLandmarks && result.faceLandmarks.length > 0;
      } catch {
        faceDetectedRef.current = false;
      }
      animFrameRef.current = requestAnimationFrame(detectLoop);
    };

    detectLoop();

    // Handle camera disconnection — try to reacquire
    const reacquireCamera = async () => {
      faceDetectedRef.current = false;
      setCameraReady(false);
      for (let attempt = 0; attempt < 3; attempt++) {
        if (signal.cancelled) return;
        try {
          await new Promise(r => setTimeout(r, 2000));
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
            audio: false,
          });
          if (signal.cancelled) { newStream.getTracks().forEach(t => t.stop()); return; }
          stream.getTracks().forEach(t => t.stop());
          streamRef.current = newStream;
          videoEl.srcObject = newStream;
          await videoEl.play();
          faceDetectedRef.current = true;
          setCameraReady(true);
          newStream.getVideoTracks()[0]?.addEventListener('ended', reacquireCamera);
          return;
        } catch {
          // retry
        }
      }
      if (!signal.cancelled) {
        setHasCamera(false);
        setCameraError('Camera disconnected');
        faceDetectedRef.current = true;
      }
    };
    stream.getVideoTracks()[0]?.addEventListener('ended', reacquireCamera);
  };

  useEffect(() => {
    if (!enabled || initializedRef.current) return;
    initializedRef.current = true;

    const signal = { cancelled: false };

    const init = async () => {
      try {
        await startCamera(signal);
      } catch (err: any) {
        if (signal.cancelled) return;
        if (err.name === 'NotAllowedError') setCameraError('Camera access denied.');
        else if (err.name === 'NotFoundError') setCameraError('No camera found.');
        else setCameraError('Camera unavailable');
        setHasCamera(false);
        faceDetectedRef.current = true;
      }
    };

    init();

    return () => {
      signal.cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (videoElRef.current && videoElRef.current.parentNode) {
        videoElRef.current.parentNode.removeChild(videoElRef.current);
      }
      faceLandmarkerRef.current?.close();
      faceLandmarkerRef.current = null;
      setCameraReady(false);
      initializedRef.current = false;
    };
  }, [enabled]);

  return { faceDetectedRef, hasCamera, cameraError, cameraReady };
}

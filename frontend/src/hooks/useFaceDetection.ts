import { useRef, useEffect, useState, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

interface FaceDetectionResult {
  faceDetectedRef: React.MutableRefObject<boolean>;
  hasCamera: boolean;
  cameraError: string | null;
  cameraReady: boolean;
  cameraStarting: boolean;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  enableCamera: () => Promise<void>;
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
  const [cameraStarting, setCameraStarting] = useState(false);
  const startingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoElRef.current) {
      if (videoElRef.current.parentNode) {
        videoElRef.current.parentNode.removeChild(videoElRef.current);
      }
      videoElRef.current = null;
    }
    faceLandmarkerRef.current?.close();
    faceLandmarkerRef.current = null;
    setHasCamera(false);
    setCameraReady(false);
    setCameraError(null);
  }, []);

  const enableCamera = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setCameraStarting(true);
    setCameraError(null);
    setHasCamera(false);
    setCameraReady(false);

    try {
      console.log('Requesting camera permission...');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Camera API is not available in this browser. ' +
          'Make sure you are accessing the app via https:// or http://localhost. ' +
          'The current origin "' + window.location.origin + '" is not a secure context.'
        );
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      console.log('Camera stream acquired');

      streamRef.current = stream;
      setHasCamera(true);

      const videoEl = document.createElement('video');
      videoEl.width = 320;
      videoEl.height = 240;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.style.display = 'none';
      videoEl.srcObject = stream;
      videoElRef.current = videoEl;

      await videoEl.play();
      console.log('Camera video element playing');

      setCameraReady(true);
      setCameraStarting(false);
      startingRef.current = false;

      // Load FaceLandmarker in background (fail-open)
      initFaceLandmarker();

      // Handle camera disconnection
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener('ended', () => {
          console.warn('Camera track ended — attempting re-acquire');
          reacquireCamera();
        });
      }
    } catch (err: any) {
      console.error('Camera error — name:', err.name, 'message:', err.message, 'error:', err);
      startingRef.current = false;
      setCameraStarting(false);

      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera access in your browser settings and click "Enable Camera" again.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found. Please connect a camera and try again.');
      } else {
        setCameraError(`Camera unavailable (${err.name}: ${err.message})`);
      }
      return;
    }
  }, []);

  const reacquireCamera = useCallback(async () => {
    setCameraReady(false);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await new Promise(r => setTimeout(r, 2000));
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
          audio: false,
        });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }
        streamRef.current = newStream;
        if (videoElRef.current) {
          videoElRef.current.srcObject = newStream;
          await videoElRef.current.play();
        }
        faceDetectedRef.current = true;
        setCameraReady(true);
        newStream.getVideoTracks()[0]?.addEventListener('ended', reacquireCamera);
        return;
      } catch (err) {
        console.warn('Camera re-acquire attempt', attempt + 1, 'failed:', err);
      }
    }
    setHasCamera(false);
    setCameraError('Camera disconnected');
    faceDetectedRef.current = true;
  }, []);

  const initFaceLandmarker = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks('/wasm/');
      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/wasm/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });

      const videoEl = videoElRef.current;
      if (!videoEl) return;

      const detectLoop = () => {
        if (!faceLandmarkerRef.current || !videoEl) return;
        try {
          const result = faceLandmarkerRef.current.detectForVideo(videoEl, performance.now());
          faceDetectedRef.current = result.faceLandmarks && result.faceLandmarks.length > 0;
        } catch {
          faceDetectedRef.current = false;
        }
        animFrameRef.current = requestAnimationFrame(detectLoop);
      };
      detectLoop();
    } catch (err) {
      console.warn('Face landmarker failed to load — face detection disabled', err);
      faceDetectedRef.current = true;
    }
  };

  // Cleanup on unmount or when enabled becomes false
  useEffect(() => {
    if (!enabled) {
      cleanup();
    }
    return () => {
      cleanup();
    };
  }, [enabled, cleanup]);

  return {
    faceDetectedRef,
    hasCamera,
    cameraError,
    cameraReady,
    cameraStarting,
    videoRef: videoElRef,
    streamRef,
    enableCamera,
  };
}

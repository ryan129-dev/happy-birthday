/// <reference types="vite/client" />
import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import './style.css';
import { preloadResource } from './utils/preload';

declare const __VISION_VERSION__: string;

const Scene = lazy(() => import('./components/Scene'));
import { HandState, GestureType } from './types';

// Detect if mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

const videoConstraints = {
  width: isMobile ? 480 : 640,
  height: isMobile ? 360 : 480,
  facingMode: "user"
};

const App: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [handState, setHandState] = useState<HandState>({
    gesture: GestureType.NONE,
    openness: 1.0,
    position: { x: 0, y: 0 }
  });
  const [cameraReady, setCameraReady] = useState(false);
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);

  // Start the camera independently while the hand-tracking resources load.
  useEffect(() => {
    let cancelled = false;
    let landmarker: HandLandmarker | null = null;
    const controller = new AbortController();
    setModelStatus('loading');
    performance.clearMarks('hand-tracking-start');
    performance.clearMarks('hand-tracking-ready');
    performance.clearMeasures('hand-tracking-init');
    performance.mark('hand-tracking-start');

    const initMediaPipe = async () => {
      try {
        const visionModule = import('@mediapipe/tasks-vision').then(async module => {
          const vision = await module.FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mediapipe/wasm-${__VISION_VERSION__}`);
          if (!cancelled) {
            preloadResource(vision.wasmLoaderPath, 'script');
            preloadResource(vision.wasmBinaryPath, 'fetch');
          }
          return { HandLandmarker: module.HandLandmarker, vision };
        });
        const model = fetch(
          `${import.meta.env.BASE_URL}mediapipe/hand_landmarker-v1.task`,
          { signal: controller.signal }
        ).then(response => {
          if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
          return response.arrayBuffer();
        });
        const [{ HandLandmarker, vision }, modelBuffer] = await Promise.all([visionModule, model]);
        if (cancelled) return;
        const createLandmarker = (delegate: 'GPU' | 'CPU') => HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetBuffer: new Uint8Array(modelBuffer), delegate },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        try {
          landmarker = await createLandmarker('GPU');
        } catch (error) {
          if (cancelled) return;
          console.warn('GPU hand tracking unavailable, trying CPU:', error);
          landmarker = await createLandmarker('CPU');
        }
        if (cancelled) {
          landmarker.close();
          return;
        }
        handLandmarkerRef.current = landmarker;
        performance.mark('hand-tracking-ready');
        performance.measure('hand-tracking-init', 'hand-tracking-start', 'hand-tracking-ready');
        setModelStatus('ready');
      } catch (error) {
        if (!cancelled) {
          cancelled = true;
          controller.abort();
          console.error('Error loading hand tracking:', error);
          setModelStatus('error');
        }
      }
    };
    void initMediaPipe();
    return () => {
      cancelled = true;
      controller.abort();
      if (handLandmarkerRef.current === landmarker) handLandmarkerRef.current = null;
      landmarker?.close();
    };
  }, [retryCount]);

  useEffect(() => {
    if (modelStatus !== 'ready' || !cameraReady) return;
    let animationFrameId: number;
    let lastVideoTime = -1;
    let firstInference = true;
    const detect = () => {
      const video = webcamRef.current?.video;
      if (handLandmarkerRef.current && video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        try {
          const results = handLandmarkerRef.current.detectForVideo(video, performance.now());
          if (firstInference) {
            firstInference = false;
            performance.clearMeasures('hand-tracking-first-inference');
            performance.measure('hand-tracking-first-inference', 'hand-tracking-start');
          }
          if (results.landmarks?.length) analyzeGesture(results.landmarks[0]);
          else setHandState(prev => prev.gesture === GestureType.NONE ? prev : { ...prev, gesture: GestureType.NONE });
        } catch (error) {
          console.error('Hand tracking failed:', error);
          setModelStatus('error');
          return;
        }
      }
      animationFrameId = requestAnimationFrame(detect);
    };
    detect();
    return () => cancelAnimationFrame(animationFrameId);
  }, [modelStatus, cameraReady]);

  const analyzeGesture = (landmarks: any[]) => {
    // MediaPipe Hand Landmarks:
    // 0: Wrist
    // 4: Thumb Tip
    // 8: Index Tip
    // 12: Middle Tip
    // 16: Ring Tip
    // 20: Pinky Tip
    
    // Simple logic: Is finger tip above the PIP joint (knuckle)?
    // Note: Y coordinates are normalized 0 (top) to 1 (bottom), so smaller Y is higher.
    
    const isFingerUp = (tipIdx: number, pipIdx: number) => {
      return landmarks[tipIdx].y < landmarks[pipIdx].y;
    };

    const indexUp = isFingerUp(8, 6);
    const middleUp = isFingerUp(12, 10);
    const ringUp = isFingerUp(16, 14);
    const pinkyUp = isFingerUp(20, 18);
    const thumbUp = landmarks[4].x < landmarks[3].x; // Crude thumb check (for right hand usually)

    let fingersCount = 0;
    if (indexUp) fingersCount++;
    if (middleUp) fingersCount++;
    if (ringUp) fingersCount++;
    if (pinkyUp) fingersCount++;
    // Thumb is tricky, keeping it simple for 1-4 count

    let gesture = GestureType.NONE;
    if (fingersCount === 1) gesture = GestureType.ONE;
    else if (fingersCount === 2) gesture = GestureType.TWO;
    else if (fingersCount === 3) gesture = GestureType.THREE;
    else if (fingersCount === 4) gesture = GestureType.FOUR;
    
    // Calculate openness (distance between thumb and index)
    // Used for expansion/contraction effect when no specific text gesture is active
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) + 
      Math.pow(thumbTip.y - indexTip.y, 2)
    );
    
    // Map distance (approx 0.05 to 0.3) to an openness factor (0 to 1)
    const openness = Math.min(Math.max((distance - 0.05) * 4, 0), 1.5);

    // Map wrist position to screen space (-1 to 1)
    const wrist = landmarks[0];
    const xPos = (wrist.x - 0.5) * -2; // Flip X for mirror effect
    const yPos = (wrist.y - 0.5) * -2;

    setHandState({
      gesture,
      openness,
      position: { x: xPos, y: yPos }
    });
  };

  // Handle camera errors
  const handleUserMediaError = (error: string | DOMException) => {
    console.error("Camera error:", error);
    if (isWeChat) {
      setCameraError("请在微信中允许使用摄像头权限");
    } else {
      setCameraError("无法访问摄像头，请检查权限设置");
    }
  };

  return (
    <div className="app">
      <div className="scene">
        <Suspense fallback={null}>
          <Scene handState={handState} isMobile={isMobile} />
        </Suspense>
      </div>

      <div className={`instructions ${isMobile ? 'mobile' : ''}`}>
        <h1>Particle Gestures</h1>
        <div className="gesture-list">
          <p>👆 1 Finger: <strong>生</strong></p>
          <p>✌️ 2 Fingers: <strong>日</strong></p>
          <p>🤟 3 Fingers: <strong>快</strong></p>
          <p>🖖 4 Fingers: <strong>乐</strong></p>
          {!isMobile && <p>✊/🖐️ Open/Close: <strong>Expand/Contract</strong></p>}
        </div>
        <div className="status" role="status">
          {modelStatus === 'loading' && '手势识别加载中…'}
          {modelStatus === 'ready' && `Current: ${handState.gesture !== GestureType.NONE ? `State ${handState.gesture}` : 'Free Mode'}`}
          {modelStatus === 'error' && <span>手势识别加载失败 <button className="retry" onClick={() => setRetryCount(count => count + 1)}>重试</button></span>}
        </div>
      </div>

      <div className={`camera ${isMobile ? 'mobile' : ''}`}>
        <Webcam
          ref={webcamRef}
          audio={false}
          width={isMobile ? 128 : 192}
          height={isMobile ? 96 : 144}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          onUserMedia={() => { setCameraReady(true); setCameraError(null); }}
          onUserMediaError={handleUserMediaError}
          className="camera-video"
        />
        {!cameraReady && !cameraError && <div className="camera-message">正在打开摄像头…</div>}
        {cameraError && <div className="camera-message camera-error">{cameraError}</div>}
      </div>
    </div>
  );
};

export default App;

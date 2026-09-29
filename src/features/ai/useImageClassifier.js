import { useCallback, useEffect, useRef, useState } from 'react';
import { loadTmImage } from './scriptLoader.js';
import { getCameraErrorMessage } from './cameraError.js';

export function useImageClassifier(onPrediction) {
  const [status, setStatus] = useState('카메라 시작 전');
  const [isBusy, setIsBusy] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [labels, setLabels] = useState([]);
  const [cameraError, setCameraError] = useState('');
  const webcamRef = useRef(null);
  const sessionRef = useRef(0);
  const mountRef = useRef(null);
  const activeRef = useRef(false);
  const callbackRef = useRef(onPrediction);
  useEffect(() => { callbackRef.current = onPrediction; }, [onPrediction]);

  const stop = useCallback(async () => {
    sessionRef.current += 1;
    activeRef.current = false;
    setIsRunning(false);
    setIsBusy(false);
    const webcam = webcamRef.current;
    webcamRef.current = null;
    try { webcam?.stop(); } catch { /* camera may already be stopped */ }
    mountRef.current?.replaceChildren();
    setStatus('카메라가 꺼졌습니다.');
  }, []);

  const start = useCallback(async (modelUrl, canvasMount) => {
    if (activeRef.current) return;
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    mountRef.current = canvasMount;
    setIsBusy(true);
    setCameraError('');
    setStatus('AI 모델과 카메라를 준비하고 있습니다.');
    let webcam;
    try {
      const tmImage = await loadTmImage();
      if (sessionRef.current !== session) return;
      const model = await tmImage.load(`${modelUrl}model.json`, `${modelUrl}metadata.json`);
      if (sessionRef.current !== session) return;
      const nextLabels = model.getClassLabels();
      setLabels(nextLabels);
      webcam = new tmImage.Webcam(480, 360, true);
      webcamRef.current = webcam;
      await webcam.setup();
      if (sessionRef.current !== session) {
        webcam.stop();
        if (webcamRef.current === webcam) webcamRef.current = null;
        return;
      }
      await webcam.play();
      if (sessionRef.current !== session) {
        webcam.stop();
        if (webcamRef.current === webcam) webcamRef.current = null;
        return;
      }
      if (!canvasMount?.isConnected) throw new Error('카메라 화면을 찾지 못했습니다. 화면을 다시 시작해 주세요.');
      canvasMount.replaceChildren(webcam.canvas);
      webcam.canvas.dataset.postureWebcam = 'true';
      activeRef.current = true;
      setIsRunning(true);
      setStatus('자세를 비춰 주세요. 안정된 판정만 전송합니다.');
      setIsBusy(false);
      let lastInference = 0;
      const loop = async () => {
        if (!activeRef.current || sessionRef.current !== session || webcamRef.current !== webcam) return;
        webcam.update();
        if (Date.now() - lastInference >= 200) {
          lastInference = Date.now();
          try {
            const predictions = await model.predict(webcam.canvas);
            if (!activeRef.current || sessionRef.current !== session || webcamRef.current !== webcam) return;
            await callbackRef.current(predictions, nextLabels);
          } catch (error) {
            if (activeRef.current && sessionRef.current === session) setStatus(error.message || '이미지를 분석하지 못했습니다.');
          }
        }
        if (activeRef.current && sessionRef.current === session && webcamRef.current === webcam) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } catch (error) {
      if (sessionRef.current !== session) {
        try { webcam?.stop(); } catch { /* canceled session */ }
        return;
      }
      activeRef.current = false;
      setIsRunning(false);
      try { webcam?.stop(); } catch { /* nothing to stop */ }
      if (webcamRef.current === webcam) webcamRef.current = null;
      const message = getCameraErrorMessage(error);
      setCameraError(message);
      setStatus(message);
      setIsBusy(false);
      throw error;
    }
  }, []);

  useEffect(() => () => {
    sessionRef.current += 1;
    activeRef.current = false;
    try { webcamRef.current?.stop(); } catch { /* unmount cleanup */ }
    webcamRef.current = null;
    mountRef.current?.replaceChildren();
  }, []);

  return { cameraError, isBusy, isRunning, labels, start, status, stop };
}

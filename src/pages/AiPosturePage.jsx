import { Camera, Link, Play, SlidersHorizontal, Square, Unplug, Usb, Waves } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SerialBadge } from '../components/SerialBadge.jsx';
import { DEFAULT_CONFIDENCE, normalizeModelUrl, parseConfidence } from '../features/ai/aiSettings.js';
import { loadModelLabelsFromMetadata, validatePostureLabels } from '../features/ai/modelMetadata.js';
import { evaluatePrediction, getBestPrediction, getStableCandidate } from '../features/ai/predictionPolicy.js';
import { useImageClassifier } from '../features/ai/useImageClassifier.js';

const MODEL_REQUEST_TIMEOUT_MS = 10000;
const STABILITY_MS = 600;

export function AiPosturePage({ serial }) {
  const [modelInput, setModelInput] = useState('');
  const [modelUrl, setModelUrl] = useState('');
  const [verifiedLabels, setVerifiedLabels] = useState([]);
  const [modelStatus, setModelStatus] = useState('모델 준비 전');
  const [isVerifying, setIsVerifying] = useState(false);
  const [confidenceInput, setConfidenceInput] = useState(String(DEFAULT_CONFIDENCE));
  const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE);
  const [confidenceStatus, setConfidenceStatus] = useState(`현재 기준값: ${DEFAULT_CONFIDENCE}%`);
  const [currentClass, setCurrentClass] = useState('-');
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [lastSentState, setLastSentState] = useState({ session: 0, className: '-' });
  const [sendNotice, setSendNotice] = useState('USB 연결 후 자세 판정을 시작할 수 있습니다.');
  const modelRequestRef = useRef(null);
  const videoHostRef = useRef(null);
  const candidateRef = useRef(null);
  const lastSentRef = useRef({ session: 0, className: '-', sentAt: 0 });
  const sendingRef = useRef(false);
  const { connectionSession, isConnected, writeMessage } = serial;

  const handlePrediction = useCallback(async (results) => {
    const prediction = getBestPrediction(results);
    if (!prediction) return;
    setCurrentClass(prediction.className);
    setCurrentConfidence(prediction.confidence);
    const normalizedClass = prediction.className.trim().toLowerCase();
    if (normalizedClass !== 'good' && normalizedClass !== 'bad') {
      candidateRef.current = null;
      setSendNotice(`'${prediction.className}' class는 전송 대상이 아닙니다.`);
      return;
    }
    if (prediction.probability < confidence) {
      candidateRef.current = null;
      setSendNotice(`신뢰도 ${prediction.probability.toFixed(1)}%가 기준 ${confidence}%보다 낮아 전송을 보류했습니다.`);
      return;
    }
    const now = Date.now();
    const nextCandidate = getStableCandidate(candidateRef.current, normalizedClass, now, STABILITY_MS);
    candidateRef.current = nextCandidate;
    if (!nextCandidate.stable) {
      setSendNotice(`${normalizedClass} 판정을 확인하고 있습니다. ${STABILITY_MS / 1000}초간 유지되어야 전송합니다.`);
      return;
    }
    if (!isConnected) {
      setSendNotice(`${normalizedClass} 판정이 안정되었습니다. USB 연결 후 전송할 수 있습니다.`);
      return;
    }
    if (sendingRef.current) return;
    if (lastSentRef.current.session !== connectionSession) {
      lastSentRef.current = { session: connectionSession, className: '-', sentAt: 0 };
    }
    const decision = evaluatePrediction({
      className: normalizedClass,
      probability: prediction.probability,
      threshold: confidence,
      stableForMs: now - nextCandidate.since,
      lastSentClass: lastSentRef.current.className,
      lastSentAt: lastSentRef.current.sentAt,
      now,
    });
    if (!decision.shouldSend) {
      if (decision.reason === 'below-threshold') {
        setSendNotice(`신뢰도 ${prediction.probability.toFixed(1)}%가 기준 ${confidence}%보다 낮아 전송을 보류했습니다.`);
      } else if (decision.reason === 'cooldown') {
        setSendNotice('같은 명령을 반복 전송하기 전에 잠시 기다리고 있습니다.');
      }
      return;
    }
    try {
      sendingRef.current = true;
      await writeMessage(`${decision.command}\n`);
      lastSentRef.current = { session: connectionSession, className: decision.command, sentAt: now };
      setLastSentState({ session: connectionSession, className: decision.command });
      setSendNotice(`${decision.command} 전송 완료`);
    } catch (error) {
      setSendNotice(error.message || '전송에 실패했습니다. USB 연결을 확인해 주세요.');
    } finally {
      sendingRef.current = false;
    }
  }, [confidence, connectionSession, isConnected, writeMessage]);

  const classifier = useImageClassifier(handlePrediction);
  useEffect(() => () => modelRequestRef.current?.abort(), []);

  const handleModelInputChange = (event) => {
    const value = event.target.value;
    setModelInput(value);
    if (value !== modelUrl) {
      modelRequestRef.current?.abort();
      if (classifier.isRunning) void classifier.stop();
      candidateRef.current = null;
      setCurrentClass('-');
      setCurrentConfidence(0);
      setSendNotice('모델이 바뀌어 이전 판정을 지웠습니다.');
      setModelUrl('');
      setVerifiedLabels([]);
      setModelStatus('모델 준비 전');
      candidateRef.current = null;
    }
  };

  const handleModelCheck = async () => {
    let normalizedUrl;
    try { normalizedUrl = normalizeModelUrl(modelInput); }
    catch (error) { setModelStatus(error.message); return; }
    modelRequestRef.current?.abort();
    const controller = new AbortController();
    let timedOut = false;
    modelRequestRef.current = controller;
    setIsVerifying(true);
    setModelStatus('모델 class 확인 중');
    setVerifiedLabels([]);
    const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, MODEL_REQUEST_TIMEOUT_MS);
    try {
      const labels = await loadModelLabelsFromMetadata(normalizedUrl, { signal: controller.signal });
      validatePostureLabels(labels);
      if (modelRequestRef.current !== controller) return;
      setModelUrl(normalizedUrl);
      setModelInput(normalizedUrl);
      setVerifiedLabels(labels);
      setModelStatus('good / bad class 확인 완료');
    } catch (error) {
      if (error.name === 'AbortError' && !timedOut) return;
      setModelStatus(timedOut ? '확인 시간이 초과되었습니다. 인터넷 연결과 모델 주소를 확인해 주세요.' : error.message || '모델을 확인하지 못했습니다.');
    } finally {
      window.clearTimeout(timer);
      if (modelRequestRef.current === controller) {
        modelRequestRef.current = null;
        setIsVerifying(false);
      }
    }
  };

  const applyConfidence = () => {
    try {
      const next = parseConfidence(confidenceInput);
      setConfidence(next);
      setConfidenceStatus(`현재 기준값: ${next}%`);
    } catch (error) { setConfidenceStatus(error.message); }
  };

  const handleCamera = async () => {
    if (classifier.isRunning) {
      await classifier.stop();
      candidateRef.current = null;
      setCurrentClass('-');
      setCurrentConfidence(0);
      setSendNotice('카메라가 정지되어 현재 판정을 지웠습니다.');
      return;
    }
    if (!modelUrl) { setModelStatus('먼저 모델 주소와 class를 확인해 주세요.'); return; }
    candidateRef.current = null;
    setCurrentClass('-');
    setCurrentConfidence(0);
    setSendNotice('카메라를 시작하고 있습니다.');
    try { await classifier.start(modelUrl, videoHostRef.current); }
    catch { /* status is shown by classifier */ }
  };

  const shownLabels = classifier.labels.length ? classifier.labels : verifiedLabels;
  const controlsDisabled = classifier.isRunning || classifier.isBusy || isVerifying;
  return (
    <section className="page ai-page" aria-labelledby="posture-title">
      <div className="ai-header">
        <div><h1 id="posture-title">AI 자세 알리미</h1><p>카메라로 자세를 분류하고 good 또는 bad를 micro:bit에 알려요.</p></div>
        <SerialBadge serial={serial} />
      </div>
      <div className="fan-layout posture-layout">
        <section className="control-panel" aria-labelledby="model-title">
          <div className="panel-heading"><Link size={24} /><div><h2 id="model-title">티처블 머신 이미지 모델</h2><p role="status" aria-live="polite">{modelStatus}</p></div></div>
          <label htmlFor="model-url">모델 폴더 주소</label>
          <div className="input-row">
            <input id="model-url" type="url" value={modelInput} onChange={handleModelInputChange} placeholder="https://teachablemachine.withgoogle.com/models/.../" disabled={controlsDisabled} />
            <button className={`secondary-action ${!modelUrl ? 'gi-pulse' : ''}`} type="button" onClick={handleModelCheck} disabled={controlsDisabled || !modelInput.trim()}><span>{isVerifying ? '확인 중...' : '모델 확인'}</span></button>
          </div>
          <div className="label-list" aria-label="모델 class 목록">{shownLabels.length ? shownLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>) : <span>class 확인 전</span>}</div>
          <p className="confidence-note">Teachable Machine에서 class 이름을 정확히 good과 bad로 지정해 주세요. 빈 화면이나 다른 사람도 별도 class로 학습하면 오판을 줄일 수 있어요.</p>
        </section>

        <section className="control-panel" aria-labelledby="confidence-title">
          <div className="panel-heading"><SlidersHorizontal size={24} /><div><h2 id="confidence-title">신뢰도 기준</h2><p role="status" aria-live="polite">{confidenceStatus}</p></div></div>
          <label htmlFor="confidence-value">전송 기준(0–100%)</label>
          <div className="input-row compact-row"><input id="confidence-value" type="number" min="0" max="100" step="1" value={confidenceInput} onChange={(event) => setConfidenceInput(event.target.value)} /><button className="secondary-action" type="button" onClick={applyConfidence}>적용</button></div>
          <input className="range-control" type="range" min="0" max="100" step="1" value={confidenceInput || '0'} onChange={(event) => setConfidenceInput(event.target.value)} aria-label="신뢰도 기준 슬라이더" />
          <p className="confidence-note">기본값은 90%입니다. 같은 판정이 0.6초 이어져야 전송되며, 같은 명령은 1.5초 안에 반복하지 않습니다.</p>
        </section>

        <section className="control-panel" aria-labelledby="usb-title">
          <div className="panel-heading"><Usb size={24} /><div><h2 id="usb-title">micro:bit USB 연결</h2><p role="status" aria-live="polite">{serial.serialMessage}</p></div></div>
          <div className="button-pair">
            <button className={`primary-action ${!serial.isConnected ? 'gi-pulse' : ''}`} type="button" onClick={serial.connect} disabled={serial.isBusy || serial.isConnected}><span>{serial.serialStatus === 'connecting' ? '연결 중...' : 'USB 연결'}</span></button>
            <button className="danger-action" type="button" onClick={serial.disconnect} disabled={serial.isBusy || !serial.isConnected}><Unplug size={18} /><span>연결 해제</span></button>
          </div>
        </section>

        <section className="control-panel runner-panel" aria-labelledby="start-title">
          <div className="panel-heading"><Camera size={24} /><div><h2 id="start-title">웹캠 자세 인식</h2><p role="status" aria-live="polite">{classifier.status}</p></div></div>
          <button className={`start-button ${modelUrl && !classifier.isRunning ? 'gi-pulse' : ''}`} type="button" onClick={handleCamera} disabled={classifier.isBusy || isVerifying || (!classifier.isRunning && !modelUrl)}>
            {classifier.isRunning ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            <span>{classifier.isRunning ? '카메라 정지' : classifier.isBusy ? '준비 중...' : '카메라 시작'}</span>
          </button>
          {classifier.cameraError && <p className="error-note" role="alert">{classifier.cameraError}</p>}
        </section>

        <section className="camera-panel" aria-label="웹캠 미리보기">
          <div className="camera-frame">
            {!classifier.isRunning && <div className="camera-placeholder"><Camera size={44} /><span>카메라 화면이 여기에 표시됩니다</span><small>얼굴이나 몸이 화면 안에 잘 보이도록 비춰 주세요.</small></div>}
            <div className="webcam-canvas-host" ref={videoHostRef} data-posture-webcam />
          </div>
          <div className="inline-status" role="status" aria-live="polite">{sendNotice}</div>
        </section>

        <section className="status-panel" aria-labelledby="class-title">
          <div className="panel-heading"><Waves size={24} /><div><h2 id="class-title">AI 판정 결과</h2><p>현재 신뢰도 {currentConfidence}%</p></div></div>
          <div className="class-readouts" role="status" aria-live="polite">
            <div><span>최근 전송</span><strong>{lastSentState.session === connectionSession ? lastSentState.className : '-'}</strong></div>
            <div><span>현재 class</span><strong>{currentClass}</strong></div>
          </div>
        </section>
      </div>
    </section>
  );
}

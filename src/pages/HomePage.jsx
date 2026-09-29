import { Cable, Check, Send, Unplug, Usb } from 'lucide-react';
import { useState } from 'react';
import { DeviceIllustration } from '../components/DeviceIllustration.jsx';
import { SerialBadge } from '../components/SerialBadge.jsx';

export function HomePage({ serial }) {
  const [sendStatus, setSendStatus] = useState('먼저 USB를 연결해 전송을 확인해 보세요.');
  const sendCommand = async (command) => {
    try { await serial.writeMessage(`${command}\n`); setSendStatus(`${command} 전송 완료`); }
    catch (error) { setSendStatus(error.message); }
  };
  return (
    <section className="page home-page" aria-labelledby="home-title">
      <div className="intro-panel"><div><span className="eyebrow">MICRO:BIT · AI PROJECT 02</span><h1 id="home-title">AI가 자세를 보고<br />micro:bit에 알려줘요</h1><p>Teachable Machine 이미지 모델이 자세를 good 또는 bad로 분류하면 USB 시리얼로 전달합니다.</p></div><SerialBadge serial={serial} /></div>
      <div className="home-grid">
        <section className="tool-panel" aria-labelledby="connect-title">
          <div className="panel-heading"><Cable size={24} /><div><h2 id="connect-title">1. micro:bit 연결</h2><p role="status" aria-live="polite">{serial.serialMessage}</p></div></div>
          <div className="connection-actions"><button className={`primary-action ${!serial.isConnected ? 'gi-pulse' : ''}`} type="button" onClick={serial.connect} disabled={serial.isBusy || serial.isConnected}><Usb size={19} /><span>USB 연결</span></button><button className="danger-action full-width-action" type="button" onClick={serial.disconnect} disabled={serial.isBusy || !serial.isConnected}><Unplug size={19} /><span>연결 해제</span></button></div>
          <p className="connection-note">Chrome 또는 Edge에서 데이터 USB 케이블을 연결해 주세요.</p>
        </section>
        <section className="tool-panel" aria-labelledby="send-title">
          <div className="panel-heading"><Send size={24} /><div><h2 id="send-title">2. 명령 전송 연습</h2><p>보낸 값: {serial.lastOutbound.trim() || '-'}</p></div></div>
          <p className="protocol-note">AI 없이 버튼을 눌러 수신을 확인합니다. 전송값은 줄바꿈을 포함한 <code>good\n</code> 또는 <code>bad\n</code>입니다.</p>
          <div className="manual-command-row"><button className="command-good" type="button" onClick={() => sendCommand('good')} disabled={!serial.isConnected || serial.isSending}><Check size={20} />good 보내기</button><button className="command-bad" type="button" onClick={() => sendCommand('bad')} disabled={!serial.isConnected || serial.isSending}><Send size={18} />bad 보내기</button></div>
          <div className="inline-status" role="status" aria-live="polite">{sendStatus}</div>
        </section>
        <DeviceIllustration />
      </div>
      <div className="lesson-note"><strong>알아두기</strong><span>웹캠 화면 자체를 서버에 저장하지 않습니다. 분류 결과만 전송해요. micro:bit 수신 코드는 직접 만들어 주세요.</span></div>
    </section>
  );
}

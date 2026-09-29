import assert from 'node:assert/strict';
import test from 'node:test';
import { getCameraErrorMessage } from './cameraError.js';

test('브라우저와 Teachable Machine 문자열 권한 오류에 학생용 안내를 표시한다', () => {
  const denied = '카메라 권한이 차단되었습니다.';
  assert.match(getCameraErrorMessage(new DOMException('Permission denied', 'NotAllowedError')), /주소창의 카메라 권한/);
  assert.match(getCameraErrorMessage('Permission denied'), /주소창의 카메라 권한/);
  assert.match(getCameraErrorMessage('NotAllowedError: Permission denied'), /주소창의 카메라 권한/);
  assert.notEqual(getCameraErrorMessage('Permission denied'), denied);
});

test('카메라 장치를 찾지 못했을 때 연결 안내를 표시한다', () => {
  assert.match(getCameraErrorMessage(new DOMException('Requested device not found', 'NotFoundError')), /카메라를 찾지 못했습니다/);
});

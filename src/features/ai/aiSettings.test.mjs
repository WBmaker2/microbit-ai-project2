import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeModelUrl, parseConfidence } from './aiSettings.js';

test('HTTPS 모델 폴더 주소를 정규화한다', () => {
  assert.equal(normalizeModelUrl('https://teachablemachine.withgoogle.com/models/abc?x=1#y'), 'https://teachablemachine.withgoogle.com/models/abc/');
});
test('HTTPS가 아닌 주소를 거부한다', () => {
  assert.throws(() => normalizeModelUrl('http://example.com/model/'), /https/);
});
test('신뢰도는 0부터 100까지 정수만 받는다', () => {
  assert.equal(parseConfidence('90'), 90);
  assert.throws(() => parseConfidence('90.1'), /정수/);
});

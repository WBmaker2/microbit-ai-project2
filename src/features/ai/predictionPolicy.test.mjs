import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePrediction, getBestPrediction, getStableCandidate } from './predictionPolicy.js';

test('화면용 반올림 값과 정확한 확률을 함께 보존한다', () => {
  assert.deepEqual(
    getBestPrediction([{ className: 'good', probability: 0.2 }, { className: 'bad', probability: 0.895 }]),
    { className: 'bad', confidence: 90, probability: 89.5 },
  );
});

test('89.5%는 화면상 90%여도 90% 전송 기준을 통과하지 않는다', () => {
  const prediction = getBestPrediction([{ className: 'good', probability: 0.895 }]);
  assert.equal(prediction.confidence, 90);
  assert.equal(evaluatePrediction({ className: 'good', probability: prediction.probability, threshold: 90, stableForMs: 900 }).reason, 'below-threshold');
  assert.equal(evaluatePrediction({ className: 'good', probability: 90, threshold: 90, stableForMs: 900 }).shouldSend, true);
});

test('good/bad 외 class, 기준 미달, 안정화 전에는 전송하지 않는다', () => {
  assert.equal(evaluatePrediction({ className: 'other', probability: 100, threshold: 90, stableForMs: 900 }).reason, 'unsupported-class');
  assert.equal(evaluatePrediction({ className: 'good', probability: 89.4, threshold: 90, stableForMs: 900 }).reason, 'below-threshold');
  assert.equal(evaluatePrediction({ className: 'good', probability: 95, threshold: 90, stableForMs: 599 }).reason, 'stabilizing');
});

test('같은 명령 반복 간격을 적용한다', () => {
  assert.equal(evaluatePrediction({ className: 'good', probability: 95, threshold: 90, stableForMs: 900, lastSentClass: 'good', lastSentAt: 1000, now: 2000 }).reason, 'cooldown');
  assert.equal(evaluatePrediction({ className: 'good', probability: 95, threshold: 90, stableForMs: 900, lastSentClass: 'good', lastSentAt: 1000, now: 2600 }).shouldSend, true);
});

test('후보 class가 바뀌면 안정화 시간을 다시 센다', () => {
  assert.deepEqual(getStableCandidate({ className: 'good', since: 1 }, 'bad', 20), { className: 'bad', since: 20, stable: false });
  assert.equal(getStableCandidate({ className: 'good', since: 1 }, 'good', 700).stable, true);
});

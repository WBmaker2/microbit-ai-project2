import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModelLabelsFromMetadata, metadataUrlForModel, readLabelsFromMetadata, validatePostureLabels } from './features/ai/modelMetadata.js';

test('이미지 모델 metadata 주소와 labels를 읽는다', () => {
  assert.equal(metadataUrlForModel('https://example.com/model/'), 'https://example.com/model/metadata.json');
  assert.deepEqual(readLabelsFromMetadata({ labels: ['good', 'bad'] }), ['good', 'bad']);
});
test('good과 bad가 각각 하나씩 있는 모델만 통과한다', () => {
  assert.deepEqual(validatePostureLabels(['good', 'bad', 'other']), ['good', 'bad', 'other']);
  assert.throws(() => validatePostureLabels(['good', 'good']), /good과 bad/);
  assert.throws(() => validatePostureLabels(['good', 'other']), /bad/);
  assert.throws(() => validatePostureLabels(['good', 'bad', ' BAD ']), /bad/);
});
test('metadata fetch 오류를 보존한다', async () => {
  await assert.rejects(loadModelLabelsFromMetadata('https://example.com/model/', { fetchImpl: async () => ({ ok: false, status: 404 }) }), /404/);
});

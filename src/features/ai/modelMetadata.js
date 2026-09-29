export function metadataUrlForModel(modelBaseUrl) {
  return `${modelBaseUrl}metadata.json`;
}

export function readLabelsFromMetadata(metadata) {
  const candidateLabels = metadata?.labels ?? [];
  const labels = Array.isArray(candidateLabels)
    ? candidateLabels.map((label) => String(label).trim()).filter(Boolean)
    : [];

  if (!labels.length) throw new Error('metadata.json에서 class 목록을 찾지 못했습니다.');
  return labels;
}

export function validatePostureLabels(labels) {
  const normalized = labels.map((label) => String(label).trim().toLowerCase());
  const good = normalized.filter((label) => label === 'good').length;
  const bad = normalized.filter((label) => label === 'bad').length;
  const duplicates = new Set(normalized).size !== normalized.length;
  if (good !== 1 || bad !== 1 || duplicates) {
    const missing = [good !== 1 && 'good', bad !== 1 && 'bad'].filter(Boolean);
    const detail = missing.length ? `필요한 class: ${missing.join(', ')}.` : '중복된 class 이름이 있습니다.';
    throw new Error(`모델에 good과 bad class가 각각 하나씩 있어야 합니다. ${detail}`);
  }
  return labels;
}

export async function loadModelLabelsFromMetadata(modelBaseUrl, options = {}) {
  const { fetchImpl = fetch, signal } = options;
  const response = await fetchImpl(metadataUrlForModel(modelBaseUrl), { signal });
  if (!response.ok) throw new Error(`metadata.json을 불러오지 못했습니다. (${response.status})`);
  return readLabelsFromMetadata(await response.json());
}

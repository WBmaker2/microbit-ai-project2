const TFJS_SRC = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js';
const TM_IMAGE_SRC = 'https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.5/dist/teachablemachine-image.min.js';
const pendingScripts = new Map();

export function loadScript(src, globalName) {
  if (window[globalName]) return Promise.resolve();
  if (pendingScripts.has(globalName)) return pendingScripts.get(globalName);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(() => finish(new Error(`${globalName} 스크립트 로딩 시간이 초과되었습니다.`)), 15000);
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) { script.remove(); reject(error); } else resolve();
    };
    script.src = src;
    script.async = true;
    script.dataset.loader = globalName;
    script.onload = () => window[globalName] ? finish() : finish(new Error(`${globalName} 스크립트를 사용할 수 없습니다.`));
    script.onerror = () => finish(new Error(`${globalName} 스크립트를 불러오지 못했습니다.`));
    document.head.appendChild(script);
  }).finally(() => pendingScripts.delete(globalName));
  pendingScripts.set(globalName, promise);
  return promise;
}

export async function loadTmImage() {
  await loadScript(TFJS_SRC, 'tf');
  await loadScript(TM_IMAGE_SRC, 'tmImage');
  if (!window.tmImage) throw new Error('Teachable Machine 이미지 라이브러리를 사용할 수 없습니다.');
  return window.tmImage;
}

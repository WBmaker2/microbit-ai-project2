export const DEFAULT_COMMAND_COOLDOWN_MS = 1500;
export const DEFAULT_STABILITY_MS = 600;

export function getBestPrediction(predictions) {
  if (!Array.isArray(predictions) || !predictions.length) return null;
  const best = predictions.reduce((winner, prediction) => (
    Number(prediction.probability) > winner.probability
      ? { className: prediction.className, probability: Number(prediction.probability) }
      : winner
  ), { className: '', probability: -Infinity });
  if (!best.className || !Number.isFinite(best.probability)) return null;
  return {
    className: best.className,
    confidence: Math.round(best.probability * 100),
    probability: best.probability * 100,
  };
}

export function evaluatePrediction({ className, probability, threshold, stableForMs = 0,
  stabilityMs = DEFAULT_STABILITY_MS, lastSentClass = '-', lastSentAt = 0,
  now = Date.now(), cooldownMs = DEFAULT_COMMAND_COOLDOWN_MS }) {
  const command = String(className ?? '').trim().toLowerCase();
  if (command !== 'good' && command !== 'bad') return { shouldSend: false, reason: 'unsupported-class' };
  if (!Number.isFinite(probability) || probability < threshold) return { shouldSend: false, reason: 'below-threshold' };
  if (stableForMs < stabilityMs) return { shouldSend: false, reason: 'stabilizing' };
  if (command === lastSentClass && now - lastSentAt < cooldownMs) return { shouldSend: false, reason: 'cooldown' };
  return { shouldSend: true, reason: 'ready', command };
}

export function getStableCandidate(candidate, current, now, stabilityMs = DEFAULT_STABILITY_MS) {
  if (!candidate || candidate.className !== current) return { className: current, since: now, stable: false };
  return { ...candidate, stable: now - candidate.since >= stabilityMs };
}

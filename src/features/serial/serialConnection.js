export function isPortOpen(port) {
  return Boolean(port?.readable || port?.writable);
}

export function isAlreadyOpenError(error) {
  return /already open/i.test(error?.message || '');
}

export function isAlreadyClosedError(error) {
  return /not open|already closed|closed/i.test(error?.message || '');
}

export function normalizeSerialMessage(value) {
  const command = String(value ?? '').trim().replace(/\n+$/, '').toLowerCase();
  if (command !== 'good' && command !== 'bad') {
    throw new Error('good 또는 bad만 전송할 수 있습니다.');
  }
  return `${command}\n`;
}

export async function openPortIfNeeded(port, options) {
  if (isPortOpen(port)) {
    return { alreadyOpen: true, openedNow: false };
  }

  try {
    await port.open(options);
    return { alreadyOpen: false, openedNow: true };
  } catch (error) {
    if (isAlreadyOpenError(error)) {
      return { alreadyOpen: true, openedNow: false };
    }

    throw error;
  }
}

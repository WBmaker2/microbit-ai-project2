import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAlreadyOpenError,
  isPortOpen,
  normalizeSerialMessage,
  openPortIfNeeded,
} from './features/serial/serialConnection.js';

test('isPortOpen detects a port with readable or writable streams', () => {
  assert.equal(isPortOpen({ writable: {} }), true);
  assert.equal(isPortOpen({ readable: {} }), true);
  assert.equal(isPortOpen({}), false);
  assert.equal(isPortOpen(null), false);
});

test('openPortIfNeeded opens a closed port once', async () => {
  let openCount = 0;
  const port = {
    async open(options) {
      openCount += 1;
      assert.deepEqual(options, { baudRate: 115200 });
      this.writable = {};
    },
  };

  const result = await openPortIfNeeded(port, { baudRate: 115200 });

  assert.deepEqual(result, { alreadyOpen: false, openedNow: true });
  assert.equal(openCount, 1);
});

test('openPortIfNeeded reuses a port that is already open', async () => {
  let openCount = 0;
  const port = {
    writable: {},
    async open() {
      openCount += 1;
    },
  };

  const result = await openPortIfNeeded(port, { baudRate: 115200 });

  assert.deepEqual(result, { alreadyOpen: true, openedNow: false });
  assert.equal(openCount, 0);
});

test('openPortIfNeeded treats browser already-open errors as reusable ports', async () => {
  const port = {
    async open() {
      throw new DOMException("Failed to execute 'open' on 'SerialPort': The port is already open.", 'InvalidStateError');
    },
  };

  const result = await openPortIfNeeded(port, { baudRate: 115200 });

  assert.equal(isAlreadyOpenError(new Error("Failed to execute 'open' on 'SerialPort': The port is already open.")), true);
  assert.deepEqual(result, { alreadyOpen: true, openedNow: false });
});

test('openPortIfNeeded still throws unrelated open errors', async () => {
  const port = {
    async open() {
      throw new Error('USB permission denied');
    },
  };

  await assert.rejects(() => openPortIfNeeded(port, { baudRate: 115200 }), /USB permission denied/);
});

test('serial message is restricted to UTF-8 good/bad line commands', () => {
  assert.equal(normalizeSerialMessage(' good '), 'good\n');
  assert.equal(normalizeSerialMessage('bad\n'), 'bad\n');
  assert.throws(() => normalizeSerialMessage('on'), /good 또는 bad/);
  assert.throws(() => normalizeSerialMessage('good\nbad'), /good 또는 bad/);
  assert.throws(() => normalizeSerialMessage('   '), /good 또는 bad/);
});

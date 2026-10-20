import test from 'node:test';
import assert from 'node:assert/strict';
import { clockText, encodeWav, wavDurationSeconds, VOICE_SAMPLE_RATE } from '../public/js/wav.js';

test('clockText shows minutes and seconds, never hours', () => {
  assert.equal(clockText(0), '0:00');
  assert.equal(clockText(5), '0:05');
  assert.equal(clockText(75), '1:15');
  assert.equal(clockText(300), '5:00');
  assert.equal(clockText(4.6), '0:05');
  assert.equal(clockText(NaN), '0:00');
  assert.equal(clockText(-3), '0:00');
});

test('encodeWav writes a valid header with the exact length', () => {
  const seconds = 3;
  const samples = new Float32Array(VOICE_SAMPLE_RATE * seconds);
  const buffer = encodeWav(samples, VOICE_SAMPLE_RATE);
  const view = new DataView(buffer);
  const tag = (offset) => String.fromCharCode(...new Uint8Array(buffer, offset, 4));
  assert.equal(tag(0), 'RIFF');
  assert.equal(tag(8), 'WAVE');
  assert.equal(tag(12), 'fmt ');
  assert.equal(tag(36), 'data');
  assert.equal(view.getUint16(20, true), 1);   // PCM
  assert.equal(view.getUint16(22, true), 1);   // mono
  assert.equal(view.getUint32(24, true), VOICE_SAMPLE_RATE);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(buffer.byteLength, 44 + samples.length * 2);
  assert.equal(view.getUint32(4, true), buffer.byteLength - 8);
  assert.equal(wavDurationSeconds(buffer), seconds);
});

test('encodeWav converts and clips samples correctly', () => {
  const view = new DataView(encodeWav(Float32Array.from([0, 1, -1, 0.5, 2, -2]), 8000));
  const at = (i) => view.getInt16(44 + i * 2, true);
  assert.equal(at(0), 0);
  assert.equal(at(1), 32767);
  assert.equal(at(2), -32768);
  assert.equal(at(3), Math.trunc(0.5 * 32767));
  assert.equal(at(4), 32767);   // clipped
  assert.equal(at(5), -32768);  // clipped
});

test('five minutes of voice stays under the 8 MB upload limit', () => {
  const bytes = 44 + VOICE_SAMPLE_RATE * 300 * 2;
  assert.ok(bytes < 8 * 1024 * 1024, `5 minutes is ${bytes} bytes`);
});

test('voice player trusts the saved length when the file reports nonsense', async () => {
  const { trustedDuration } = await import('../public/js/voice-player.js');
  assert.equal(trustedDuration(4, 60019), 4);        // 16:40:19 in a browser player
  assert.equal(trustedDuration(4, Infinity), 4);
  assert.equal(trustedDuration(4, NaN), 4);
  assert.equal(trustedDuration(4, 4.2), 4.2);        // file agrees, use it
  assert.equal(trustedDuration(null, 12), 12);       // old post with no saved length
  assert.equal(trustedDuration(null, Infinity), 0);
});

// Voice message helpers.
//
// Recordings made in the browser (MediaRecorder) are WebM/MP4 files that do not store their
// own length, so players can show nonsense such as 16:40:19. Converting the recording to a
// plain WAV file writes the exact length into the file header and plays everywhere.

// 12 kHz mono, 16-bit: clear speech, and 5 minutes is about 7.2 MB (the upload limit is 8 MB).
export const VOICE_SAMPLE_RATE = 12000;

// 75 -> "1:15", 5 -> "0:05", 3600 -> "60:00"
export function clockText(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

// Float samples (-1..1) -> a complete mono 16-bit PCM WAV file (ArrayBuffer).
export function encodeWav(samples, sampleRate = VOICE_SAMPLE_RATE) {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const text = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);            // fmt chunk size
  view.setUint16(20, 1, true);             // PCM
  view.setUint16(22, 1, true);             // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // bytes per second
  view.setUint16(32, 2, true);             // bytes per frame
  view.setUint16(34, 16, true);            // bits per sample
  text(36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

// Length in seconds, read back from a WAV file's header.
export function wavDurationSeconds(buffer) {
  const view = new DataView(buffer);
  const byteRate = view.getUint32(28, true);
  const dataBytes = view.getUint32(40, true);
  return byteRate ? dataBytes / byteRate : 0;
}

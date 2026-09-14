/**
 * Target adapter for the standalone PWA. It owns only browser media handles;
 * application state, records, and interpretation remain outside the UI.
 */
let stream = null;
let recorder = null;

export function recordingAvailability(browser = globalThis) {
  return Boolean(browser?.isSecureContext && browser.navigator?.mediaDevices?.getUserMedia);
}

export async function startRecording(browser = globalThis) {
  if (!recordingAvailability(browser)) throw new Error('recording_unavailable');
  if (recorder?.state === 'recording') return Object.freeze({ state: 'recording' });

  stream = await browser.navigator.mediaDevices.getUserMedia({ audio: true });
  recorder = new browser.MediaRecorder(stream);
  recorder.start();
  return Object.freeze({ state: 'recording' });
}

export function stopRecording() {
  if (recorder?.state === 'recording') recorder.stop();
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  recorder = null;
  return Object.freeze({ state: 'stopped' });
}

export function isRecording() {
  return recorder?.state === 'recording';
}

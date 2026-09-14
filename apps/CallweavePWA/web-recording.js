/**
 * Target adapter for the standalone PWA. It owns only browser media handles;
 * application state, records, and interpretation remain outside the UI.
 */
let stream = null;
let recorder = null;
let chunks = [];
let audioContext = null;
let analyser = null;
let levelSamples = null;

export function recordingAvailability(browser = globalThis) {
  return Boolean(browser?.isSecureContext && browser.navigator?.mediaDevices?.getUserMedia && browser.MediaRecorder);
}

export async function startRecording(browser = globalThis) {
  if (!recordingAvailability(browser)) throw new Error('recording_unavailable');
  if (recorder?.state === 'recording') return Object.freeze({ state: 'recording' });

  stream = await browser.navigator.mediaDevices.getUserMedia({ audio: true });
  const AudioContext = browser.AudioContext || browser.webkitAudioContext;
  if (AudioContext) {
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    levelSamples = new Uint8Array(analyser.fftSize);
    source.connect(analyser);
    await audioContext.resume();
  }
  recorder = new browser.MediaRecorder(stream);
  chunks = [];
  recorder.addEventListener('dataavailable', event => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  recorder.start();
  return Object.freeze({ state: 'recording' });
}

export async function stopRecording() {
  const activeRecorder = recorder;
  const activeStream = stream;
  if (!activeRecorder || activeRecorder.state !== 'recording') {
    return Object.freeze({ state: 'stopped', blob: null });
  }

  await new Promise(resolve => {
    activeRecorder.addEventListener('stop', resolve, { once: true });
    activeRecorder.stop();
  });
  activeStream?.getTracks().forEach(track => track.stop());
  await audioContext?.close();
  audioContext = null;
  analyser = null;
  levelSamples = null;
  const blob = new Blob(chunks, { type: activeRecorder.mimeType || 'audio/webm' });
  chunks = [];
  stream = null;
  recorder = null;
  return Object.freeze({ state: 'stopped', blob });
}

export function isRecording() {
  return recorder?.state === 'recording';
}

export function inputLevel() {
  if (!analyser || !levelSamples) return 0;
  analyser.getByteTimeDomainData(levelSamples);
  const rms = Math.sqrt(levelSamples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / levelSamples.length);
  return Math.min(1, rms * 5);
}

export async function microphoneStatus(browser = globalThis) {
  if (!recordingAvailability(browser)) return { state: 'unsupported', label: 'Recording is unavailable in this browser.' };
  if (isRecording()) {
    const track = stream?.getAudioTracks()[0];
    return { state: 'recording', label: track?.label || 'Microphone is recording.' };
  }
  try {
    const permission = await browser.navigator.permissions?.query?.({ name: 'microphone' });
    if (permission?.state === 'denied') return { state: 'blocked', label: 'Microphone access is blocked.' };
    const devices = await browser.navigator.mediaDevices.enumerateDevices();
    const device = devices.find(item => item.kind === 'audioinput');
    if (permission?.state === 'granted') return { state: 'ready', label: device?.label || 'Microphone permission is granted.' };
    return { state: 'needs-permission', label: 'Allow microphone access to listen.' };
  } catch {
    return { state: 'needs-permission', label: 'Allow microphone access to listen.' };
  }
}

import assert from 'node:assert/strict';
import {
  inputLevel,
  isRecording,
  microphoneStatus,
  recordingAvailability,
  startRecording,
  stopRecording,
} from '../apps/CallweavePWA/web-recording.js';

function host({ permission = 'prompt', devices = [{ kind: 'audioinput', label: 'Field microphone' }], error } = {}) {
  class Recorder {
    constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; this.listeners = new Map(); }
    addEventListener(type, listener, options = {}) { this.listeners.set(type, { listener, once: options.once }); }
    emit(type, event = {}) { const entry = this.listeners.get(type); if (!entry) return; entry.listener(event); if (entry.once) this.listeners.delete(type); }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.emit('dataavailable', { data: new Blob(['recorded']) }); this.emit('stop'); }
  }
  return {
    isSecureContext: true,
    MediaRecorder: Recorder,
    navigator: {
      permissions: { query: async () => ({ state: permission }) },
      mediaDevices: {
        getUserMedia: async () => { if (error) throw error; return { getTracks: () => [{ stop() {} }], getAudioTracks: () => [{ label: 'Field microphone' }] }; },
        enumerateDevices: async () => devices,
      },
    },
  };
}

assert.equal(recordingAvailability({ isSecureContext: false }), false, 'insecure hosts are unsupported');
assert.deepEqual(await microphoneStatus({ isSecureContext: false }), { state: 'unsupported', label: 'Recording is unavailable in this browser.' });
assert.deepEqual(await microphoneStatus(host({ permission: 'denied' })), { state: 'blocked', label: 'Microphone access is blocked.' });
assert.deepEqual(await microphoneStatus(host({ permission: 'prompt' })), { state: 'needs-permission', label: 'Allow microphone access to listen.' });
assert.deepEqual(await microphoneStatus(host({ permission: 'granted', devices: [] })), { state: 'ready', label: 'Microphone permission is granted.' });

for (const name of ['NotAllowedError', 'NotFoundError', 'NotReadableError']) {
  await assert.rejects(() => startRecording(host({ error: Object.assign(new Error(name), { name }) })), error => error.name === name);
  assert.equal(isRecording(), false, `${name} does not leave capture active`);
}

const browser = host({ permission: 'granted' });
assert.deepEqual(await startRecording(browser), { state: 'recording' });
assert.equal(isRecording(), true);
assert.equal(inputLevel(), 0, 'a host without an analyser remains safe');
const stopped = await stopRecording();
assert.equal(stopped.state, 'stopped');
assert.ok(stopped.blob.size > 0, 'a completed recording has bytes');
assert.equal(isRecording(), false);
assert.deepEqual(await stopRecording(), { state: 'stopped', blob: null });

console.log('Callweave web recording adapter passed happy, permission, device, busy, unsupported, and stop paths.');

import { inputLevel, isRecording, microphoneStatus, recordingAvailability, startRecording, stopRecording } from './web-recording.js';
import { listLocalRecordings, saveLocalRecording } from './local-recordings.js';
import { TraverseRuntimeClient, runtimeConfigFromHost } from './runtime-client.js';
import { commandResultView, runtimeEventView } from './runtime-events.js';
import { captureRequestPayload, nativeHostFromBridge } from './native-host.js';

const app = document.querySelector('#app');
let placeName = localStorage.getItem('callweave-place-name') || 'Golden, BC';

const views = {
  today: {
    title: 'Sessions', label: 'Your private soundscape', subtitle: '',
  },
  archive: { title: 'Archive', label: 'Daily canvases', subtitle: 'A quiet record of this place' },
  review: { title: 'Review', label: 'Needs a closer listen', subtitle: 'Evidence stays evidence until a person reviews it.' },
  setup: { title: 'Enable listening', label: 'Listening setup', subtitle: 'Allow Callweave to use this browser’s microphone.' },
};
let recordings = [];
let route = location.hash === '#welcome' ? 'welcome' : 'today';
let selected = null;
let selectedDay = null;
let selectedFinding = null;
let installPrompt = null;
let sessionStartedAt = null;
let sessionTicker = null;
let runtimeClient = null;
let runtimeSession = null;
let runtimeSubscription = null;
let runtimeState = null;

function place() {
  return placeName.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

function icon(name) {
  const paths = {
    today: '<path d="M3 12c4-7 14-7 18 0-4 7-14 7-18 0Z"/><circle cx="12" cy="12" r="2"/>',
    archive: '<path d="M4 6h16v14H4zM7 3h10v3M8 10h8M8 14h5"/>',
    review: '<path d="M4 13c3-5 5-5 8 0s5 5 8 0M4 17c3-5 5-5 8 0s5 5 8 0M4 9c3-5 5-5 8 0s5 5 8 0"/>',
    place: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20.3h-3v-.08A1.7 1.7 0 0 0 10.66 18.66a1.7 1.7 0 0 0-1.88.34l-.06.06L6.6 16.94l.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.04H5.3v-3h.14A1.7 1.7 0 0 0 7 9.92a1.7 1.7 0 0 0-.34-1.88L6.6 7.98 8.72 5.86l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.7 4.7v-.08h3v.08a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 19.4 9.9c.24.63.85 1.05 1.52 1.05h.08v3h-.08c-.67 0-1.28.42-1.52 1.05Z"/>',
    listen: '<path d="M5 12h2M9 8v8M13 5v14M17 8v8M21 12h-2"/>',
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function navItem(key, label) {
  const isCurrent = route === key;
  return `<button class="nav-item ${isCurrent ? 'is-active' : ''}" data-route="${key}" aria-label="${label}" aria-current="${isCurrent ? 'page' : 'false'}">${icon(key)}<span>${label}</span></button>`;
}

function listeningNavItem() {
  return `<button id="mobile-start-listening" class="mobile-listen" type="button" data-action="start-listening" aria-label="Start listening">${icon('listen')}<span>Listen</span></button>`;
}

function shell(content) {
  return `<div class="app-shell">
    <header class="mobile-head"><div class="wordmark"><i></i>Callweave</div><button class="place-button" data-route="settings">${place()}</button></header>
    <aside class="rail"><div class="wordmark"><i></i><b>Callweave</b></div><nav>${navItem('today','Sessions')}<button class="rail-listen runtime-button" type="button" data-action="start-listening">${icon('listen')}<span>Listen now</span></button><div class="rail-spacer"></div>${navItem('settings','Settings')}</nav></aside>
    <main class="main">${content}</main>
    <nav class="mobile-nav">${navItem('today','Sessions')}${listeningNavItem()}${navItem('settings','Settings')}</nav>
  </div>`;
}

function listeningSession() {
  return `<main class="listening-session" aria-labelledby="session-title">
    <header class="session-head"><span class="listening-chip"><i></i>Listening</span><div class="session-wordmark">CallWeave</div></header>
    <section class="session-center">
      <h1 id="session-elapsed" class="session-elapsed">00:00</h1>
      <p class="session-place">${place()}</p>
      <div class="session-wave" aria-label="Live microphone level">${bars(15)}</div>
      <p class="session-copy">Keep the phone still. CallWeave is capturing nearby calls in high fidelity.</p>
    </section>
    <footer class="session-footer"><button class="stop-listening" type="button" data-action="stop-listening" aria-label="Stop recording"><span></span></button><b>Stop recording</b></footer>
  </main>`;
}

function welcome() {
  return `<main class="welcome" aria-labelledby="welcome-title"><header class="welcome-head"><div class="wordmark"><i></i>Callweave</div><span>1 of 3</span></header><section class="welcome-center"><p class="kicker">Listen closer</p><h1 id="welcome-title">The life around you has a voice.</h1><p>Callweave keeps a private, daily record of the animals and sounds around one place.</p><img src="./assets/listening-soundscape.png" alt="Illustrated animals gathered around sound waves"><button class="runtime-button" data-route="welcome-listen">Begin</button></section></main>`;
}

function welcomeListen() {
  return `<main class="welcome" aria-labelledby="welcome-listen-title"><header class="welcome-head"><div class="wordmark"><i></i>Callweave</div><span>2 of 3</span></header><section class="welcome-center welcome-steps"><p class="kicker">How it works</p><h1 id="welcome-listen-title">Listen. Notice. Return.</h1><ol><li><span>1</span><div><strong>Listen at your place</strong><p>Start a session when you want to capture the soundscape around you.</p></div></li><li><span>2</span><div><strong>Keep a daily record</strong><p>Find recordings, listening time, and the animals heard in one place.</p></div></li><li><span>3</span><div><strong>Review what is uncertain</strong><p>Callweave asks before a sound becomes a confirmed finding.</p></div></li></ol><button class="runtime-button" data-route="welcome-private">Continue</button></section></main>`;
}

function welcomePrivate() {
  return `<main class="welcome" aria-labelledby="welcome-private-title"><header class="welcome-head"><div class="wordmark"><i></i>Callweave</div><span>3 of 3</span></header><section class="welcome-center"><p class="kicker">Your place, privately</p><h1 id="welcome-private-title">The sounds stay with you.</h1><p>Recording, location, and your daily record remain private to this place. You stay in control of what gets reviewed.</p><div class="welcome-seal">⌁</div><button class="runtime-button" data-route="today">Open Callweave</button></section></main>`;
}

function today() {
  const cards = recordings.length ? recordings.map(recording => `<button class="session-card" data-day="${recording.id}" data-route="day"><span>${recording.day} · ${recording.time}</span><b>${place()}</b><small>${formatDuration(recording.durationSeconds)} · ${recording.observations?.length ?? 0} animals</small><i>↗</i></button>`).join('') : `<section class="session-empty"><b>Your first session starts here.</b><span>Start listening to create a private field recording at this place.</span></section>`;
  return shell(`<section class="page sessions-page"><header class="sessions-heading"><div><div class="sessions-title-row"><h1>Sessions</h1><span>${recordings.length} logs</span></div><p class="sessions-subtitle">Your field recordings, woven into wildlife observations.</p></div><button id="home-start-listening" class="sessions-start" type="button" data-action="start-listening">${icon('listen')}Start listening</button></header><h2 class="recent-label">Recent recordings</h2><div class="sessions-list">${cards}</div><p id="listening-status" class="runtime-status" aria-live="polite" hidden></p></section>`);
}

function archive() {
  return shell(`<section class="page"><header class="page-title"><div><p class="kicker">${views.archive.label}</p><h1>${views.archive.title}</h1><p class="place-copy">${views.archive.subtitle}</p></div></header><div class="archive-grid">
    ${recordings.length ? recordings.map((recording, i) => `<button class="day-card" data-day="${recording.id}" data-route="day"><div class="mini-wave">${bars(18 + i)}</div><strong>${recording.day}</strong><span>${formatDuration(recording.durationSeconds)} · saved on this device</span><small>${recording.observations?.length ? `${recording.observations.length} observation${recording.observations.length === 1 ? '' : 's'}` : 'Ready to listen back'}</small></button>`).join('') : `<section class="empty-state"><p class="kicker">Archive</p><h2>Your archive is empty</h2><p>Start listening to create your first local recording.</p><button class="runtime-button" data-action="start-listening">Start listening</button></section>`}
  </div></section>`);
}

function day() {
  const recording = recordings.find(item => item.id === selectedDay) ?? recordings[0];
  if (!recording) return archive();
  const audio = recording.audio ? `<audio class="recording-player" controls preload="metadata" src="${URL.createObjectURL(recording.audio)}">Your browser cannot play this recording.</audio>` : '';
  const observations = recording.observations ?? [];
  const findings = observations.length
    ? `<div class="observation-list">${observations.map(item => `<div><span></span><strong>${escape(item.label)}</strong><small>Noted by you</small></div>`).join('')}</div>`
    : `<p class="honest-empty">No animals have been identified yet. Add what you heard below.</p>`;
  return shell(`<section class="page detail-page"><button class="back-link" data-route="today">← Sessions</button><header class="detail-heading"><p>Session</p><h1>${place()}</h1><span>${recording.day} · ${recording.time} · ${formatDuration(recording.durationSeconds)}</span></header><section class="day-summary"><div class="summary-wave">${bars(27)}</div>${audio}</section><section class="observation-section"><div class="observation-heading"><p>Recognized · ${observations.length}</p><button class="text-link" type="button" data-action="focus-observation">＋ Add animal</button></div>${findings}<form id="observation-form" class="observation-form" data-recording-id="${recording.id}"><label for="observation-name">What else did you hear?</label><div><input id="observation-name" name="observation" maxlength="60" placeholder="Search or enter an animal" required><button class="runtime-button" type="submit">Add</button></div></form></section></section>`);
}

function review() {
  return shell(`<section class="page"><header class="page-title"><div><p class="kicker">${views.review.label}</p><h1>${views.review.title}</h1><p class="place-copy">${views.review.subtitle}</p></div></header><section class="review-list">
    <section class="empty-state"><p class="kicker">Review</p><h2>Nothing needs your review</h2><p>Findings will appear only after a recording has been analysed and needs your decision.</p></section>
  </section></section>`);
}

function finding() {
  return shell(`<section class="page detail-page"><button class="back-link" data-route="review">← Review</button><header class="page-title"><div><p class="kicker">Sound group</p><h1>Listen closer</h1><p class="place-copy">${selectedFinding}</p></div></header><section class="finding-card"><div class="finding-wave">${bars(46)}</div><p class="finding-meta">8 retained clips · Early morning · Provisional</p><p>This finding needs your judgment. The recorded evidence remains separate from your decision.</p><div class="review-actions"><button class="review-choice" data-review-action="verify">This looks right</button><button class="review-choice" data-review-action="hold">Keep for review</button><button class="review-choice" data-review-action="reject">Not this sound</button></div><p id="review-feedback" class="review-feedback" aria-live="polite"></p></section></section>`);
}

function settings() {
  return shell(`<section class="page settings-page"><header class="settings-heading"><h1>Settings</h1></header><section class="settings-tile"><p>⌁ &nbsp; Microphone <b>›</b></p><strong id="mic-heading">Checking microphone</strong><small id="mic-status" aria-live="polite">Checking browser permission and available inputs…</small><button class="text-link" type="button" data-action="refresh-microphone">Refresh microphone</button></section><section class="settings-tile"><p>⌖ &nbsp; Location <b>›</b></p><form id="place-form" class="place-form"><label for="place-name">Current place</label><div><input id="place-name" name="placeName" value="${place()}" maxlength="60" required><button class="runtime-button" type="submit">Save</button></div></form><small>This label remains on this device.</small></section><section class="privacy-setting"><div><strong>Private recordings</strong><small>Audio and your notes stay on this device.</small></div><span aria-hidden="true"></span></section></section>`);
}

function analysis() {
  return `<main class="analysis-screen" aria-labelledby="analysis-title"><header>Callweave / Analysis</header><section class="analysis-content"><h1 id="analysis-title">We’re weaving<br>the calls.</h1><p id="analysis-status" aria-live="polite">Your recording is saved. Waiting for the local analysis capability to begin.</p><div class="analysis-dots" aria-label="Analysis waiting"><i></i><i></i><i></i><i class="is-current"></i><i></i><i></i><i></i></div></section><footer><div class="analysis-progress-meta"><span>Analysis waiting</span><b>Recording saved</b></div><div class="analysis-progress" role="progressbar" aria-label="Analysis waiting" aria-valuetext="Waiting for analysis capability"></div><p>Results will appear here only when the analyzer returns them.</p></footer></main>`;
}

function setup() {
  const v = views.setup;
  return shell(`<section class="page setup-page"><header class="page-title"><div><p class="kicker">${v.label}</p><h1>${v.title}</h1><p class="place-copy">${v.subtitle}</p></div></header><section class="setup-panel"><h2>Use this browser’s microphone</h2><ol><li><span>1</span><p>Select Start listening.</p></li><li><span>2</span><p>Allow microphone access in the browser prompt.</p></li><li><span>3</span><p>Keep this browser open while listening.</p></li></ol><p id="setup-status" class="setup-status" aria-live="polite">Audio stays on this device.</p><button class="runtime-button" type="button" data-action="start-listening">Start listening</button><button class="text-link setup-back" type="button" data-route="today">Back to Today <span>→</span></button></section></section>`);
}

function bars(count) { return Array.from({ length: count }, (_, i) => `<i style="--h:${12 + Math.round(Math.abs(Math.sin(i * 1.72)) * 37)}%"></i>`).join(''); }
function formatDuration(seconds) {
  const value = Math.max(1, Math.round(seconds || 0));
  const minutes = Math.floor(value / 60);
  return minutes ? `${minutes}m ${value % 60}s` : `${value}s`;
}
function escape(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]); }
function formatDay(timestamp) { return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).format(timestamp); }
function formatTime(timestamp) { return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(timestamp); }
function animalCards(animals) { return animals.map((animal, index) => `<article class="animal-card"><span class="animal-mark animal-${index}">${animalEmoji(animal)}</span><strong>${animal}</strong><small>${index === 0 ? 'Most active' : `${3 + index * 2} sound events`}</small></article>`).join(''); }
function animalEmoji(animal) { return animal.includes('frog') ? '♧' : animal.includes('cricket') ? '⌇' : animal.includes('Coyote') ? '◒' : animal.includes('squirrel') ? '◔' : '⌁'; }

function modal(title) {
  selected = title;
  document.body.classList.add('has-modal');
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-close><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="icon-close" data-close aria-label="Close">${icon('close')}</button><p class="kicker">Presentation detail</p><h2 id="modal-title">${title}</h2><p>This screen can show evidence supplied by Callweave. It does not make an identification, validate a result, or change any record.</p><button class="text-link" data-close>Close <span>→</span></button></section></div>`);
}

function render() {
  clearInterval(sessionTicker);
  app.innerHTML = ({ welcome, 'welcome-listen': welcomeListen, 'welcome-private': welcomePrivate, today, archive, day, review, finding, settings, setup, analysis, complete: analysis, session: listeningSession })[route]();
  if (route === 'session') startSessionClock();
  if (route === 'settings') refreshMicrophoneStatus('#mic-status');
}
document.addEventListener('click', event => {
  const routeButton = event.target.closest('[data-route]');
  if (routeButton) { if (routeButton.dataset.day) selectedDay = routeButton.dataset.day; if (routeButton.dataset.finding) selectedFinding = routeButton.dataset.finding; route = routeButton.dataset.route; render(); return; }
  if (event.target.closest('[data-action="start-listening"]')) { startListeningFromUserAction(); return; }
  if (event.target.closest('[data-action="stop-listening"]')) { stopListeningFromUserAction(); return; }
  if (event.target.closest('[data-action="refresh-microphone"]')) { refreshMicrophoneStatus('#mic-status'); return; }
  if (event.target.closest('[data-action="focus-observation"]')) { document.querySelector('#observation-name')?.focus(); return; }
  if (event.target.closest('#install-app')) { requestInstallation(); return; }
  const reviewAction = event.target.closest('[data-review-action]');
  if (reviewAction) { const feedback = document.querySelector('#review-feedback'); if (feedback) feedback.textContent = 'Your review decision is ready to be applied.'; return; }
  const openButton = event.target.closest('[data-open]');
  if (openButton) { modal(openButton.dataset.open); return; }
  if (event.target.closest('[data-close]')) { document.querySelector('.modal-backdrop')?.remove(); document.body.classList.remove('has-modal'); selected = null; }
});
document.addEventListener('submit', async event => {
  if (event.target.id === 'place-form') {
    event.preventDefault();
    const next = new FormData(event.target).get('placeName')?.trim();
    if (!next) return;
    placeName = next;
    localStorage.setItem('callweave-place-name', placeName);
    render();
  }
  if (event.target.id === 'observation-form') {
    event.preventDefault();
    const label = new FormData(event.target).get('observation')?.trim();
    const id = event.target.dataset.recordingId;
    const recording = recordings.find(item => item.id === id);
    if (!label || !recording) return;
    const observations = [...(recording.observations ?? []), { label }];
    const updated = { ...recording, observations };
    await saveLocalRecording(updated);
    recordings = recordings.map(item => item.id === id ? updated : item);
    render();
  }
});
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; syncInstallButton(); });
window.addEventListener('appinstalled', () => { installPrompt = null; syncInstallButton(); });


function syncInstallButton() {
  const button = document.querySelector('#install-app');
  if (button) button.hidden = !installPrompt;
}

async function requestInstallation() {
  if (!installPrompt) return;
  const prompt = installPrompt;
  installPrompt = null;
  syncInstallButton();
  await prompt.prompt();
}

async function startListeningFromUserAction() {
  const target = document.querySelector('#runtime-status') ?? document.querySelector('#listening-status');
  const button = document.querySelector('#capture-plan') ?? document.querySelector('[data-action="start-listening"]');
  if (!button) return;
  if (target) {
    target.hidden = false;
    target.textContent = 'Starting listening…';
  }
  button.disabled = true;
  button.textContent = 'Starting…';
  try {
    const plan = await requestCapturePlan();
    // When a Traverse host is present, it owns the opaque request payload and
    // the state transition.  A browser adapter must wait for the machine's
    // declared capture plan; it must not fabricate one from UI values.
    if (plan && plan.state !== 'capture_planned') {
      if (target) target.textContent = 'Preparing this listening session…';
      button.disabled = false;
      button.textContent = 'Start listening';
      return;
    }
    await startRecording();
    sessionStartedAt = Date.now();
    route = 'session';
    render();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Start listening';
    if (target) target.textContent = microphoneErrorMessage(error);
  }
}

async function connectTraverseRuntime() {
  const config = runtimeConfigFromHost();
  if (!config) return;
  try {
    runtimeClient = new TraverseRuntimeClient(config);
    const health = await runtimeClient.health();
    if (health.status !== 'connected') runtimeClient = null;
  } catch {
    runtimeClient = null;
  }
}

async function requestCapturePlan() {
  if (!runtimeClient) return null;
  const payload = await captureRequestPayload(nativeHostFromBridge());
  if (!payload) {
    const error = new Error('This device has not provided a recording request to Callweave yet.');
    error.code = 'capture_request_unavailable';
    throw error;
  }
  const accepted = commandResultView(await runtimeClient.dispatchCommand({
    command: 'request_capture', payload, sessionId: runtimeSession?.sessionId,
  }));
  runtimeSession = accepted;
  runtimeState = accepted.state;
  renderRuntimeState();
  runtimeSubscription?.close?.();
  if (accepted.executionId) {
    runtimeSubscription = runtimeClient.subscribe({
      executionId: accepted.executionId,
      onMessage: event => { runtimeState = runtimeEventView(event).state; renderRuntimeState(); },
      onError: () => { runtimeSubscription = null; },
      onClose: () => { runtimeSubscription = null; },
    });
  }
  return accepted;
}

function renderRuntimeState() {
  const target = document.querySelector('#runtime-status') ?? document.querySelector('#listening-status');
  if (!target || !runtimeState) return;
  const copy = {
    planning: 'Preparing this listening session…',
    capture_planned: 'Listening is ready on this device.',
    request_rejected: 'This listening session could not be prepared. Try again.',
  }[runtimeState];
  if (!copy) return;
  target.hidden = false;
  target.textContent = copy;
}

async function stopListeningFromUserAction() {
  const startedAt = sessionStartedAt;
  const stopped = await stopRecording();
  if (startedAt && stopped.blob?.size) {
    const recording = {
      id: crypto.randomUUID(),
      startedAt,
      day: formatDay(startedAt),
      time: formatTime(startedAt),
      durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      audio: stopped.blob,
    };
    await saveLocalRecording(recording);
    recordings = [recording, ...recordings];
    selectedDay = recording.id;
  }
  sessionStartedAt = null;
  route = 'analysis';
  render();
}

function microphoneErrorMessage(error) {
  if (error?.name === 'NotAllowedError') return 'Microphone access is blocked. Allow it in your browser settings, then try again.';
  if (error?.name === 'NotFoundError') return 'No microphone is available. Connect or select one, then try again.';
  if (error?.name === 'NotReadableError') return 'Your microphone is being used by another app. Close that app, then try again.';
  if (error?.message === 'recording_unavailable') return 'This browser cannot record audio here. Use a current browser over HTTPS or localhost.';
  if (error?.code === 'capture_request_unavailable') return error.message;
  return 'Listening could not start. Check your microphone and try again.';
}

function startSessionClock() {
  const update = () => {
    const target = document.querySelector('#session-elapsed');
    if (!target || !sessionStartedAt) return;
    const seconds = Math.floor((Date.now() - sessionStartedAt) / 1000);
    target.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    const meter = document.querySelector('#input-level');
    if (meter) meter.style.transform = `scaleX(${Math.max(.03, inputLevel())})`;
  };
  update();
  sessionTicker = setInterval(update, 1000);
}

async function refreshMicrophoneStatus(selector) {
  const target = document.querySelector(selector);
  if (!target) return;
  const status = await microphoneStatus();
  if (!document.contains(target)) return;
  target.textContent = status.label;
  const heading = document.querySelector('#mic-heading');
  const indicator = document.querySelector('#mic-indicator');
  if (heading) heading.textContent = status.state === 'recording' ? 'Microphone is recording' : status.state === 'ready' ? 'Microphone connected' : status.state === 'blocked' ? 'Microphone blocked' : 'Microphone needs permission';
  if (indicator) indicator.className = `mic-indicator is-${status.state}`;
}

function appendListeningMessage(message) {
  const list = document.querySelector('#runtime-events');
  if (!list) return;
  list.querySelector('.is-empty')?.remove();
  const item = document.createElement('li');
  item.className = 'runtime-event';
  const title = document.createElement('strong');
  title.textContent = message;
  item.append(title);
  list.prepend(item);
}

listLocalRecordings()
  .then(items => { recordings = items; render(); })
  .catch(() => { /* The app stays usable if private browser storage is unavailable. */ });

connectTraverseRuntime();

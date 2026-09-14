import { inputLevel, isRecording, microphoneStatus, recordingAvailability, startRecording, stopRecording } from './web-recording.js';
import { listLocalRecordings, saveLocalRecording } from './local-recordings.js';

const app = document.querySelector('#app');
let placeName = localStorage.getItem('callweave-place-name') || 'Golden, BC';

const views = {
  today: {
    title: 'Today', label: 'Your private soundscape', subtitle: '',
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
    <aside class="rail"><div class="wordmark"><i></i><b>Callweave</b></div><nav>${navItem('today','Today')}${navItem('archive','Archive')}${navItem('review','Review')}<div class="rail-spacer"></div>${navItem('settings','Settings')}</nav></aside>
    <main class="main">${content}</main>
    <nav class="mobile-nav">${navItem('today','Today')}${navItem('archive','Archive')}${listeningNavItem()}${navItem('review','Review')}${navItem('settings','Settings')}</nav>
  </div>`;
}

function listeningSession() {
  return `<main class="listening-session" aria-labelledby="session-title">
    <header class="session-head"><div class="wordmark"><i></i>Callweave</div><p>${place()}</p></header>
    <section class="session-center">
      <p class="kicker">Listening now</p>
      <div class="session-ripple" aria-hidden="true"><span></span><span></span><span></span><div class="session-core">${icon('listen')}</div></div>
      <h1 id="session-title">Listening</h1>
      <p id="session-elapsed" class="session-elapsed">00:00</p>
      <p class="session-copy">Callweave is listening for the sounds around this place.</p><div class="input-meter" aria-label="Live microphone level"><span id="input-level"></span></div><p class="session-proof">Live microphone input</p>
    </section>
    <footer class="session-footer"><button class="stop-listening" type="button" data-action="stop-listening">Stop listening</button><p>Audio stays on this device.</p></footer>
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
  const v = views.today;
  const latest = recordings[0];
  const headline = latest ? 'Your latest listening session is ready.' : 'Start your first listening session.';
  const copy = latest ? `${formatDuration(latest.durationSeconds)} saved locally. Animal findings will appear after analysis.` : 'Record a moment from this place. It will remain in this browser until you choose otherwise.';
  const recordSection = latest
    ? `<section class="today-section"><div class="section-heading"><div><p class="kicker">Latest recording</p><h2>${latest.day}</h2></div><button class="text-link" data-day="${latest.id}" data-route="day">View record <span>→</span></button></div><p class="empty-copy">Audio is saved locally. Animal findings have not been analysed yet.</p></section>`
    : `<section class="today-section empty-state"><p class="kicker">Your record</p><h2>No recordings yet</h2><p>When you stop a listening session, it will appear here and in Archive.</p></section>`;
  return shell(`<section class="page today-page"><header class="page-title"><div><p class="kicker">${v.label}</p><h1>${v.title}</h1><p class="place-copy">${place()} <span>· private place</span></p></div><button id="home-start-listening" class="runtime-button" type="button" data-action="start-listening">Start listening</button></header>
    <p id="listening-status" class="runtime-status" aria-live="polite" hidden></p>
    <section class="today-hero"><div><p class="kicker">Today’s soundscape</p><h2>${headline}</h2><p>${copy}</p><div class="waveform" aria-label="Sound activity pattern" role="img">${bars(42)}</div></div><img src="./assets/listening-soundscape.png" alt="Engraved frog, fox, moth, and wren gathered around shared sound waves"></section>
    <section class="today-stats"><div><strong>${recordings.length}</strong><span>sessions saved</span></div><div><strong>0</strong><span>animals confirmed</span></div><div><strong>0</strong><span>need review</span></div></section>
    ${recordSection}
    <section id="listening-setup" class="listening-setup" ${recordingAvailability() ? 'hidden' : ''}><p class="kicker">Listening setup</p><h2>Microphone unavailable</h2><p>This browser cannot access a microphone. Open Callweave in a supported browser and allow microphone access.</p></section>
  </section>`);
}

function archive() {
  return shell(`<section class="page"><header class="page-title"><div><p class="kicker">${views.archive.label}</p><h1>${views.archive.title}</h1><p class="place-copy">${views.archive.subtitle}</p></div></header><div class="archive-grid">
    ${recordings.length ? recordings.map((recording, i) => `<button class="day-card" data-day="${recording.id}" data-route="day"><div class="mini-wave">${bars(18 + i)}</div><strong>${recording.day}</strong><span>${formatDuration(recording.durationSeconds)} · saved on this device</span><small>Awaiting animal analysis</small></button>`).join('') : `<section class="empty-state"><p class="kicker">Archive</p><h2>Your archive is empty</h2><p>Start listening to create your first local recording.</p><button class="runtime-button" data-action="start-listening">Start listening</button></section>`}
  </div></section>`);
}

function day() {
  const recording = recordings.find(item => item.id === selectedDay) ?? recordings[0];
  if (!recording) return archive();
  const audio = recording.audio ? `<audio class="recording-player" controls preload="metadata" src="${URL.createObjectURL(recording.audio)}">Your browser cannot play this recording.</audio>` : '';
  const observations = recording.observations ?? [];
  const findings = observations.length
    ? `<div class="observation-list">${observations.map(item => `<div><strong>${escape(item.label)}</strong><small>Your observation</small></div>`).join('')}</div>`
    : `<p>Nothing has been noted for this recording yet.</p>`;
  return shell(`<section class="page detail-page"><button class="back-link" data-route="archive">← Archive</button><header class="page-title"><div><p class="kicker">Listening session</p><h1>${recording.day}</h1><p class="place-copy">${place()} <span>· private place</span></p></div><p class="coverage">Saved locally</p></header><section class="day-summary"><div class="summary-wave">${bars(56)}</div><dl><div><dt>Listening</dt><dd>${formatDuration(recording.durationSeconds)}</dd></div><div><dt>Started</dt><dd>${recording.time}</dd></div><div><dt>Animal findings</dt><dd>${observations.length || 'None'}</dd></div></dl></section><section class="record-section recording-detail"><div><p class="kicker">Your recording</p><h2>Listen back</h2><p>This private recording stays on this device.</p>${audio}</div></section><section class="record-section observation-section"><div><p class="kicker">Animal findings</p><h2>Your observations</h2>${findings}</div><form id="observation-form" class="observation-form" data-recording-id="${recording.id}"><label for="observation-name">I heard</label><div><input id="observation-name" name="observation" maxlength="60" placeholder="e.g. Bird" required><button class="runtime-button" type="submit">Add</button></div></form></section></section>`);
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
  return shell(`<section class="page detail-page"><button class="back-link" data-route="today">← Today</button><header class="page-title"><div><p class="kicker">Settings</p><h1>Your place</h1><p class="place-copy">Private controls for location, microphone, and your record.</p></div></header><section class="settings-group"><p class="kicker">Current location</p><form id="place-form" class="place-form"><label for="place-name">Place name</label><div><input id="place-name" name="placeName" value="${place()}" maxlength="60" required><button class="runtime-button" type="submit">Save</button></div><small>This label stays in this browser.</small></form></section><section class="settings-group"><p class="kicker">Microphone</p><div class="microphone-card"><span id="mic-indicator" class="mic-indicator" aria-hidden="true"></span><div><strong id="mic-heading">Checking microphone</strong><p id="mic-status" aria-live="polite">Checking browser permission and available inputs…</p></div></div><button class="text-link" type="button" data-action="refresh-microphone">Check microphone <span>→</span></button></section><section class="settings-group"><p class="kicker">Your record</p><div class="settings-list"><div><span><strong>Privacy</strong><small>Audio stays on this device</small></span></div><div><span><strong>Animal analysis</strong><small>Not connected yet</small></span></div></div></section></section>`);
}

function complete() {
  return shell(`<section class="page completion-page"><p class="kicker">Listening complete</p><h1>A moment was saved</h1><p class="place-copy">This recording is stored in this browser and is now part of your private archive.</p><div class="completion-orbit">${icon('listen')}</div><div class="completion-actions"><button class="runtime-button" data-day="${selectedDay ?? ''}" data-route="day">View recording</button><button class="text-link" data-route="today">Back to Today <span>→</span></button></div></section>`);
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
  app.innerHTML = ({ welcome, 'welcome-listen': welcomeListen, 'welcome-private': welcomePrivate, today, archive, day, review, finding, settings, setup, complete, session: listeningSession })[route]();
  if (route === 'session') startSessionClock();
  if (route === 'settings') refreshMicrophoneStatus('#mic-status');
}
document.addEventListener('click', event => {
  const routeButton = event.target.closest('[data-route]');
  if (routeButton) { if (routeButton.dataset.day) selectedDay = routeButton.dataset.day; if (routeButton.dataset.finding) selectedFinding = routeButton.dataset.finding; route = routeButton.dataset.route; render(); return; }
  if (event.target.closest('[data-action="start-listening"]')) { startListeningFromUserAction(); return; }
  if (event.target.closest('[data-action="stop-listening"]')) { stopListeningFromUserAction(); return; }
  if (event.target.closest('[data-action="refresh-microphone"]')) { refreshMicrophoneStatus('#mic-status'); return; }
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
  route = 'complete';
  render();
}

function microphoneErrorMessage(error) {
  if (error?.name === 'NotAllowedError') return 'Microphone access is blocked. Allow it in your browser settings, then try again.';
  if (error?.name === 'NotFoundError') return 'No microphone is available. Connect or select one, then try again.';
  if (error?.name === 'NotReadableError') return 'Your microphone is being used by another app. Close that app, then try again.';
  if (error?.message === 'recording_unavailable') return 'This browser cannot record audio here. Use a current browser over HTTPS or localhost.';
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

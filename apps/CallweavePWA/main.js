import { TraverseRuntimeClient, runtimeConfigFromHost } from './runtime-client.js';
import { commandResultView, runtimeEventView } from './runtime-events.js';
import { nativeHostFromBridge, recordingAvailability, subscribeRecordingEvents } from './native-host.js';

const app = document.querySelector('#app');

// Presentation fixture only. A host adapter should replace this with read-only view models.
const views = {
  today: {
    title: 'Today', label: 'Monday, August 17', subtitle: 'Golden, BC',
    status: 'Listening since dawn', facts: ['Partial coverage', '14 retained sound events'],
  },
  archive: { title: 'Archive', label: 'Daily canvases', subtitle: 'A quiet record of this place' },
  review: { title: 'Review', label: 'Needs a closer listen', subtitle: 'Evidence stays evidence until a person reviews it.' },
  place: { title: 'Place', label: 'Golden, BC', subtitle: 'Private location profile' },
};
let route = 'today';
let selected = null;
let runtimeSubscription = null;
let nativeHostUnsubscribe = null;
let installPrompt = null;

function icon(name) {
  const paths = {
    today: '<path d="M3 12c4-7 14-7 18 0-4 7-14 7-18 0Z"/><circle cx="12" cy="12" r="2"/>',
    archive: '<path d="M4 6h16v14H4zM7 3h10v3M8 10h8M8 14h5"/>',
    review: '<path d="M4 13c3-5 5-5 8 0s5 5 8 0M4 17c3-5 5-5 8 0s5 5 8 0M4 9c3-5 5-5 8 0s5 5 8 0"/>',
    place: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2"/>',
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function navItem(key, label) {
  return `<button class="nav-item ${route === key ? 'is-active' : ''}" data-route="${key}" aria-label="${label}" aria-current="${route === key ? 'page' : 'false'}">${icon(key)}<span>${label}</span></button>`;
}

function shell(content) {
  return `<div class="app-shell">
    <header class="mobile-head"><div class="wordmark"><i></i>Callweave</div><button class="place-button" data-route="place">Golden, BC</button></header>
    <aside class="rail"><div class="wordmark"><i></i><b>Callweave</b></div><nav>${navItem('today','Today')}${navItem('archive','Archive')}${navItem('review','Review')}<div class="rail-spacer"></div>${navItem('place','Place')}</nav></aside>
    <main class="main">${content}</main>
    <nav class="mobile-nav">${navItem('today','Today')}${navItem('archive','Archive')}${navItem('review','Review')}${navItem('place','Place')}</nav>
  </div>`;
}

function today() {
  const v = views.today;
  return shell(`<section class="page today-page"><header class="page-title"><div><p class="kicker">${v.label}</p><h1>${v.title}</h1><p class="place-copy">${v.subtitle} <span>· private place</span></p></div><p class="coverage">${v.facts.join(' · ')}</p></header>
    <article class="listening-canvas"><img src="./assets/listening-soundscape.png" alt="Engraved frog, fox, moth, and wren gathered around shared sound waves"><div class="waveform" aria-label="Sound activity pattern" role="img">${bars(42)}</div><p>${v.status}</p></article>
    <section class="quiet-row"><button class="text-link" data-open="day">View today’s record <span>→</span></button><button class="text-link" data-route="review">2 unknown sound groups <span>→</span></button></section>
  </section>`);
}

function archive() {
  return shell(`<section class="page"><header class="page-title"><div><p class="kicker">${views.archive.label}</p><h1>${views.archive.title}</h1><p class="place-copy">${views.archive.subtitle}</p></div></header><div class="archive-grid">
    ${['August 17','August 16','August 15','August 14','August 13','August 12'].map((day, i) => `<button class="day-card" data-open="${day}"><div class="mini-wave">${bars(18 + i)}</div><strong>${day}</strong><span>${i === 0 ? 'Partial coverage' : 'Listening complete'}</span></button>`).join('')}
  </div></section>`);
}

function review() {
  return shell(`<section class="page"><header class="page-title"><div><p class="kicker">${views.review.label}</p><h1>${views.review.title}</h1><p class="place-copy">${views.review.subtitle}</p></div></header><section class="review-list">
    ${['Three-note call · recurring at dawn','High insect-like trill · after rain'].map((item, i) => `<button class="review-item" data-open="${item}"><span class="sound-dot ${i ? 'ochre' : ''}"></span><span><strong>${item}</strong><small>${i ? '5 retained clips' : '8 retained clips'}</small></span><span>→</span></button>`).join('')}
  </section></section>`);
}

function place() {
  return shell(`<section class="page"><header class="page-title"><div><p class="kicker">Location</p><h1>Golden, BC</h1><p class="place-copy">This place is private.</p></div></header><section class="place-panel"><p>Listening is local to this place. Exact coordinates, recordings, and privacy controls belong to the connected host—not this presentation layer.</p><section class="runtime-panel" aria-labelledby="runtime-heading"><div><p class="kicker">Traverse</p><h2 id="runtime-heading">Runtime connection</h2></div><p id="runtime-status" class="runtime-status" aria-live="polite">Checking runtime…</p><div class="runtime-actions"><button id="capture-plan" class="runtime-button" type="button" disabled>Request capture plan</button><button id="runtime-retry" class="text-link" type="button" hidden>Try again <span>→</span></button></div><ol id="runtime-events" class="runtime-events" aria-live="polite"><li class="runtime-event is-empty">No runtime events yet.</li></ol></section><section class="native-host-note" aria-live="polite"><p class="kicker">Recording host</p><p id="native-host-status">Checking native recording host…</p></section><div class="place-actions"><button id="install-app" class="text-link" type="button" hidden>Install Callweave <span>→</span></button><button class="text-link" data-open="settings">Open place settings <span>→</span></button></div></section></section>`);
}

function bars(count) { return Array.from({ length: count }, (_, i) => `<i style="--h:${12 + Math.round(Math.abs(Math.sin(i * 1.72)) * 37)}%"></i>`).join(''); }

function modal(title) {
  selected = title;
  document.body.classList.add('has-modal');
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-close><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="icon-close" data-close aria-label="Close">${icon('close')}</button><p class="kicker">Presentation detail</p><h2 id="modal-title">${title}</h2><p>This screen can show evidence supplied by the host. It does not make an identification, validate a result, or change any record.</p><button class="text-link" data-close>Close <span>→</span></button></section></div>`);
}

function render() {
  app.innerHTML = ({ today, archive, review, place })[route]();
  if (route === 'place') { refreshRuntimeStatus(); refreshNativeHostStatus(); syncInstallButton(); }
}
document.addEventListener('click', event => {
  const routeButton = event.target.closest('[data-route]');
  if (routeButton) { runtimeSubscription?.close(); runtimeSubscription = null; nativeHostUnsubscribe?.(); nativeHostUnsubscribe = null; route = routeButton.dataset.route; render(); return; }
  if (event.target.closest('#capture-plan') || event.target.closest('#runtime-retry')) { requestCapturePlan(); return; }
  if (event.target.closest('#install-app')) { requestInstallation(); return; }
  const openButton = event.target.closest('[data-open]');
  if (openButton) { modal(openButton.dataset.open); return; }
  if (event.target.closest('[data-close]')) { document.querySelector('.modal-backdrop')?.remove(); document.body.classList.remove('has-modal'); selected = null; }
});
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; syncInstallButton(); });
window.addEventListener('appinstalled', () => { installPrompt = null; syncInstallButton(); });

async function refreshRuntimeStatus() {
  const target = document.querySelector('#runtime-status');
  const config = runtimeConfigFromHost();
  if (!target) return;
  if (!config) {
    target.textContent = 'Runtime not connected';
    return;
  }
  try {
    const health = await new TraverseRuntimeClient(config).health();
    target.textContent = health.status === 'connected'
      ? `Traverse runtime connected · ${health.workspaceId}`
      : 'Traverse runtime unavailable';
    document.querySelector('#capture-plan').disabled = health.status !== 'connected';
  } catch {
    target.textContent = 'Traverse runtime configuration is invalid';
  }
}

async function refreshNativeHostStatus() {
  const target = document.querySelector('#native-host-status');
  if (!target) return;
  const bridge = nativeHostFromBridge();
  const availability = await recordingAvailability(bridge);
  target.textContent = availability.available
    ? 'Native recording host is available.'
    : `Native recording host unavailable${availability.reason ? ` · ${availability.reason.replaceAll('_', ' ')}` : ''}.`;
  nativeHostUnsubscribe?.();
  nativeHostUnsubscribe = subscribeRecordingEvents(bridge, event => appendRuntimeEvent(event));
}

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

async function requestCapturePlan() {
  const target = document.querySelector('#runtime-status');
  const button = document.querySelector('#capture-plan');
  const retry = document.querySelector('#runtime-retry');
  const config = runtimeConfigFromHost();
  if (!target || !button || !config) return;
  button.disabled = true;
  retry.hidden = true;
  target.textContent = 'Sending request to Traverse…';
  try {
    const result = await new TraverseRuntimeClient(config).dispatchCommand({ command: 'request_capture' });
    const view = commandResultView(result);
    target.textContent = view.state;
    appendRuntimeEvent({ type: 'command_accepted', state: view.state, detail: view.executionId ? `Execution ${view.executionId}` : '' });
    if (view.executionId) subscribeToRuntime(config, view.executionId);
  } catch (error) {
    target.textContent = `Runtime request unavailable · ${error.code ?? 'unknown_error'}`;
    retry.hidden = false;
  } finally {
    button.disabled = false;
  }
}

function subscribeToRuntime(config, executionId) {
  runtimeSubscription?.close();
  const client = new TraverseRuntimeClient(config);
  runtimeSubscription = client.subscribe({
    executionId,
    onMessage: appendRuntimeEvent,
    onError: () => appendRuntimeEvent({ type: 'connection_error', state: 'Event connection interrupted' }),
    onClose: ({ reason }) => reason && appendRuntimeEvent({ type: 'connection_closed', state: 'Event connection closed', detail: reason }),
  });
}

function appendRuntimeEvent(event) {
  const list = document.querySelector('#runtime-events');
  if (!list) return;
  list.querySelector('.is-empty')?.remove();
  const view = runtimeEventView(event);
  const item = document.createElement('li');
  item.className = 'runtime-event';
  const title = document.createElement('strong');
  title.textContent = view.state;
  const meta = document.createElement('span');
  meta.textContent = [view.sequence, view.type, view.detail].filter(Boolean).join(' · ');
  item.append(title, meta);
  list.prepend(item);
}

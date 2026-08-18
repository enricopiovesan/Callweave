import {
  closeDay,
  createDailyCanvasPlan,
  initializeLocation,
  manageKnowledge,
  manageObservation,
  planRecovery,
  prepareReview,
  resolveDetection,
  clusterUnknownEvidence,
  evaluateModelRelease,
  evaluatePrivacyGate,
} from '../../src/business-logic.mjs';
import { AppendOnlyState } from '../../src/append-only-state.mjs';

const actionList = document.getElementById('action-list');
const title = document.getElementById('title');
const detail = document.getElementById('detail');
const output = document.getElementById('output');
const statusLine = document.getElementById('status-line');
const runButton = document.getElementById('run-button');
const workspacePath = document.getElementById('workspace-path');

workspacePath.textContent = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');

const browserActions = [
  {
    id: 'pure-fixtures',
    title: 'Pure capability fixtures',
    detail: 'Runs the deterministic JSON fixture suite for pure business logic in the browser.',
    target: 'browser',
    run: runPureFixtures,
  },
  {
    id: 'business-logic-smoke',
    title: 'Business logic smoke',
    detail: 'Runs the broader smoke test over the shared business-logic modules in the browser.',
    target: 'browser',
    run: runBusinessLogicSmoke,
  },
  {
    id: 'traverse-contracts',
    title: 'Traverse contract validation',
    detail: 'Node-only today. The browser target cannot read and validate the Traverse draft files directly.',
    target: 'node-only',
  },
  {
    id: 'workflow-fixtures',
    title: 'Workflow fixtures',
    detail: 'Node-only today. The browser target does not execute the file-backed workflow fixture harness.',
    target: 'node-only',
  },
  {
    id: 'audio-analyzer-help',
    title: 'Audio analyzer help',
    detail: 'Node-only today. The browser target does not launch the local BirdNET/Perch CLI analyzer.',
    target: 'node-only',
  },
];

let selectedAction = browserActions[0];

renderActions();
renderSelection();

runButton.addEventListener('click', async () => {
  if (selectedAction.target !== 'browser') {
    statusLine.textContent = 'This check is not available in the browser target.';
    statusLine.className = 'status-line status-warn';
    output.textContent = 'Node-only check. Use the macOS app or local CLI for this action.';
    return;
  }

  runButton.disabled = true;
  statusLine.textContent = 'Running...';
  statusLine.className = 'status-line';
  output.textContent = '';

  try {
    const result = await selectedAction.run();
    statusLine.textContent = result.status;
    statusLine.className = `status-line ${result.ok ? 'status-good' : 'status-warn'}`;
    output.textContent = result.output;
  } catch (error) {
    statusLine.textContent = 'Run failed.';
    statusLine.className = 'status-line status-warn';
    output.textContent = `${error.stack ?? error.message}`;
  } finally {
    runButton.disabled = false;
  }
});

function renderActions() {
  actionList.innerHTML = '';
  for (const action of browserActions) {
    const button = document.createElement('button');
    button.className = `action-button${action.id === selectedAction.id ? ' active' : ''}`;
    button.type = 'button';
    button.addEventListener('click', () => {
      selectedAction = action;
      renderActions();
      renderSelection();
    });

    const meta = action.target === 'browser' ? 'Browser-supported' : 'Node-only';
    button.innerHTML = `
      <div class="action-title">${action.title}</div>
      <div class="action-detail">${action.detail}</div>
      <div class="action-meta">${meta}</div>
    `;
    actionList.appendChild(button);
  }
}

function renderSelection() {
  title.textContent = selectedAction.title;
  detail.textContent = selectedAction.detail;
  output.textContent = 'Select a check, then run it.';
  if (selectedAction.target === 'browser') {
    statusLine.textContent = '';
    runButton.disabled = false;
  } else {
    statusLine.textContent = 'Unavailable in the browser target.';
    statusLine.className = 'status-line status-warn';
    runButton.disabled = true;
  }
}

async function runPureFixtures() {
  const fixtureFiles = [
    'daily-close-duplicate-key.json',
    'daily-create-uncertainty.json',
    'detection-resolve-absent.json',
    'detection-resolve-uncalibrated.json',
    'knowledge-manage-denied.json',
    'location-initialize-sorted.json',
    'location-initialize-source-error.json',
    'observation-manage-invalid-verify.json',
    'observation-manage-revision.json',
    'operations-recover-missing.json',
  ];

  const capabilityMap = {
    'location-initialize': initializeLocation,
    'detection-resolve': resolveDetection,
    'observation-manage': manageObservation,
    'knowledge-manage': manageKnowledge,
    'daily-close': closeDay,
    'daily-create': createDailyCanvasPlan,
    'operations-recover': planRecovery,
  };

  let passed = 0;
  const lines = [];
  for (const file of fixtureFiles) {
    const fixture = await fetchJson(`../../fixtures/pure-capabilities/${file}`);
    const capability = capabilityMap[fixture.capability];
    if (!capability) throw new Error(`Unknown capability ${fixture.capability}`);

    if (fixture.expect_error) {
      let error = null;
      try {
        capability(fixture.input);
      } catch (caught) {
        error = caught;
      }
      if (!error || !new RegExp(fixture.expect_error).test(String(error.message))) {
        throw new Error(`${file}: expected error ${fixture.expect_error}`);
      }
      lines.push(`${file}: passed expected error`);
      passed += 1;
      continue;
    }

    const result = capability(fixture.input);
    for (const [path, expected] of Object.entries(fixture.expect)) {
      const actual = getPath(result, path);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${file}: ${path} expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    }
    lines.push(`${file}: passed`);
    passed += 1;
  }

  return {
    ok: true,
    status: 'Pure capability fixtures passed.',
    output: `${lines.join('\n')}\n\npure_capability_fixtures=passed count=${passed}`,
  };
}

async function runBusinessLogicSmoke() {
  const candidateSet = initializeLocation({
    location: { id: 'golden' },
    policy: { version: '1' },
    sources: [{ id: 's1', license: 'CC-BY', taxon: 'Aves example', status: 'expected' }],
  });
  assertEqual(candidateSet.candidates[0].status, 'expected', 'candidate set status');

  const uncalibrated = resolveDetection({
    evidence: { id: 'e1', hardware_compatible: true },
    candidate: candidateSet.candidates[0],
    policy: { version: '1', minimum_score_millis: 800 },
  });
  assertEqual(uncalibrated.state, 'unknown', 'uncalibrated state');

  const provisional = resolveDetection({
    evidence: { id: 'e2', hardware_compatible: true, calibrated_score_millis: 900 },
    candidate: candidateSet.candidates[0],
    policy: { version: '1', minimum_score_millis: 800 },
  });
  assertEqual(provisional.state, 'provisional', 'provisional state');
  assertEqual(manageObservation({ resolution: provisional, reviewer: { id: 'r1', decision: 'verify' } }).state, 'verified', 'verified observation');
  assertEqual(manageKnowledge({ proposal: { id: 'p1' }, approval: { reviewer_id: 'r1', decision: 'deny' } }).applied, false, 'denied knowledge');
  assertEqual(prepareReview({ cluster: { id: 'c1' }, privacy: { state: 'unknown' }, policy: { version: '1' } }).allowed, false, 'review gate');

  const close = closeDay({
    locationId: 'golden',
    localDate: '2026-08-17',
    coverage: 'partial',
    watermark: 'w1',
    policy: { version: '1' },
    observationIds: ['o1'],
    unknownIds: ['u1'],
  });
  if (!/^golden:/.test(close.idempotency_key)) throw new Error('close idempotency key');

  assertEqual(
    clusterUnknownEvidence({
      items: [{ id: 'u1', embedding: [1, 0] }, { id: 'u2', embedding: [0.99, 0.01] }, { id: 'u3', embedding: [0, 1] }],
      policy: { version: '1', minimum_cosine: 0.9 },
    }).length,
    2,
    'cluster count',
  );

  assertEqual(
    evaluateModelRelease({
      candidate: { id: 'm1', sha256: 'abc', license: 'Apache-2.0', status: 'verified' },
      evaluation: { held_out_precision_millis: 900, held_out_recall_millis: 850 },
      policy: { version: '1', minimum_precision_millis: 800, minimum_recall_millis: 800 },
    }).decision,
    'approve',
    'model release',
  );

  assertEqual(createDailyCanvasPlan({ close, policy: { version: '1' } }).visual_facts.uncertainty_millis, 500, 'canvas uncertainty');
  assertDeepEqual(planRecovery({ expectedIds: ['a', 'b'], completedIds: ['a'], policy: { version: '1' } }).replay_ids, ['b'], 'replay ids');
  assertEqual(
    evaluatePrivacyGate({
      cases: [{ contains_speech: true, risk_detected: true }, { contains_speech: false, risk_detected: true }],
      policy: { version: '1', minimum_speech_cases: 1, maximum_false_negative_millis: 0 },
    }).decision,
    'approve_for_policy',
    'privacy gate',
  );

  const state = new AppendOnlyState();
  const first = state.append({ type: 'observation', payload: { id: 'o1', state: 'provisional' }, idempotencyKey: 'request-1', timestamp: '2026-08-17T00:00:00Z' });
  assertEqual(first.replayed, false, 'first replay flag');
  assertEqual(
    state.append({ type: 'observation', payload: { id: 'o1', state: 'provisional' }, idempotencyKey: 'request-1', timestamp: '2026-08-17T00:00:00Z' }).replayed,
    true,
    'idempotent replay',
  );
  assertEqual(
    state.append({ type: 'observation', payload: { id: 'o1', state: 'verified' }, idempotencyKey: 'request-2', timestamp: '2026-08-17T00:01:00Z' }).previous_id,
    first.id,
    'previous id',
  );

  return {
    ok: true,
    status: 'Business logic smoke passed.',
    output: 'business_logic_smoke=passed',
  };
}

async function fetchJson(path) {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json();
}

function getPath(value, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], value);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
}

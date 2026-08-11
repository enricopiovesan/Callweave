import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const fixtureRoot = join(root, 'traverse', 'workflows', 'fixtures');
const workflow = JSON.parse(await readFile(join(root, 'traverse', 'workflows', 'daily-local-first.workflow.json'), 'utf8'));
const routes = new Map(workflow.routes.map((route) => [route.from, route]));
const fixtures = await Promise.all((await readdir(fixtureRoot)).filter((name) => name.endsWith('.json')).sort().map(async (name) => JSON.parse(await readFile(join(fixtureRoot, name), 'utf8'))));

const fail = (fixture, message) => { throw new Error(`${fixture.id}: ${message}`); };
const detectionEvents = new Map([
  ['provisional', 'callweave.detection.provisional-created'],
  ['unknown', 'callweave.detection.unknown-identified'],
  ['surprising', 'callweave.detection.surprising-quarantined'],
  ['rejected', 'callweave.detection.rejected'],
]);

for (const fixture of fixtures) {
  switch (fixture.kind) {
    case 'exclusive-detection-outcome': {
      const emitted = detectionEvents.get(fixture.input.resolution_state);
      if (!emitted || emitted !== fixture.expected.emitted_event_id) fail(fixture, 'resolution did not map to its one allowed event');
      if (fixture.expected.route && routes.get(emitted)?.capability !== fixture.expected.route) fail(fixture, 'event route differs from workflow');
      break;
    }
    case 'privacy-deny-no-export':
      if (fixture.input.export_status !== 'denied' || routes.get('callweave.privacy.protected')?.condition.includes('approved') !== true || fixture.expected.next_capability !== null) fail(fixture, 'denied privacy result could reach review preparation');
      break;
    case 'duplicate-daily-close': {
      const keys = new Set();
      for (const request of fixture.input.requests) keys.add(`${request.location_id}:${request.local_date}`);
      if (keys.size !== fixture.expected.daily_close_records) fail(fixture, 'duplicate close created more than one immutable record');
      break;
    }
    case 'late-evidence-creates-revision':
      if (!fixture.input.verified || routes.get('callweave.daily.revision-requested')?.capability !== 'callweave.daily-revise' || fixture.expected.revision_number !== fixture.input.previous_revision + 1) fail(fixture, 'verified late evidence did not create the next revision');
      break;
    case 'coverage-gap-canvas':
      if (fixture.input.coverage_state !== 'partial' || routes.get('callweave.daily.closed')?.capability !== 'callweave.daily-create' || fixture.expected.canvas_created !== true) fail(fixture, 'partial coverage failed to create a marked canvas');
      break;
    case 'restart-replay-idempotency':
      if (fixture.input.idempotency_key !== fixture.expected.persisted_idempotency_key || fixture.expected.result_count !== 1) fail(fixture, 'replay was not idempotent');
      break;
    default: fail(fixture, `unknown fixture kind ${fixture.kind}`);
  }
}

console.log(`Passed ${fixtures.length} deterministic workflow fixtures for ${workflow.id}.`);

import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  closeDay,
  createDailyCanvasPlan,
  initializeLocation,
  manageKnowledge,
  manageObservation,
  planRecovery,
  resolveDetection,
} from '../src/business-logic.mjs';

const root = new URL('..', import.meta.url).pathname;
const fixtureRoot = join(root, 'fixtures', 'pure-capabilities');

const capabilities = {
  'location-initialize': initializeLocation,
  'detection-resolve': resolveDetection,
  'observation-manage': manageObservation,
  'knowledge-manage': manageKnowledge,
  'daily-close': closeDay,
  'daily-create': createDailyCanvasPlan,
  'operations-recover': planRecovery,
};

const project = (value, paths) => Object.fromEntries(paths.map((path) => [path, getPath(value, path)]));
const getPath = (value, path) => path.split('.').reduce((current, segment) => current?.[segment], value);

const fixtureFiles = (await readdir(fixtureRoot)).filter((name) => name.endsWith('.json')).sort();
let passed = 0;

for (const file of fixtureFiles) {
  const fixture = JSON.parse(await readFile(join(fixtureRoot, file), 'utf8'));
  const capability = capabilities[fixture.capability];
  if (!capability) throw new Error(`${file}: unknown pure capability ${fixture.capability}`);

  if (fixture.expect_error) {
    assert.throws(() => capability(fixture.input), new RegExp(fixture.expect_error), `${file}: expected error`);
    passed += 1;
    continue;
  }

  const result = capability(fixture.input);
  assert.deepEqual(project(result, Object.keys(fixture.expect)), fixture.expect, `${file}: projected output mismatch`);
  passed += 1;
}

console.log(`pure_capability_fixtures=passed count=${passed}`);

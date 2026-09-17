import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  closeDay,
  createDailyCanvasPlan,
  evaluatePrivacyGate,
  normalizeInferenceEvidence,
  initializeLocation,
  manageKnowledge,
  manageObservation,
  planRecovery,
  resolveDetection,
} from '../src/business-logic.mjs';
import {
  validateModelManifest,
  validateInferenceRequest,
  normalizeInferenceResponse,
  evaluateModelCompatibility,
  evaluateModelArtifactPolicy,
} from '../src/model-execution.mjs';
import { evaluateSignalQuality, classifyActivityIntervals } from '../src/business-logic.mjs';

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
  'privacy-gate-evaluate': evaluatePrivacyGate,
  'inference-evidence-normalize': normalizeInferenceEvidence,
  'model-artifact-manifest-validate': validateModelManifest,
  'model-inference-request-validate': validateInferenceRequest,
  'model-inference-response-normalize': normalizeInferenceResponse,
  'model-compatibility-evaluate': evaluateModelCompatibility,
  'model-artifact-policy-evaluate': evaluateModelArtifactPolicy,
  'audio-signal-quality-evaluate': evaluateSignalQuality,
  'audio-activity-interval-classify': classifyActivityIntervals,
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

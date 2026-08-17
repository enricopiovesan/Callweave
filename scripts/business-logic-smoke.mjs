import assert from 'node:assert/strict';
import { closeDay, initializeLocation, manageKnowledge, manageObservation, prepareReview, resolveDetection } from '../src/business-logic.mjs';

const candidateSet = initializeLocation({ location: { id: 'golden' }, policy: { version: '1' }, sources: [{ id: 's1', license: 'CC-BY', taxon: 'Aves example', status: 'expected' }] });
assert.equal(candidateSet.candidates[0].status, 'expected');
const uncalibrated = resolveDetection({ evidence: { id: 'e1', hardware_compatible: true }, candidate: candidateSet.candidates[0], policy: { version: '1', minimum_score_millis: 800 } });
assert.equal(uncalibrated.state, 'unknown');
const provisional = resolveDetection({ evidence: { id: 'e2', hardware_compatible: true, calibrated_score_millis: 900 }, candidate: candidateSet.candidates[0], policy: { version: '1', minimum_score_millis: 800 } });
assert.equal(provisional.state, 'provisional');
assert.equal(manageObservation({ resolution: provisional, reviewer: { id: 'r1', decision: 'verify' } }).state, 'verified');
assert.equal(manageKnowledge({ proposal: { id: 'p1' }, approval: { reviewer_id: 'r1', decision: 'deny' } }).applied, false);
assert.equal(prepareReview({ cluster: { id: 'c1' }, privacy: { state: 'unknown' }, policy: { version: '1' } }).allowed, false);
assert.match(closeDay({ locationId: 'golden', localDate: '2026-08-17', coverage: 'partial', watermark: 'w1', policy: { version: '1' } }).idempotency_key, /^golden:/);
console.log('business_logic_smoke=passed');

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyBroadEvent } from '../src/broad-event-gate.mjs';

const config = JSON.parse(await readFile('config/broad-event-gate.json', 'utf8'));
const bird = classifyBroadEvent({ evidence: { labels: [{ display_name: 'Bird vocalization, bird call, bird song', mean_score: 0.79 }, { display_name: 'Water', mean_score: 0.2 }] }, rules: config.rules, threshold: config.threshold, minimumMargin: config.minimum_margin });
assert.equal(bird.status, 'route');
assert.equal(bird.event_family, 'bird');
const unknown = classifyBroadEvent({ evidence: { labels: [{ display_name: 'Music', mean_score: 0.8 }] }, rules: config.rules, threshold: config.threshold, minimumMargin: config.minimum_margin });
assert.equal(unknown.status, 'unknown');
const water = classifyBroadEvent({ evidence: { labels: [{ display_name: 'Water', mean_score: 0.8 }, { display_name: 'Animal', mean_score: 0.3 }] }, rules: config.rules, threshold: config.threshold, minimumMargin: config.minimum_margin });
assert.equal(water.event_family, 'environmental');
console.log('broad_event_gate=passed config_driven routing=fail_closed unknown=passed');

import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const output = '/private/tmp/callweave-calibration-report-smoke.json';
const run = spawnSync(process.execPath, [join(root, 'scripts', 'report_sound_sample_calibration.mjs'), output], { encoding: 'utf8' });
if (run.status !== 0) throw new Error(run.stderr || 'calibration report failed');
const report = JSON.parse(await readFile(output, 'utf8'));
if (report.kind !== 'acoustic_calibration_report') throw new Error('unexpected report kind');
if (report.policy !== 'descriptive_evidence_only_no_thresholds_selected') throw new Error('unsafe calibration policy');
if (report.sample_count < 4) throw new Error(`expected at least four fixtures, got ${report.sample_count}`);
if (!report.model_summary.some((model) => model.model_id === 'perch-v2-multitaxa-int8-arm')) throw new Error('Perch summary missing');
console.log(`calibration_report_smoke=passed samples=${report.sample_count} models=${report.model_summary.length}`);

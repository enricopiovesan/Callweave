import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wit = await readFile(path.join(root, 'traverse/recording-wit/recording-host.wit'), 'utf8');
const contract = JSON.parse(await readFile(path.join(root, 'traverse/recording-wit/capability-contract.json'), 'utf8'));

for (const signature of ['interface recording-host', 'status: func()', 'start: func(', 'stop: func(', 'events: func(', 'world recording-capability']) {
  if (!wit.includes(signature)) throw new Error(`Missing required WIT declaration: ${signature}`);
}
for (const forbidden of ['AVFoundation', 'CoreAudio', 'MediaRecorder', 'AudioRecord', 'android.', 'ios.']) {
  if (wit.includes(forbidden)) throw new Error(`Target-specific detail leaked into WIT: ${forbidden}`);
}
if (contract.host_import?.wit_package !== 'callweave:recording@0.1.0') throw new Error('Recording capability does not declare the expected WIT package.');
if (contract.execution_status !== 'blocked_on_traverse_wit_host_abi') throw new Error('Recording capability must accurately declare its runtime dependency.');
console.log('generic_recording_wit_contract=passed');

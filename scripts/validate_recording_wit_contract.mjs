import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wit = await readFile(path.join(root, 'traverse/recording-wit/recording-host.wit'), 'utf8');
const contract = JSON.parse(await readFile(path.join(root, 'traverse/recording-wit/capability-contract.json'), 'utf8'));

for (const signature of ['package traverse:platform@0.1.0', 'interface recording-host', 'status: func()', 'start: func(', 'stop: func(', 'events: func(', 'world recording-capability']) {
  if (!wit.includes(signature)) throw new Error(`Missing required WIT declaration: ${signature}`);
}
for (const forbidden of ['AVFoundation', 'CoreAudio', 'MediaRecorder', 'AudioRecord', 'android.', 'ios.']) {
  if (wit.includes(forbidden)) throw new Error(`Target-specific detail leaked into WIT: ${forbidden}`);
}
if (contract.host_import?.wit_package !== 'traverse:platform@0.1.0') throw new Error('Recording capability does not declare the Traverse-standard WIT package.');
if (contract.execution?.execution_profile !== 'component-wit-v1') throw new Error('Recording capability must declare the Component/WIT execution profile.');
const imports = contract.execution?.required_wit_imports;
if (!Array.isArray(imports) || imports.length !== 1 || imports[0]?.package !== 'traverse:platform' || imports[0]?.interface !== 'recording-host' || imports[0]?.version !== '0.1.0') {
  throw new Error('Recording capability must declare one exact Traverse recording-host import.');
}
if (contract.execution?.wit_bindings?.['traverse:platform/recording-host@0.1.0'] !== 'callweave-local-recording') {
  throw new Error('Recording capability must select the Callweave local recording binding explicitly.');
}
if (contract.execution_status !== 'awaiting_target_host_adapter') throw new Error('Recording capability must accurately declare its remaining target-host dependency.');
console.log('generic_recording_wit_contract=passed');

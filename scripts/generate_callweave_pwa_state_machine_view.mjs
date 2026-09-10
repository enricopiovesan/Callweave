import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'apps/callweave-pwa-runtime/app.manifest.json');
const outputPath = path.join(root, 'apps/CallweavePWA/runtime-state-machine.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const view = {
  app_id: manifest.app_id,
  app_version: manifest.version,
  initial_state: manifest.state_machine.initial_state,
  states: manifest.state_machine.states.map(({ id, invoke, transitions = [] }) => ({ id, invoke: invoke ?? null, transitions })),
};
const expected = `${JSON.stringify(view, null, 2)}\n`;

if (process.argv.includes('--check')) {
  if (await readFile(outputPath, 'utf8') !== expected) {
    throw new Error('PWA runtime state-machine view is stale. Run npm run traverse:pwa-runtime:view.');
  }
  console.log(`PWA runtime state-machine view is current (${view.states.length} states).`);
} else {
  await writeFile(outputPath, expected);
  console.log(`Generated PWA runtime state-machine view (${view.states.length} states).`);
}

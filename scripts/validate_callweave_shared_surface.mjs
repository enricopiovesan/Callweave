import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pwa = JSON.parse(await readFile(path.join(root, 'apps/callweave-pwa-runtime/app.manifest.json'), 'utf8'));
const surface = JSON.parse(await readFile(path.join(root, 'apps/callweave-shared-surface.json'), 'utf8'));

const fail = (message) => { throw new Error(message); };
const ids = new Set(surface.capabilities.map((entry) => entry.capability_id));
if (ids.size !== surface.capabilities.length) fail('Shared surface contains duplicate capability identifiers.');
for (const entry of surface.capabilities) {
  if (!entry.workflow_id.startsWith('callweave.foundation.')) fail(`Workflow namespace is not canonical: ${entry.workflow_id}`);
  if (!entry.registry.summary || entry.registry.use_cases.length === 0) fail(`Missing summary or use case for ${entry.capability_id}`);
}

const pwaCapability = pwa.state_machine.states.find((state) => state.id === 'planning')?.invoke?.capability_id;
if (!ids.has(pwaCapability)) fail(`PWA invokes ${pwaCapability}, which is not part of the shared surface.`);

console.log(`Validated ${surface.capabilities.length} shared capability/workflow pairs.`);
console.log(`PWA capture state machine delegates to the shared capability: ${pwaCapability}.`);

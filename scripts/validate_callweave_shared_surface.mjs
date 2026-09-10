import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const foundation = JSON.parse(await readFile(path.join(root, 'apps/callweave-foundation/app.manifest.json'), 'utf8'));
const pwa = JSON.parse(await readFile(path.join(root, 'apps/callweave-pwa-runtime/app.manifest.json'), 'utf8'));
const surface = JSON.parse(await readFile(path.join(root, 'apps/callweave-shared-surface.json'), 'utf8'));

const fail = (message) => { throw new Error(message); };
if (surface.source_app.app_id !== foundation.app_id || surface.source_app.version !== foundation.version) {
  fail('Shared surface does not match the Foundation manifest version.');
}
if (surface.capabilities.length !== foundation.components.length || surface.capabilities.length !== foundation.workflows.length) {
  fail('Shared surface must have exactly one capability and one workflow per Foundation declaration.');
}
const ids = new Set(surface.capabilities.map((entry) => entry.capability_id));
if (ids.size !== surface.capabilities.length) fail('Shared surface contains duplicate capability identifiers.');
for (const entry of surface.capabilities) {
  if (!entry.workflow_id.startsWith('callweave.foundation.')) fail(`Workflow namespace is not canonical: ${entry.workflow_id}`);
  if (!entry.registry.summary || entry.registry.use_cases.length === 0) fail(`Missing summary or use case for ${entry.capability_id}`);
}

const pwaCapability = pwa.state_machine.states.find((state) => state.id === 'planning')?.invoke?.capability_id;
if (!ids.has(pwaCapability)) fail(`PWA invokes ${pwaCapability}, which is not part of the shared surface.`);
const foundationCapability = foundation.state_machine.states.find((state) => state.id === 'planning')?.invoke?.capability_id;
if (pwaCapability !== foundationCapability) fail('PWA and Foundation capture commands invoke different capabilities.');

console.log(`Validated ${surface.capabilities.length} shared capability/workflow pairs.`);
console.log(`PWA capture state machine delegates to canonical capability: ${pwaCapability}.`);

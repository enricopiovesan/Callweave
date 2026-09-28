import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const traverseRoot = resolve(root, '..', 'Traverse');
const pwaRoot = join(root, 'apps', 'CallweavePWA');
const sourceBundle = join(root, 'apps', 'callweave-pwa-runtime');
const runtimeBundle = join(pwaRoot, 'runtime');
const vendorRoot = join(pwaRoot, 'vendor', 'traverse-embedder-web');
const macResources = join(root, 'apps', 'CallweaveMac', 'Sources', 'CallweaveMac', 'Resources', 'CallweaveRuntime');
const iosResources = join(root, 'apps', 'CallweaveIOS', 'CallweaveIOS', 'Resources', 'CallweaveRuntime');
const runtimeRoot = join(traverseRoot, 'examples', 'applications', 'audio-analysis', 'runtime');
const requestPrepareWasm = join(root, 'capabilities', 'inference.request-prepare', 'artifacts', 'request-prepare.wasm');
const embedderDist = join(root, 'node_modules', 'traverse-embedder-web', 'dist');

async function copy(source, target) {
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

await rm(runtimeBundle, { recursive: true, force: true });
await rm(vendorRoot, { recursive: true, force: true });
await rm(macResources, { recursive: true, force: true });
await rm(iosResources, { recursive: true, force: true });
await copy(sourceBundle, runtimeBundle);
await copy(runtimeRoot, join(runtimeBundle, 'runtime'));
await copy(requestPrepareWasm, join(runtimeBundle, 'components', 'inference-request-prepare', 'request-prepare.wasm'));
await copy(embedderDist, vendorRoot);
await copy(runtimeRoot, join(macResources, 'runtime'));
await copy(join(sourceBundle, 'app.manifest.json'), join(macResources, 'app.manifest.json'));
await copy(requestPrepareWasm, join(macResources, 'components', 'request-prepare.wasm'));
await copy(runtimeRoot, join(iosResources, 'runtime'));
await copy(join(sourceBundle, 'app.manifest.json'), join(iosResources, 'app.manifest.json'));
await copy(requestPrepareWasm, join(iosResources, 'components', 'request-prepare.wasm'));
console.log(JSON.stringify({ status: 'prepared', bundle: 'callweave.pwa@0.2.0', runtime: 'Traverse 0.13.0' }));

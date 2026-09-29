import { readFile } from 'node:fs/promises';
import { validateModelDependencies, modelRightsDisclosure } from '../src/model-dependency.mjs';

const valid = JSON.parse(await readFile(new URL('../fixtures/model-dependencies/valid-exact-ref.json', import.meta.url)));
const invalid = JSON.parse(await readFile(new URL('../fixtures/model-dependencies/invalid-rights.json', import.meta.url)));
const pins = validateModelDependencies([valid]);
if (pins[0].digest !== valid.digest || pins[0].target !== 'wasm-cpu') throw new Error('valid pin normalization failed');
if (modelRightsDisclosure(valid).commercial_use !== 'allowed') throw new Error('rights disclosure failed');
let rejected = false;
try { validateModelDependencies([invalid]); } catch { rejected = true; }
if (!rejected) throw new Error('invalid rights pin was accepted');
console.log('model_dependency_pin=passed valid=1 invalid=1');

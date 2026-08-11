import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const base = join(root, 'traverse', 'contracts', 'callweave');
const expectedReasons = new Set(['ok', 'invalid_input', 'dependency_unavailable', 'policy_denied']);
const requiredTopLevel = [
  'kind', 'schema_version', 'id', 'namespace', 'name', 'version', 'lifecycle',
  'owner', 'summary', 'description', 'use_cases', 'inputs', 'outputs',
  'preconditions', 'postconditions', 'side_effects', 'emits', 'consumes',
  'permissions', 'execution', 'policies', 'dependencies', 'provenance',
  'evidence', 'state_schema', 'service_type', 'permitted_targets',
];

const entries = await readdir(base, { withFileTypes: true });
const failures = [];
for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
  const file = join(base, entry.name, 'contract.json');
  const contract = JSON.parse(await readFile(file, 'utf8'));
  for (const key of requiredTopLevel) if (!(key in contract)) failures.push(`${file}: missing ${key}`);
  if (contract.kind !== 'capability_contract') failures.push(`${file}: invalid kind`);
  if (contract.lifecycle !== 'draft') failures.push(`${file}: must remain draft until WASM evidence exists`);
  if (contract.inputs.schema.additionalProperties !== false || contract.outputs.schema.additionalProperties !== false) failures.push(`${file}: schemas must be strict`);
  const reasons = new Set(contract.use_cases.map((useCase) => useCase.output_example.reason_code));
  for (const reason of expectedReasons) if (!reasons.has(reason)) failures.push(`${file}: missing use case for ${reason}`);
  if (!contract.use_cases.some((useCase) => useCase.happy)) failures.push(`${file}: missing happy path`);
  if (!contract.use_cases.some((useCase) => !useCase.happy)) failures.push(`${file}: missing unhappy path`);
  if (!contract.state_schema || !contract.state_schema.properties?.trace_ref) failures.push(`${file}: local state trace schema missing`);
  if (contract.execution.constraints.host_api_access === 'exception_required' && !(contract.provenance.exception_refs || []).includes('callweave-host-adapter-boundary')) failures.push(`${file}: host exception missing`);
}

if (entries.filter((entry) => entry.isDirectory()).length !== 15) failures.push('expected exactly 15 Callweave capability contracts');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Validated 15 strict draft Callweave Traverse contracts with happy/unhappy paths and local-state boundaries.');

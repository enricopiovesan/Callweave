import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const base = join(root, 'traverse', 'contracts', 'callweave');
const eventBase = join(root, 'traverse', 'events', 'callweave');
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
  if (contract.domain_schema_ref !== 'schemas/domain-records.schema.json') failures.push(`${file}: shared domain schema reference missing`);
  if (contract.state_ownership?.model !== 'host-owned-local-store') failures.push(`${file}: local state ownership missing`);
  if (contract.evidence.length !== 0) failures.push(`${file}: draft contract must not claim validation evidence`);
  for (const useCase of contract.use_cases) {
    const context = useCase.input_example.runtime_context;
    if (!context) failures.push(`${file}: use case lacks runtime_context`);
    if (useCase.output_example.reason_code === 'invalid_input' && context?.input_reference_state !== 'unresolvable') failures.push(`${file}: invalid_input use case lacks unresolvable reference`);
    if (useCase.output_example.reason_code === 'dependency_unavailable' && context?.dependency_state !== 'unavailable') failures.push(`${file}: dependency use case lacks unavailable dependency`);
    if (useCase.output_example.reason_code === 'policy_denied' && context?.policy_state !== 'denied') failures.push(`${file}: policy use case lacks denied policy`);
  }
  if (contract.execution.constraints.host_api_access === 'exception_required' && !(contract.provenance.exception_refs || []).includes('callweave-host-adapter-boundary')) failures.push(`${file}: host exception missing`);
  if (contract.id === 'callweave.detection-resolve') {
    const states = new Set(contract.use_cases.filter((useCase) => useCase.output_example.reason_code === 'ok').map((useCase) => useCase.output_example.resolution_state));
    for (const state of ['provisional', 'unknown', 'surprising', 'rejected']) if (!states.has(state)) failures.push(`${file}: missing successful ${state} routing fixture`);
    if (!contract.outputs.schema.required.includes('emitted_event_id')) failures.push(`${file}: missing exclusive emitted event result`);
  }
}

if (entries.filter((entry) => entry.isDirectory()).length !== 19) failures.push('expected exactly 19 Callweave capability contracts');
const eventEntries = await readdir(eventBase, { withFileTypes: true });
if (eventEntries.filter((entry) => entry.isDirectory()).length !== 23) failures.push('expected exactly 23 Callweave event contracts');
for (const entry of eventEntries.filter((candidate) => candidate.isDirectory())) {
  const file = join(eventBase, entry.name, 'contract.json');
  const event = JSON.parse(await readFile(file, 'utf8'));
  if (event.id !== `${event.namespace}.${event.name}`) failures.push(`${file}: identity mismatch`);
  if (event.lifecycle !== 'draft') failures.push(`${file}: must remain draft until packages exist`);
  if (event.evidence.length !== 0) failures.push(`${file}: draft event must not claim validation evidence`);
  if (!event.payload?.schema?.properties?.result_ref) failures.push(`${file}: typed result reference missing`);
}
const workflow = JSON.parse(await readFile(join(root, 'traverse', 'workflows', 'daily-local-first.workflow.json'), 'utf8'));
if (workflow.routes.length < 10 || !workflow.fixtures_required.includes('duplicate-daily-close')) failures.push('workflow lacks required routing or idempotency fixture');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Validated 19 strict draft Callweave Traverse contracts, 23 typed draft event contracts, and the daily local-first workflow specification.');

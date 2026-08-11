import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const contractRoot = join(root, 'traverse', 'contracts', 'callweave');
const personaRoot = join(root, 'traverse', 'personas');

const personas = [
  ['callweave-location-owner', 'Location Owner', 'Creates a private location profile and owns location-specific wildlife data.'],
  ['callweave-field-operator', 'Field Operator', 'Installs, calibrates, and maintains recording hardware.'],
  ['callweave-reviewer', 'Reviewer', 'Reviews acoustic evidence, uncertain observations, and knowledge proposals.'],
  ['callweave-artist', 'Artist', 'Uses evidence-backed ecological summaries to create daily artwork.'],
  ['callweave-system-administrator', 'System Administrator', 'Manages models, local storage, recovery, exports, and release safety.'],
  ['callweave-runtime', 'Callweave Runtime', 'Executes governed capabilities deterministically and records traces.'],
];

const caps = [
  {
    name: 'location-initialize', owner: 'callweave-location-owner', targets: ['local', 'edge'],
    constraints: ['exception_required', 'required', 'sandbox_only'],
    summary: 'Create a private, source-backed location profile and candidate-species set.',
    description: 'Resolves a location, classifies privacy, derives habitat, imports permitted occurrence sources, normalizes taxonomy, records source licenses, builds a seasonal candidate set, and versions the resulting location profile. The host supplies network and sandboxed local storage adapters; the portable policy kernel must not embed source-provider credentials or URLs.',
    fields: ['location_input', 'candidate_source_policy'],
    result: 'location_profile_ref', model: [],
  },
  {
    name: 'audio-source-configure', owner: 'callweave-field-operator', targets: ['device', 'local'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Register, validate, calibrate, and configure an audio source.',
    description: 'Registers a microphone, validates audible or ultrasonic capability, configures the recording profile, calibrates levels, and checks clock accuracy. The host owns hardware access; this contract records a device configuration decision and never treats lack of ultrasonic hardware as evidence that bats are absent.',
    fields: ['audio_source', 'recording_profile'], result: 'audio_source_ref', model: [],
  },
  {
    name: 'audio-capture', owner: 'callweave-field-operator', targets: ['device', 'local'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Capture, finalize, validate, and retain lossless audio recordings.',
    description: 'Captures audio from a configured source, rotates 15-minute master files, finalizes them atomically, validates integrity, and applies retention policy. Audio capture and file writes are host adapters; the governed result is a durable recording reference with checksum and coverage state.',
    fields: ['audio_source_ref', 'capture_window'], result: 'recording_ref', model: [],
  },
  {
    name: 'audio-prepare', owner: 'callweave-runtime', targets: ['local', 'browser', 'edge'],
    constraints: ['none', 'forbidden', 'sandbox_only'],
    summary: 'Create model-ready windows and evidence assets from an immutable recording.',
    description: 'Creates model-specific windows, resamples audio, generates spectrograms, measures soundscape quality, and extracts proof clips. The master recording remains immutable. Deterministic DSP is preferred; any optional quality model must be declared separately and cannot change source audio.',
    fields: ['recording_ref', 'preparation_profile'], result: 'prepared_audio_ref', model: [],
  },
  {
    name: 'privacy-protect', owner: 'callweave-location-owner', targets: ['local', 'browser'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Detect speech risk and create a safe review-package asset set.',
    description: 'Detects likely human speech and removes precise location and blocked assets before an external review package can be created. It fails closed: uncertain or unavailable privacy analysis prevents external sharing unless a reviewer uses an explicit approved override.',
    fields: ['asset_refs', 'privacy_policy'], result: 'sanitized_asset_set_ref', model: ['callweave.speech-privacy-v1'],
  },
  {
    name: 'model-manage', owner: 'callweave-system-administrator', targets: ['local', 'browser', 'edge'],
    constraints: ['exception_required', 'required', 'sandbox_only'],
    summary: 'Verify, cache, and select local model artifacts without ambient provider access.',
    description: 'Verifies checksums, compatibility, model manifests, licenses, and local cache state. Model downloads occur through a narrow host adapter; model providers, URLs, credentials, and SDKs are never embedded in a portable capability.',
    fields: ['model_artifact', 'model_policy'], result: 'model_availability_ref', model: [],
  },
  {
    name: 'acoustics-classify', owner: 'callweave-runtime', targets: ['local', 'browser', 'device'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Produce local acoustic evidence and embeddings from prepared audio.',
    description: 'Detects biological sound and runs only the model implementation selected by explicit metadata: Perch for broad audible wildlife, BirdNET for birds, and a regional bat model only for compatible ultrasonic sources. It outputs ranked evidence and embeddings, never verified observations. Runtime selection must remain deterministic when basic and AI-enhanced implementations coexist.',
    fields: ['prepared_audio_ref', 'model_selection'], result: 'acoustic_evidence_ref', model: ['callweave.perch-v2-audible', 'callweave.birdnet-v2.4', 'callweave.bat-regional-v1'],
  },
  {
    name: 'detection-resolve', owner: 'callweave-runtime', targets: ['local', 'browser', 'edge', 'cloud'],
    constraints: ['none', 'forbidden', 'none'],
    summary: 'Resolve model evidence through deterministic ecological and hardware policy.',
    description: 'Scores plausibility, applies range/season and hardware filters, evaluates model agreement, aggregates repeat detections, quarantines surprising biological evidence, and resolves the result into a governed observation state. This is the authority boundary: it preserves rare evidence but rejects impossible hardware claims.',
    fields: ['acoustic_evidence_ref', 'resolution_context'], result: 'resolution_ref', model: [],
  },
  {
    name: 'observation-manage', owner: 'callweave-reviewer', targets: ['local', 'browser', 'edge'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Create, evidence, verify, correct, or reject versioned wildlife observations.',
    description: 'Creates traceable observations, attaches evidence, and applies reviewer-controlled verification, correction, or rejection. Storage is host-owned and append-only: corrections supersede history rather than overwrite it, and verified observations cannot be silently downgraded.',
    fields: ['resolution_ref', 'review_decision'], result: 'observation_ref', model: [],
  },
  {
    name: 'unknown-organize', owner: 'callweave-reviewer', targets: ['local', 'browser'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Retain, cluster, and curate uncertain biological sound evidence.',
    description: 'Identifies unknown evidence, clusters compatible embeddings, selects representative clips, and lets reviewers merge or split clusters. It is local-only; clustering changes never erase raw evidence or substitute a taxonomic claim.',
    fields: ['unknown_evidence_refs', 'clustering_policy'], result: 'unknown_cluster_ref', model: ['callweave.perch-v2-audible'],
  },
  {
    name: 'review-prepare', owner: 'callweave-reviewer', targets: ['local', 'browser'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Prepare and validate an advisory LMM review exchange for unknown sound clusters.',
    description: 'Builds a sanitized ZIP, creates a strict review prompt, parses an LMM response, and validates the response against taxonomy, locality, season, hardware, schema, and provenance. The advisor is optional and external; it may only propose actions. It cannot access local storage or mutate knowledge.',
    fields: ['unknown_cluster_ref', 'review_policy'], result: 'review_proposal_ref', model: ['traverse.inference.generate'],
  },
  {
    name: 'knowledge-manage', owner: 'callweave-reviewer', targets: ['local', 'browser', 'edge'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Version and approve local wildlife knowledge with human authority.',
    description: 'Creates and approves knowledge proposals, updates candidate sets, adds verified reference clips, versions the candidate database, and records provenance. Only an authenticated reviewer decision can promote knowledge to confirmed or a clip to reference status.',
    fields: ['knowledge_proposal_ref', 'approval_decision'], result: 'knowledge_version_ref', model: [],
  },
  {
    name: 'model-improve', owner: 'callweave-system-administrator', targets: ['local', 'device'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Train, evaluate, publish, or roll back a local wildlife-model adapter.',
    description: 'Builds verified licensed training sets, trains a local adapter over approved embeddings, evaluates it against a held-out set, publishes a passing model version, or rolls back a harmful release. This capability is deferred until sufficient verified data exists and never trains from LMM-only suggestions.',
    fields: ['training_request', 'model_release_policy'], result: 'model_release_ref', model: ['callweave.perch-v2-audible'],
  },
  {
    name: 'daily-create', owner: 'callweave-artist', targets: ['local', 'browser'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Build and archive an explainable daily ecological canvas.',
    description: 'Builds the daily ecology summary, maps evidence and uncertainty to visual parameters, renders the canvas, and archives the artifact. P0 uses deterministic rendering; a future creative model is an optional separately governed implementation and cannot hide uncertainty.',
    fields: ['daily_evidence_scope', 'visual_mapping_policy'], result: 'daily_canvas_ref', model: [],
  },
  {
    name: 'operations-recover', owner: 'callweave-system-administrator', targets: ['local', 'edge', 'cloud'],
    constraints: ['exception_required', 'required', 'sandbox_only'],
    summary: 'Monitor, recover, reprocess, export, and back up governed Callweave state.',
    description: 'Monitors pipeline health, recovers interrupted work idempotently, backfills/reprocesses recordings, exports privacy-filtered data, and verifies encrypted backups. Host adapters own storage, networking, and backup destinations; outputs always retain a trace and coverage status.',
    fields: ['operations_request', 'operations_policy'], result: 'operations_report_ref', model: [],
  },
];

const eventLinks = {
  'location-initialize': { emits: ['location.initialized'], consumes: [] },
  'audio-source-configure': { emits: ['audio.source-configured'], consumes: ['location.initialized'] },
  'audio-capture': { emits: ['audio.recording-finalized'], consumes: ['audio.source-configured'] },
  'audio-prepare': { emits: ['audio.prepared'], consumes: ['audio.recording-finalized'] },
  'privacy-protect': { emits: ['privacy.protected'], consumes: ['audio.prepared'] },
  'model-manage': { emits: ['model.availability-changed'], consumes: [] },
  'acoustics-classify': { emits: ['acoustic.evidence-produced'], consumes: ['audio.prepared', 'model.availability-changed'] },
  'detection-resolve': { emits: ['detection.resolved'], consumes: ['acoustic.evidence-produced'] },
  'observation-manage': { emits: ['observation.managed'], consumes: ['detection.resolved'] },
  'unknown-organize': { emits: ['unknown.organized'], consumes: ['detection.resolved'] },
  'review-prepare': { emits: ['review.proposal-validated'], consumes: ['unknown.organized', 'privacy.protected'] },
  'knowledge-manage': { emits: ['knowledge.versioned'], consumes: ['review.proposal-validated'] },
  'model-improve': { emits: ['model.release-evaluated'], consumes: ['observation.managed', 'knowledge.versioned'] },
  'daily-create': { emits: ['daily.canvas-created'], consumes: ['observation.managed', 'unknown.organized', 'knowledge.versioned'] },
  'operations-recover': { emits: ['operations.reported'], consumes: [] },
};

const events = Object.entries(eventLinks)
  .flatMap(([capability, links]) => links.emits.map((name) => ({ name, publisher: capability })))
  .map(({ name, publisher }) => ({
    id: `callweave.${name}`, name: name.split('.').at(-1), publisher,
    subscribers: Object.entries(eventLinks).filter(([, links]) => links.consumes.includes(name)).map(([capability]) => capability),
  }));

const fieldSchema = (field) => ({
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
    version: { type: 'string' },
    metadata: { type: 'object', additionalProperties: false, properties: {} },
  },
  additionalProperties: false,
});

function contract(cap) {
  const id = `callweave.${cap.name}`;
  const [host_api_access, network_access, filesystem_access] = cap.constraints;
  const inputProperties = {
    request_id: { type: 'string', minLength: 1 },
    workspace_id: { type: 'string', minLength: 1 },
    location_id: { type: 'string', minLength: 1 },
    idempotency_key: { type: 'string', minLength: 1 },
    runtime_context: {
      type: 'object', required: ['input_reference_state', 'dependency_state', 'policy_state'],
      properties: {
        input_reference_state: { type: 'string', enum: ['resolvable', 'unresolvable'] },
        dependency_state: { type: 'string', enum: ['available', 'unavailable'] },
        policy_state: { type: 'string', enum: ['allowed', 'denied'] },
      }, additionalProperties: false,
    },
    ...Object.fromEntries(cap.fields.map((field) => [field, fieldSchema(field)])),
  };
  const inputExample = Object.fromEntries([
    ['request_id', `${cap.name}-happy-001`],
    ['workspace_id', 'local-default'],
    ['location_id', 'golden-bc-demo'],
    ['idempotency_key', `${cap.name}-idempotency-001`],
    ['runtime_context', { input_reference_state: 'resolvable', dependency_state: 'available', policy_state: 'allowed' }],
    ...cap.fields.map((field) => [field, { id: `${field}-001`, version: '1.0.0', metadata: {} }]),
  ]);
  const reasonCodes = ['ok', 'invalid_input', 'dependency_unavailable', 'policy_denied'];
  const statuses = ['completed', 'rejected', 'deferred', 'rejected'];
  const scenarios = [
    [`As a ${personas.find(([id]) => id === cap.owner)[1]}, I want ${cap.summary.toLowerCase()} so that the governed workflow can continue with traceable evidence.`, true],
    [`As the Callweave Runtime, I want malformed or incomplete input rejected so that this capability fails closed before creating state.`, false],
    [`As a System Administrator, I want unavailable required host/model dependencies reported explicitly so that the workflow can defer or use an approved fallback.`, false],
    [`As a Reviewer, I want policy-prohibited work denied without side effects so that privacy, hardware, and approval boundaries remain authoritative.`, false],
  ];
  const contexts = [
    { input_reference_state: 'resolvable', dependency_state: 'available', policy_state: 'allowed' },
    { input_reference_state: 'unresolvable', dependency_state: 'available', policy_state: 'allowed' },
    { input_reference_state: 'resolvable', dependency_state: 'unavailable', policy_state: 'allowed' },
    { input_reference_state: 'resolvable', dependency_state: 'available', policy_state: 'denied' },
  ];
  const use_cases = reasonCodes.map((reason_code, index) => ({
    scenario: scenarios[index][0],
    input_example: { ...inputExample, request_id: `${cap.name}-${index === 0 ? 'happy' : 'failure'}-00${index + 1}`, idempotency_key: `${cap.name}-idempotency-00${index + 1}`, runtime_context: contexts[index] },
    output_example: {
      status: statuses[index],
      reason_code,
      [cap.result]: index === 0 ? `${cap.name}-result-001` : null,
      trace_ref: `${cap.name}-trace-00${index + 1}`,
      warnings: index === 0 ? [] : [reason_code],
    },
    happy: scenarios[index][1],
    persona_ref: index === 0 ? cap.owner : index === 3 ? 'callweave-reviewer' : 'callweave-system-administrator',
  }));
  return {
    kind: 'capability_contract', schema_version: '1.0.0', id, namespace: 'callweave', name: cap.name,
    version: '0.1.0', lifecycle: 'draft',
    owner: { team: 'callweave', contact: 'maintainers@callweave.local' },
    summary: cap.summary,
    description: `${cap.description}\n\nImplementation status: contract-first. A WASM component/agent will be generated after contract approval. The host provides only the declared adapter authority.\n\nUse-case coverage: one happy path plus invalid-input, dependency-unavailable, and policy-denied unhappy paths.`,
    use_cases,
    inputs: { schema: { type: 'object', required: ['request_id', 'workspace_id', 'location_id', 'idempotency_key', ...cap.fields], properties: inputProperties, additionalProperties: false } },
    outputs: { schema: { type: 'object', required: ['status', 'reason_code', cap.result, 'trace_ref', 'warnings'], properties: {
      status: { type: 'string', enum: ['completed', 'rejected', 'deferred'] },
      reason_code: { type: 'string', enum: reasonCodes },
      [cap.result]: { type: ['string', 'null'] },
      trace_ref: { type: 'string' },
      warnings: { type: 'array', items: { type: 'string' } },
    }, additionalProperties: false } },
    preconditions: [
      { id: 'idempotency-key-present', description: 'idempotency_key is present and scoped to the workspace.' },
      { id: 'input-references-resolvable', description: 'All input references resolve in the host-owned local store before side effects.' },
    ],
    postconditions: [
      { id: 'trace-produced', description: 'Every completed, rejected, or deferred outcome has a trace_ref.' },
      { id: 'no-silent-authority-escalation', description: 'Undeclared network, filesystem, model, and approval authority is never used.' },
    ],
    side_effects: [{ kind: 'state_change', description: 'Any persistent state, device I/O, network operation, or model invocation is performed only by an explicitly declared host adapter.' }],
    emits: eventLinks[cap.name].emits.map((event_id) => ({ event_id: `callweave.${event_id}`, version: '0.1.0' })),
    consumes: eventLinks[cap.name].consumes.map((event_id) => ({ event_id: `callweave.${event_id}`, version: '0.1.0' })), permissions: [{ id: `${id}.execute` }],
    execution: { binary_format: 'wasm', entrypoint: { kind: 'wasi-command', command: 'run' }, preferred_targets: cap.targets, constraints: { host_api_access, network_access, filesystem_access } },
    policies: [
      { id: 'local-first' }, { id: 'fail-closed-on-invalid-or-unsafe' }, { id: 'append-only-provenance' }, { id: 'human-approval-for-durable-knowledge' },
    ],
    dependencies: [],
    provenance: { source: 'ai-assisted', author: 'Callweave architecture record', created_at: '2026-08-11T00:00:00Z', spec_ref: 'callweave-decision-record@1.0.0', adr_refs: ['DECISION_RECORD.md'], exception_refs: host_api_access === 'exception_required' ? ['callweave-host-adapter-boundary'] : [] },
    evidence: [],
    state_schema: {
      type: 'object',
      required: ['workspace_id', 'trace_ref'],
      properties: {
        workspace_id: { type: 'string' },
        trace_ref: { type: 'string' },
        updated_at: { type: 'string' },
        payload_ref: { type: 'string' },
      },
      additionalProperties: false,
    },
    service_type: 'stateless', permitted_targets: cap.targets,
  };
}

for (const event of events) {
  const eventParts = event.id.split('.');
  const name = eventParts.at(-1);
  const namespace = eventParts.slice(0, -1).join('.');
  const path = join(root, 'traverse', 'events', 'callweave', event.name, 'contract.json');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({
    kind: 'event_contract', schema_version: '1.0.0', id: event.id, namespace, name,
    version: '0.1.0', lifecycle: 'draft', owner: { team: 'callweave', contact: 'maintainers@callweave.local' },
    summary: `Callweave ${event.name} domain event.`,
    description: `Stable domain fact emitted after callweave.${event.publisher} completes. Draft until its publishers and subscribers are backed by active WASM packages.`,
    payload: { schema: { type: 'object', required: ['workspace_id', 'location_id', 'trace_ref', 'result_ref'], properties: { workspace_id: { type: 'string' }, location_id: { type: 'string' }, trace_ref: { type: 'string' }, result_ref: { type: 'string' } }, additionalProperties: false }, compatibility: 'backward-compatible' },
    classification: { domain: 'callweave', bounded_context: event.name.split('-')[0], event_type: 'domain', tags: ['callweave', 'local-first'] },
    publishers: [{ capability_id: `callweave.${event.publisher}`, version: '0.1.0' }],
    subscribers: event.subscribers.map((capability_id) => ({ capability_id: `callweave.${capability_id}`, version: '0.1.0' })),
    policies: [{ id: 'append-only-provenance' }], tags: ['callweave'],
    provenance: { source: 'ai-generated', author: 'Callweave architecture record', created_at: '2026-08-11T00:00:00Z' }, evidence: [],
  }, null, 2)}\n`);
}

for (const [id, name, description] of personas) {
  const path = join(personaRoot, id, '1.0.0', 'persona.json');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ kind: 'persona', schema_version: '1.0.0', id, version: '1.0.0', name, summary: description }, null, 2)}\n`);
}

for (const cap of caps) {
  const path = join(contractRoot, cap.name, 'contract.json');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(contract(cap), null, 2)}\n`);
}

const inventory = caps.map((cap) => ({
  capability_id: `callweave.${cap.name}`,
  contract: `contracts/callweave/${cap.name}/contract.json`,
  lifecycle: 'draft',
  wasm_status: 'not-generated',
  model_interfaces: cap.model,
}));
const inventoryPath = join(root, 'traverse', 'capability-inventory.json');
await mkdir(dirname(inventoryPath), { recursive: true });
await writeFile(inventoryPath, `${JSON.stringify({ schema_version: '1.0.0', capabilities: inventory }, null, 2)}\n`);

const implementationPlan = {
  schema_version: '1.0.0',
  status: 'contract-first-no-wasm-artifacts-yet',
  rule: 'Local classifiers are future WASM implementation modules. The only LMM dependency is the optional advisory interface traverse.inference.generate, resolved by the runtime rather than hard-coded by a WASM guest.',
  modules: [
    { id: 'callweave.perch-v2-audible', kind: 'local_wasm_model', capabilities: ['callweave.acoustics-classify', 'callweave.unknown-organize', 'callweave.model-improve'], input: 'prepared audible audio / embeddings', authority: 'evidence only' },
    { id: 'callweave.birdnet-v2.4', kind: 'local_wasm_model', capabilities: ['callweave.acoustics-classify'], input: '48 kHz audible audio', authority: 'evidence only' },
    { id: 'callweave.bat-regional-v1', kind: 'local_wasm_model', capabilities: ['callweave.acoustics-classify'], input: '256 kHz+ ultrasonic audio', authority: 'evidence only' },
    { id: 'callweave.speech-privacy-v1', kind: 'local_wasm_model', capabilities: ['callweave.privacy-protect'], input: 'audible audio', authority: 'privacy-risk spans only' },
    { id: 'callweave.unknown-review-advisor', kind: 'runtime_resolved_lmm_agent', capabilities: ['callweave.review-prepare'], model_dependency: 'traverse.inference.generate', input: 'sanitized review package only', authority: 'proposal only' },
  ],
};
const planPath = join(root, 'traverse', 'wasm', 'implementation-plan.json');
await mkdir(dirname(planPath), { recursive: true });
await writeFile(planPath, `${JSON.stringify(implementationPlan, null, 2)}\n`);

console.log(`Generated ${caps.length} capability contracts and ${personas.length} personas.`);

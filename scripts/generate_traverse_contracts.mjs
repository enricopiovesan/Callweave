import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const contractRoot = join(root, 'traverse', 'contracts', 'callweave');
const personaRoot = join(root, 'traverse', 'personas');
const schemaRoot = join(root, 'traverse', 'schemas');

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
    description: 'Registers an audible microphone, validates its capability, configures the recording profile, calibrates levels, and checks clock accuracy. The host owns hardware access.',
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
    name: 'coverage-assess', owner: 'callweave-system-administrator', targets: ['local', 'edge', 'cloud'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Assess recording, source, model, and processing coverage for a bounded local day.',
    description: 'Builds a coverage record from expected/captured/valid recording minutes, source health, model availability, processing completion, and quality distribution. It distinguishes ecological quiet from incomplete evidence and is durable input to daily closure and artwork.',
    fields: ['coverage_scope', 'coverage_policy'], result: 'coverage_report_ref', model: [],
  },
  {
    name: 'evidence-retain', owner: 'callweave-system-administrator', targets: ['local', 'edge', 'cloud'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Classify evidence retention and safe deletion eligibility without losing reproducibility.',
    description: 'Assigns retention class, reference counts, review/legal hold, and earliest safe deletion time to recordings, clips, spectrograms, and review assets. It cannot delete data; deletion is a separately authorized host operation after this capability proves no active dependency remains.',
    fields: ['asset_lifecycle_scope', 'retention_policy'], result: 'retention_decision_ref', model: [],
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
    description: 'Detects biological sound and runs only the model implementation selected by explicit metadata: Perch for broad audible wildlife and BirdNET for birds. It outputs ranked evidence and embeddings, never verified observations. Runtime selection must remain deterministic when basic and AI-enhanced implementations coexist.',
    fields: ['prepared_audio_ref', 'model_selection'], result: 'acoustic_evidence_ref', model: ['callweave.perch-v2-audible', 'callweave.birdnet-v2.4'],
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
    description: 'Builds the daily ecology summary from one immutable daily-close record, maps evidence, coverage, and uncertainty to visual parameters, renders the canvas, and archives the artifact. The idempotency key is location plus local date. Corrections create a visible revision, not a silent replacement. P0 uses deterministic rendering.',
    fields: ['daily_close_ref', 'visual_mapping_policy'], result: 'daily_canvas_ref', model: [],
  },
  {
    name: 'daily-revise', owner: 'callweave-artist', targets: ['local', 'browser'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Create a visible immutable revision of a completed daily ecological canvas.',
    description: 'Renders a numbered successor to an existing daily canvas after a verified correction or a previously unavailable coverage/evidence fact becomes available. It preserves the prior artifact, records the reason and source trace, and cannot silently replace a published canvas.',
    fields: ['daily_revision_request', 'visual_mapping_policy'], result: 'daily_canvas_revision_ref', model: [],
  },
  {
    name: 'daily-close', owner: 'callweave-runtime', targets: ['local', 'edge', 'cloud'],
    constraints: ['exception_required', 'forbidden', 'sandbox_only'],
    summary: 'Close one timezone-aware local day exactly once with a coverage watermark.',
    description: 'Runs from a host scheduler after the configured local-day grace period. It reads versioned coverage, observation, unknown, and operations state; writes an immutable daily-close record keyed by location and local date; and emits the sole normal trigger for the daily canvas. It records a coverage gap rather than treating a failed day as ecological silence.',
    fields: ['daily_close_request', 'daily_close_policy'], result: 'daily_close_ref', model: [],
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
  'coverage-assess': { emits: ['coverage.assessed'], consumes: [] },
  'evidence-retain': { emits: ['evidence.retention-classified'], consumes: ['audio.recording-finalized', 'audio.prepared', 'privacy.protected'] },
  'privacy-protect': { emits: ['privacy.protected'], consumes: ['unknown.organized'] },
  'model-manage': { emits: ['model.availability-changed'], consumes: [] },
  'acoustics-classify': { emits: ['acoustic.evidence-produced'], consumes: ['audio.prepared'] },
  'detection-resolve': { emits: ['detection.provisional-created', 'detection.unknown-identified', 'detection.surprising-quarantined', 'detection.rejected'], consumes: ['acoustic.evidence-produced'] },
  'observation-manage': { emits: ['observation.managed', 'daily.revision-requested'], consumes: ['detection.provisional-created', 'detection.surprising-quarantined'] },
  'unknown-organize': { emits: ['unknown.organized'], consumes: ['detection.unknown-identified', 'detection.surprising-quarantined'] },
  'review-prepare': { emits: ['review.proposal-validated'], consumes: ['privacy.protected'] },
  'knowledge-manage': { emits: ['knowledge.versioned'], consumes: ['review.proposal-validated'] },
  'model-improve': { emits: ['model.release-evaluated'], consumes: ['observation.managed', 'knowledge.versioned'] },
  'daily-close': { emits: ['daily.closed'], consumes: ['coverage.assessed'] },
  'daily-create': { emits: ['daily.canvas-created'], consumes: ['daily.closed'] },
  'daily-revise': { emits: ['daily.canvas-revised'], consumes: ['daily.revision-requested'] },
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

const recordTypeForField = (field) => ({
  recording_ref: 'Recording', acoustic_evidence_ref: 'AcousticEvidence', resolution_ref: 'Resolution',
  coverage_report_ref: 'CoverageReport', sanitized_asset_set_ref: 'SanitizedAssetSet',
  daily_close_ref: 'DailyClose', daily_canvas_ref: 'DailyCanvasRevision',
}[field]);

const domainType = (title, required, properties) => ({
  type: 'object', title, required: ['id', 'version', ...required],
  properties: { id: { type: 'string', minLength: 1 }, version: { type: 'string', minLength: 1 }, ...properties },
  additionalProperties: false,
});

const domainSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'callweave.domain-records@0.1.0', title: 'Callweave versioned local domain records',
  description: 'Shared contract-first record types. Every reference in events resolves to an immutable local record of the applicable type.',
  $defs: {
    Recording: domainType('Recording', ['source_id', 'started_at', 'ended_at', 'checksum', 'coverage_state'], { source_id: { type: 'string' }, started_at: { type: 'string', format: 'date-time' }, ended_at: { type: 'string', format: 'date-time' }, checksum: { type: 'string' }, coverage_state: { type: 'string', enum: ['complete', 'partial', 'invalid'] } }),
    AcousticEvidence: domainType('Acoustic evidence', ['recording_ref', 'model_version', 'time_range_ms', 'labels'], { recording_ref: { type: 'string' }, model_version: { type: 'string' }, time_range_ms: { type: 'array', prefixItems: [{ type: 'integer', minimum: 0 }, { type: 'integer', minimum: 0 }], items: false }, labels: { type: 'array', items: { type: 'string' } } }),
    Resolution: domainType('Detection resolution', ['evidence_ref', 'resolution_state', 'policy_version'], { evidence_ref: { type: 'string' }, resolution_state: { type: 'string', enum: ['provisional', 'unknown', 'surprising', 'rejected'] }, policy_version: { type: 'string' } }),
    CoverageReport: domainType('Coverage report', ['local_date', 'timezone', 'expected_minutes', 'captured_minutes', 'valid_minutes', 'coverage_state'], { local_date: { type: 'string', format: 'date' }, timezone: { type: 'string' }, expected_minutes: { type: 'number', minimum: 0 }, captured_minutes: { type: 'number', minimum: 0 }, valid_minutes: { type: 'number', minimum: 0 }, coverage_state: { type: 'string', enum: ['complete', 'partial', 'unavailable'] } }),
    SanitizedAssetSet: domainType('Sanitized review asset set', ['asset_hashes', 'privacy_policy_version', 'export_status'], { asset_hashes: { type: 'array', items: { type: 'string' } }, privacy_policy_version: { type: 'string' }, export_status: { type: 'string', enum: ['approved', 'denied'] } }),
    DailyClose: domainType('Daily close', ['location_id', 'local_date', 'timezone', 'coverage_report_ref', 'idempotency_key'], { location_id: { type: 'string' }, local_date: { type: 'string', format: 'date' }, timezone: { type: 'string' }, coverage_report_ref: { type: 'string' }, idempotency_key: { type: 'string', minLength: 1 } }),
    DailyCanvasRevision: domainType('Daily canvas revision', ['daily_close_ref', 'revision_number', 'supersedes_ref', 'reason'], { daily_close_ref: { type: 'string' }, revision_number: { type: 'integer', minimum: 1 }, supersedes_ref: { type: ['string', 'null'] }, reason: { type: 'string', minLength: 1 } }),
  },
};

const eventPayload = (event) => {
  const properties = { workspace_id: { type: 'string', minLength: 1 }, location_id: { type: 'string', minLength: 1 }, trace_ref: { type: 'string', minLength: 1 }, result_ref: { type: 'string', minLength: 1 } };
  if (event.name.startsWith('detection.')) properties.resolution_state = { type: 'string', const: event.name.replace('detection.', '').replace('-created', '').replace('-identified', '').replace('-quarantined', '') };
  if (event.name === 'daily.closed') Object.assign(properties, { local_date: { type: 'string', format: 'date' }, timezone: { type: 'string', minLength: 1 }, coverage_report_ref: { type: 'string', minLength: 1 }, idempotency_key: { type: 'string', minLength: 1 } });
  if (event.name === 'daily.revision-requested' || event.name === 'daily.canvas-revised') Object.assign(properties, { daily_close_ref: { type: 'string', minLength: 1 }, revision_reason: { type: 'string', minLength: 1 } });
  if (event.name === 'privacy.protected') Object.assign(properties, { export_status: { type: 'string', enum: ['approved', 'denied'] }, sanitized_asset_set_ref: { type: 'string', minLength: 1 } });
  const required = Object.keys(properties);
  return { type: 'object', required, properties, additionalProperties: false };
};

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
    ...Object.fromEntries(cap.fields.map((field) => [field, recordTypeForField(field)
      ? { ...fieldSchema(field), required: ['id', 'record_type'], properties: { ...fieldSchema(field).properties, record_type: { type: 'string', const: recordTypeForField(field) } } }
      : fieldSchema(field)])),
  };
  const inputExample = Object.fromEntries([
    ['request_id', `${cap.name}-happy-001`],
    ['workspace_id', 'local-default'],
    ['location_id', 'golden-bc-demo'],
    ['idempotency_key', `${cap.name}-idempotency-001`],
    ['runtime_context', { input_reference_state: 'resolvable', dependency_state: 'available', policy_state: 'allowed' }],
    ...cap.fields.map((field) => [field, { id: `${field}-001`, version: '1.0.0', metadata: {}, ...(recordTypeForField(field) ? { record_type: recordTypeForField(field) } : {}) }]),
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
      ...(cap.name === 'detection-resolve' ? { resolution_state: index === 0 ? 'provisional' : null } : {}),
      ...(cap.name === 'detection-resolve' ? { emitted_event_id: index === 0 ? 'callweave.detection.provisional-created' : null } : {}),
      trace_ref: `${cap.name}-trace-00${index + 1}`,
      warnings: index === 0 ? [] : [reason_code],
    },
    happy: scenarios[index][1],
    persona_ref: index === 0 ? cap.owner : index === 3 ? 'callweave-reviewer' : 'callweave-system-administrator',
  }));
  if (cap.name === 'detection-resolve') {
    const outcomes = [
      ['unknown', 'callweave.detection.unknown-identified', 'retain an unresolved biological sound for local clustering rather than asserting a species.'],
      ['surprising', 'callweave.detection.surprising-quarantined', 'preserve biologically surprising evidence for both quarantine and review without treating it as verified.'],
      ['rejected', 'callweave.detection.rejected', 'record a hardware-impossible or policy-invalid claim without letting it enter observation or unknown state.'],
    ];
    use_cases.splice(1, 0, ...outcomes.map(([resolution_state, emitted_event_id, intent], index) => ({
      scenario: `As the Callweave Runtime, I want to ${intent} so that outcome routing is deterministic.`,
      input_example: { ...inputExample, request_id: `detection-resolve-${resolution_state}-00${index + 2}`, idempotency_key: `detection-resolve-${resolution_state}-00${index + 2}` },
      output_example: { status: 'completed', reason_code: 'ok', resolution_ref: `detection-resolve-${resolution_state}-001`, resolution_state, emitted_event_id, trace_ref: `detection-resolve-trace-${resolution_state}-001`, warnings: resolution_state === 'surprising' ? ['requires_review'] : [] },
      happy: true, persona_ref: 'callweave-runtime',
    })));
  }
  return {
    kind: 'capability_contract', schema_version: '1.0.0', id, namespace: 'callweave', name: cap.name,
    version: '0.1.0', lifecycle: 'draft',
    owner: { team: 'callweave', contact: 'maintainers@callweave.local' },
    summary: cap.summary,
    description: `${cap.description}\n\nImplementation status: contract-first. A WASM component/agent will be generated after contract approval. The host provides only the declared adapter authority.\n\nUse-case coverage: one happy path plus invalid-input, dependency-unavailable, and policy-denied unhappy paths.`,
    use_cases,
    inputs: { schema: { type: 'object', required: ['request_id', 'workspace_id', 'location_id', 'idempotency_key', ...cap.fields], properties: inputProperties, additionalProperties: false } },
    outputs: { schema: { type: 'object', required: ['status', 'reason_code', cap.result, 'trace_ref', 'warnings', ...(cap.name === 'detection-resolve' ? ['resolution_state', 'emitted_event_id'] : [])], properties: {
      status: { type: 'string', enum: ['completed', 'rejected', 'deferred'] },
      reason_code: { type: 'string', enum: reasonCodes },
      [cap.result]: { type: ['string', 'null'] },
      trace_ref: { type: 'string' },
      warnings: { type: 'array', items: { type: 'string' } },
      ...(cap.name === 'detection-resolve' ? { resolution_state: { type: ['string', 'null'], enum: ['provisional', 'unknown', 'surprising', 'rejected', null] } } : {}),
      ...(cap.name === 'detection-resolve' ? { emitted_event_id: { type: ['string', 'null'], enum: ['callweave.detection.provisional-created', 'callweave.detection.unknown-identified', 'callweave.detection.surprising-quarantined', 'callweave.detection.rejected', null] } } : {}),
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
    domain_schema_ref: 'schemas/domain-records.schema.json',
    state_ownership: {
      model: 'host-owned-local-store',
      reads: cap.fields.filter((field) => field.endsWith('_ref') || field.endsWith('_refs')),
      writes: [cap.result],
      transition: 'append-only; idempotency_key atomically maps to one trace and one result',
    },
    state_schema: {
      type: 'object',
      required: ['workspace_id', 'trace_ref', 'owned_record_refs'],
      properties: {
        workspace_id: { type: 'string' },
        trace_ref: { type: 'string' },
        updated_at: { type: 'string' },
        payload_ref: { type: 'string' },
        owned_record_refs: { type: 'array', items: { type: 'string', minLength: 1 } },
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
    payload: { schema: eventPayload(event), compatibility: 'backward-compatible' },
    classification: { domain: 'callweave', bounded_context: event.name.split('-')[0], event_type: 'domain', tags: ['callweave', 'local-first'] },
    publishers: [{ capability_id: `callweave.${event.publisher}`, version: '0.1.0' }],
    subscribers: event.subscribers.map((capability_id) => ({ capability_id: `callweave.${capability_id}`, version: '0.1.0' })),
    policies: [{ id: 'append-only-provenance' }], tags: ['callweave'],
    provenance: { source: 'ai-generated', author: 'Callweave architecture record', created_at: '2026-08-11T00:00:00Z' }, evidence: [],
  }, null, 2)}\n`);
}

const domainPath = join(schemaRoot, 'domain-records.schema.json');
await mkdir(dirname(domainPath), { recursive: true });
await writeFile(domainPath, `${JSON.stringify(domainSchema, null, 2)}\n`);

const workflow = {
  schema_version: '0.1.0', lifecycle: 'draft', id: 'callweave.daily-local-first',
  summary: 'Draft event workflow for one location-local acoustic day.',
  host_boundaries: ['scheduler', 'clock-timezone', 'audio-device', 'local-object-store', 'local-state-store', 'local-model-runtime'],
  idempotency: { daily_close: '<location-id>:<local-date>', daily_canvas: '<location-id>:<local-date>:<revision-number>' },
  routes: [
    { from: 'callweave.acoustic.evidence-produced', capability: 'callweave.detection-resolve', condition: 'evidence reference resolves' },
    { from: 'callweave.detection.provisional-created', capability: 'callweave.observation-manage', condition: 'resolution_state == provisional' },
    { from: 'callweave.detection.unknown-identified', capability: 'callweave.unknown-organize', condition: 'resolution_state == unknown' },
    { from: 'callweave.detection.surprising-quarantined', capability: 'callweave.observation-manage', condition: 'resolution_state == surprising' },
    { from: 'callweave.detection.surprising-quarantined', capability: 'callweave.unknown-organize', condition: 'resolution_state == surprising' },
    { from: 'callweave.unknown.organized', capability: 'callweave.privacy-protect', condition: 'selected unknown cluster exists' },
    { from: 'callweave.privacy.protected', capability: 'callweave.review-prepare', condition: 'export_status == approved' },
    { from: 'callweave.coverage.assessed', capability: 'callweave.daily-close', condition: 'scheduler grace period elapsed and local date is not closed' },
    { from: 'callweave.daily.closed', capability: 'callweave.daily-create', condition: 'immutable daily close resolves' },
    { from: 'callweave.daily.revision-requested', capability: 'callweave.daily-revise', condition: 'verified correction or late evidence is accepted' },
  ],
  retries: { retryable_reason_codes: ['dependency_unavailable'], max_attempts: 3, terminal_reason_codes: ['invalid_input', 'policy_denied'], dead_letter_requires_trace: true },
  fixtures_required: ['exclusive-detection-outcome', 'privacy-deny-no-export', 'duplicate-daily-close', 'late-evidence-creates-revision', 'coverage-gap-canvas', 'restart-replay-idempotency'],
};
const workflowPath = join(root, 'traverse', 'workflows', 'daily-local-first.workflow.json');
await mkdir(dirname(workflowPath), { recursive: true });
await writeFile(workflowPath, `${JSON.stringify(workflow, null, 2)}\n`);

const hostAdapters = {
  schema_version: '0.1.0', lifecycle: 'draft', id: 'callweave.local-first-host-adapters',
  rule: 'Capabilities receive explicit requests and typed references only; hosts hold credentials, device handles, filesystem access, and transaction authority.',
  adapters: [
    { id: 'scheduler', authority: 'invoke daily-close after local-day grace period', inputs: ['location_id', 'local_date', 'timezone', 'grace_period'], outputs: ['invocation_id', 'idempotency_key'], failure_modes: ['clock_unavailable', 'duplicate_invocation', 'late_invocation'] },
    { id: 'clock-timezone', authority: 'resolve IANA timezone and bounded local day', inputs: ['location_id', 'instant'], outputs: ['local_date', 'timezone', 'day_start', 'day_end'], failure_modes: ['timezone_unresolved', 'clock_skew'] },
    { id: 'audio-device', authority: 'capture configured microphone samples', inputs: ['audio_source_ref', 'capture_window'], outputs: ['recording_ref'], failure_modes: ['device_unavailable', 'format_unsupported', 'power_interrupted'] },
    { id: 'local-object-store', authority: 'atomically store immutable audio and derived assets', inputs: ['asset_stream', 'retention_class'], outputs: ['asset_ref', 'checksum'], failure_modes: ['storage_full', 'checksum_mismatch', 'write_interrupted'] },
    { id: 'local-state-store', authority: 'resolve typed records and atomically append idempotent transitions', inputs: ['record_refs', 'idempotency_key', 'transition'], outputs: ['result_ref', 'trace_ref'], failure_modes: ['reference_unresolvable', 'version_conflict', 'idempotency_conflict'] },
    { id: 'local-model-runtime', authority: 'load verified local models and return evidence only', inputs: ['model_manifest_ref', 'prepared_audio_ref'], outputs: ['acoustic_evidence_ref'], failure_modes: ['model_unavailable', 'checksum_mismatch', 'hardware_incompatible'] },
  ],
};
const adaptersPath = join(root, 'traverse', 'host-adapters', 'local-first-host-adapters.json');
await mkdir(dirname(adaptersPath), { recursive: true });
await writeFile(adaptersPath, `${JSON.stringify(hostAdapters, null, 2)}\n`);

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
  status: 'audible-model-readiness-verified-host-integration-pending',
  rule: 'Local classifiers are future WASM implementation modules. The only LMM dependency is the optional advisory interface traverse.inference.generate, resolved by the runtime rather than hard-coded by a WASM guest.',
  modules: [
    { id: 'callweave.perch-v2-audible', kind: 'local_wasm_model', capabilities: ['callweave.acoustics-classify', 'callweave.unknown-organize', 'callweave.model-improve'], input: 'prepared audible audio / embeddings', authority: 'evidence only' },
    { id: 'callweave.birdnet-v2.4', kind: 'local_wasm_model', capabilities: ['callweave.acoustics-classify'], input: '48 kHz audible audio', authority: 'evidence only' },
    { id: 'callweave.speech-privacy-v1', kind: 'local_wasm_model', capabilities: ['callweave.privacy-protect'], input: 'audible audio', authority: 'privacy-risk spans only' },
    { id: 'callweave.unknown-review-advisor', kind: 'runtime_resolved_lmm_agent', capabilities: ['callweave.review-prepare'], model_dependency: 'traverse.inference.generate', input: 'sanitized review package only', authority: 'proposal only' },
  ],
};
const planPath = join(root, 'traverse', 'wasm', 'implementation-plan.json');
await mkdir(dirname(planPath), { recursive: true });
await writeFile(planPath, `${JSON.stringify(implementationPlan, null, 2)}\n`);

console.log(`Generated ${caps.length} capability contracts, ${events.length} event contracts, and ${personas.length} personas.`);

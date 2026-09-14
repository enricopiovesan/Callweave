# Recording-to-analysis workflow contract

This contract defines the shared business-logic path for browser and macOS.
Capabilities remain atomic WASM packages; the workflow composes them. UI and
device APIs are host-owned.

## State machine

`idle → capture_planned → recording → finalized → windows_planned → inference_prepared → evidence_normalized → outcome_resolved`

From `outcome_resolved`:

- `provisional` → `observation_pending_review`
- `unknown` or `surprising` → `unknown_organized` → `privacy_checked` → `review_ready`
- `rejected` → `terminal_rejected`

Every transition is append-only and carries `workflow_id`, `recording_id`,
`location_profile_ref`, capability version, and idempotency key.

## Capability calls

### 1. `core.create-audio-capture-request-plan@1.0.0`

Input: `{ recording_id, location_profile_ref, duration_seconds, sample_rate_hz,
channels, encoding, segment_duration_seconds, requested_at }`.

Output: `{ request_id, accepted_format, sample_rate_hz, channels,
segment_duration_seconds, max_duration_seconds, retention_class }`.

Failures: invalid format/rate, duration outside policy, missing location, or
unsupported capture plan. No microphone access occurs in WASM.

### 2. Host `audio.capture` connector (not a business capability)

Input: capture request plus host device selection and permission context.
Output: `{ recording_id, segments: [{ uri, start_ms, end_ms, byte_length,
sha256 }], codec, sample_rate_hz, channels, completed_at }`.

Failures: permission denied, device unavailable, interruption, overrun,
encoding failure, cancellation. The host emits a failed/partial recording
event; it never fabricates bytes.

### 3. `artifact.recording-finalize@1.0.0`

Input: capture segments, checksums, duration, format, location profile, and
quality flags.

Output: immutable recording artifact with ordered segment references and a
content digest.

Failures: missing segment, checksum mismatch, overlap/gap, duration mismatch,
or unsupported codec.

### 4. `core.create-audio-window-plan@1.0.0`

Input: recording artifact metadata and window policy.

Output: deterministic windows `{ window_id, start_ms, end_ms, model_refs,
zero_padding_policy }`.

Failures: invalid duration, non-monotonic ranges, or model window incompatibility.

### 5. `core.prepare-inference-request@1.0.0`

Input: window, opaque model reference, model interface, location profile, and
resource budget.

Output: `{ request_id, model_ref, input_uri, sample_rate_hz, tensor_shape,
deadline_ms, memory_budget_mb }`.

Failures: unavailable model, digest mismatch, unsupported tensor schema, or
resource budget exceeded.

### 6. Host `local-model-runtime` connector (not a business capability)

Input: prepared inference request and local audio bytes.
Output: model evidence `{ detection_id, label, raw_score, start_ms, end_ms,
model_ref, model_digest, runtime_ref }`.

Failures: model load/inference error, timeout, memory exhaustion, malformed
output, or cancellation. Raw scores are never treated as probabilities.

### 7. `inference.evidence-normalize@1.0.1`

Input: model detections, source reference, model metadata, and policy version.
Output: normalized evidence with integer confidence units, timestamps,
provenance, and deterministic IDs.

Failures: missing label/model, invalid interval, non-finite score, duplicate
identity, or out-of-range confidence.

### 8. `classification.outcome-resolve@1.0.0`

Input: normalized evidence, configured candidate entry, compatibility facts,
and a versioned calibration policy.

Output: exactly one state: `provisional`, `unknown`, `surprising`, or `rejected`.

Rules:

- No calibrated score → `unknown / uncalibrated_evidence`.
- Candidate absent or geographically disallowed → `unknown / candidate_not_listed`.
- Rare but threshold-passing candidate → `surprising / rare_candidate`.
- Hardware incompatibility → `rejected / hardware_incompatible`.
- Threshold passing is only `provisional`; human review is still required.

### 9. `unknown.organize@1.0.0` and `review.prepare@1.0.0`

Unknown/surprising outcomes are clustered and privacy-gated. Review packages
contain metadata/evidence by default and no raw audio. Privacy denial or
missing speech-risk evidence produces `review_blocked`, never an export.

## Shared event envelope

```json
{
  "event_id": "stable-id",
  "event_type": "recording.finalized",
  "workflow_id": "daily-local-first",
  "recording_id": "recording-...",
  "location_profile_ref": "golden-bc-expanded@1.0.0",
  "occurred_at": "RFC3339",
  "producer": {"capability_id": "...", "version": "1.0.0"},
  "idempotency_key": "...",
  "payload": {}
}
```

## Browser and macOS binding requirements

Both targets invoke the same manifest-selected WASM capabilities and event
schemas. Only the host connector implementation differs:

- Browser: `MediaDevices.getUserMedia`/`MediaRecorder`, user permission,
  IndexedDB/object-store, WebAssembly model runtime.
- macOS: AVFoundation microphone permission/capture, filesystem/object-store,
  native WASM runtime/model runtime.

The connector ABI must expose bounded request/response calls, cancellation,
maximum byte/duration limits, digest-bearing handles, and structured errors.
WASM must not receive ambient filesystem paths, device handles, network access,
or UI references.

## Runtime dispatch gap and smallest sequence

The remaining implementation risk is not capability logic; it is production
dispatch of a manifest-selected component to the bounded host connector.

1. Use Traverse’s merged component-WIT host-binding profile to register the
   connector IDs and validate activation-time bindings.
2. Implement one end-to-end `audio.capture` request/response in each host with
   the same envelope and error codes.
3. Add dispatch of `local-model-runtime` using opaque model references and
   resource limits.
4. Run the workflow with a real recording, then persist only the resulting
   immutable artifacts/events through the configured stores.
5. Add cancellation, retry, crash-recovery, and permission-denied fixtures.

Until steps 1–3 are available in the target hosts, the pure business logic is
fully testable but real recording/inference remains a host integration concern.

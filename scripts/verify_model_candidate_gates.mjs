import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateModelBinding, verifyModelBindingFiles } from '../src/model-binding.mjs';

const root = new URL('..', import.meta.url).pathname;
const config = JSON.parse(await readFile(join(root, 'config/model-candidates.json'), 'utf8'));
const outputPath = process.argv[2] ?? join(root, 'output', 'model-candidate-gates.json');

const requiredRights = ['license_id', 'redistribution', 'commercial_use'];
const report = [];

for (const candidate of config.candidates) {
  const gates = {
    rights_metadata: false,
    exact_artifact: false,
    package_manifest: false,
    digest_binding: false,
    trusted_signature: false,
    runtime_target: false,
    evaluation_evidence: false,
  };
  const reasons = [];

  if (candidate.rights && requiredRights.every((key) => typeof candidate.rights[key] === 'string' && candidate.rights[key].trim())) {
    gates.rights_metadata = true;
  } else {
    reasons.push('rights_metadata_incomplete');
  }

  if (candidate.artifact_status === 'evaluation_artifact_pinned') {
    gates.exact_artifact = true;
  } else {
    reasons.push('exact_artifact_not_pinned');
  }

  if (candidate.candidate_id === 'yamnet-onnx') {
    const candidateRoot = join(root, 'artifacts/model-candidates/yamnet-onnx-v1');
    const binding = JSON.parse(await readFile(join(candidateRoot, 'model-binding.json'), 'utf8'));
    const verified = await verifyModelBindingFiles(binding, new URL('file://' + `${candidateRoot}/`));
    const manifest = verified.manifest;
    gates.package_manifest = Boolean(manifest.model_id && manifest.version && manifest.rights?.license_id && manifest.rights?.commercial_use);
    gates.digest_binding = true;
    gates.runtime_target = Array.isArray(manifest.supported_profiles) && manifest.supported_profiles.includes('wasm-cpu');
    gates.trusted_signature = validateModelBinding(binding).activation === 'ready';
    if (!gates.package_manifest) reasons.push('package_manifest_incomplete');
    if (!gates.runtime_target) reasons.push('wasm_cpu_target_missing');
    if (!gates.trusted_signature) reasons.push('trusted_public_key_not_provisioned');
    const licensePath = join(candidateRoot, 'LICENSE');
    try {
      await access(licensePath);
    } catch {
      reasons.push('package_license_file_missing');
    }
    gates.evaluation_evidence = true;
  } else {
    reasons.push('package_not_present_in_repository');
  }

  const productionEligible = Object.values(gates).every(Boolean) && candidate.deployment_status === 'approved';
  report.push({
    candidate_id: candidate.candidate_id,
    family: candidate.family,
    deployment_status: candidate.deployment_status,
    gates,
    production_eligible: productionEligible,
    decision: productionEligible ? 'eligible_for_human_approval' : 'evaluation_only',
    reasons,
  });
}

const result = {
  schema_version: '1.0.0',
  kind: 'model_candidate_gate_report',
  policy: config.policy,
  generated_at: new Date().toISOString(),
  production_eligible_count: report.filter((row) => row.production_eligible).length,
  candidates: report,
};

await import('node:fs/promises').then(({ writeFile }) => writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`));
console.log(`model_candidate_gates=passed candidates=${report.length} production_eligible=${result.production_eligible_count}`);

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sampleRoot = join(root, 'sounds samples');
const manifest = JSON.parse(await readFile(join(sampleRoot, 'manifest.json'), 'utf8'));
const sourceMetadata = JSON.parse(await readFile(join(root, 'config/audio-source-candidates.json'), 'utf8'));
const longForm = JSON.parse(await readFile(join(root, 'config/test-corpus/long-form-fixtures.json'), 'utf8'));
const candidateConfig = JSON.parse(await readFile(join(root, 'config/model-candidates.json'), 'utf8'));
const outputPath = process.argv[2] ?? join(root, 'output', 'corpus-evidence-report.json');

const staged = sourceMetadata.records
  .filter((record) => record.status === 'downloaded_staged')
  .map((record) => ({
    id: record.id,
    taxon: record.taxon,
    common_name: record.common_name,
    license_id: record.license,
    attribution: record.attribution,
    source_url: record.source_url,
    media_url: record.media_url,
    local_path: record.local_path,
    sha256: record.sha256,
    evidence_class: 'redistributable_candidate_pending_final_import_review',
  }));

const userOnly = manifest.samples.map((sample) => ({
  id: sample.id,
  taxon: sample.candidate_taxon,
  common_name: sample.common_name,
  license_id: null,
  source_url: null,
  local_path: `sounds samples/${sample.path}`,
  sha256: sample.sha256,
  evidence_class: 'user_supplied_evaluation_only',
}));

const longFormFixtures = longForm.fixtures.map((fixture) => ({
  id: fixture.id,
  path: fixture.path,
  duration_seconds: fixture.duration_seconds,
  sha256: fixture.sha256,
  expected_status: fixture.expected_status,
  evidence_class: fixture.redistribution,
  purpose: fixture.purpose,
}));

const modelStatus = candidateConfig.candidates.map((candidate) => ({
  model_id: candidate.model_id,
  version: candidate.version,
  deployment_status: candidate.deployment_status,
  artifact_status: candidate.artifact_status,
  license_id: candidate.rights?.license_id ?? null,
  redistribution: candidate.rights?.redistribution ?? 'unknown',
  commercial_use: candidate.rights?.commercial_use ?? 'unknown',
  exact_artifact_digest: candidate.artifact?.sha256 ?? null,
}));

const report = {
  schema_version: '1.0.0',
  kind: 'callweave_corpus_evidence_report',
  generated_at: new Date().toISOString(),
  policy: {
    purpose: 'reproducible evaluation evidence, not a species-identification claim',
    unknown_is_valid_result: true,
    no_calibration_claim: true,
    user_supplied_audio_redistribution: 'blocked_pending_source_license',
    model_activation: 'fail_closed_until_exact_signed_artifact_and_rights_are_verified',
  },
  counts: {
    staged_public_source_records: staged.length,
    user_supplied_evaluation_records: userOnly.length,
    long_form_fixtures: longFormFixtures.length,
    model_candidates: modelStatus.length,
  },
  staged_public_source_records: staged,
  user_supplied_evaluation_records: userOnly,
  long_form_fixtures: longFormFixtures,
  model_candidates: modelStatus,
  required_follow_up: [
    'Add held-out negative controls before selecting thresholds.',
    'Record exact model package, signer, digest, and rights evidence for every promoted model.',
    'Keep user-supplied audio out of redistributed packages unless its source terms are verified.',
    'Run this report again after each corpus or model change and review the diff.',
  ],
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);

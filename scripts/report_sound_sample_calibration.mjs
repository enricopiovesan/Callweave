import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sampleRoot = join(root, 'sounds samples');
const evidenceRoot = join(root, 'output', 'sample-evaluation');
const reportPath = process.argv[2] ?? join(root, 'output', 'sample-calibration-report.json');
const manifest = JSON.parse(await readFile(join(sampleRoot, 'manifest.json'), 'utf8'));

const samples = [];
const modelNames = new Set();
for (const sample of manifest.samples) {
  const stem = sample.path.replace(/\.[^.]+$/, '');
  const evidence = JSON.parse(await readFile(join(evidenceRoot, sample.id, `${stem}.evidence.json`), 'utf8'));
  const models = evidence.models.map((model) => {
    modelNames.add(model.model_id);
    const candidate = model.candidate_summary.find((item) => item.taxon === sample.candidate_taxon) ?? null;
    const rank = candidate?.best_rank ?? null;
    return {
      model_id: model.model_id,
      available: candidate?.available ?? false,
      best_rank: rank,
      max_raw_logit: candidate?.max_raw_logit ?? null,
      supporting_windows: candidate?.supporting_windows ?? 0,
      non_background_supporting_windows: candidate?.non_background_supporting_windows ?? 0,
      background_dominant_only: Boolean(candidate?.supporting_windows) && (candidate?.non_background_supporting_windows ?? 0) === 0,
      top_candidate_match: rank === 1,
      rank_bucket: rank == null ? 'unavailable' : rank <= 5 ? 'top_5' : rank <= 50 ? '6_50' : rank <= 500 ? '51_500' : 'over_500',
      quality: model.quality_summary,
    };
  });
  samples.push({ id: sample.id, candidate_taxon: sample.candidate_taxon, models });
}

const summary = [...modelNames].sort().map((model_id) => {
  const rows = samples.flatMap((sample) => sample.models.filter((model) => model.model_id === model_id));
  const available = rows.filter((row) => row.available);
  const top5 = available.filter((row) => row.best_rank <= 5).length;
  return {
    model_id,
    sample_count: rows.length,
    available_candidate_count: available.length,
    top_5_count: top5,
    top_5_rate: available.length ? top5 / available.length : null,
    unavailable_sample_ids: samples.filter((sample) => !sample.models.find((row) => row.model_id === model_id)?.available).map((sample) => sample.id),
    decision: available.length < rows.length ? 'insufficient_taxonomy_coverage' : top5 === available.length ? 'candidate_supports_next_calibration_step' : 'requires_calibration_or_specialized_model_evaluation',
  };
});

const report = {
  schema_version: '1.0.0',
  kind: 'acoustic_calibration_report',
  generated_at: new Date().toISOString(),
  profile: 'golden-bc',
  policy: 'descriptive_evidence_only_no_thresholds_selected',
  sample_provenance_status: manifest.provenance_status,
  sample_count: samples.length,
  model_summary: summary,
  samples,
  next_actions: [
    'Obtain at least one redistributable CC-BY/CC0 grizzly reference or keep grizzly evaluation-only.',
    'Add negative controls (speech, vehicle, rain, silence) before selecting candidate thresholds.',
    'Do not promote rank or raw logits to probabilities without a versioned calibration policy.',
  ],
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${reportPath}`);

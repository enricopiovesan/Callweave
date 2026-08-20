import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const repoRoot = new URL('..', import.meta.url).pathname;
const registryRepo = process.argv[2] || '/Users/enricopiovesan/Documents/repos/registry';

const requiredPersonas = [
  'callweave-artist',
  'callweave-field-operator',
  'callweave-location-owner',
  'callweave-reviewer',
  'callweave-runtime',
  'callweave-system-administrator',
];

const publishCandidates = [
  {
    capability_id: 'location.initialize',
    contract_path: join(repoRoot, 'capabilities', 'location.initialize', 'contract.json'),
    artifact_path: join(repoRoot, 'capabilities', 'location.initialize', 'artifacts', 'location-initialize.wasm'),
  },
  {
    capability_id: 'operations.recover',
    contract_path: join(repoRoot, 'capabilities', 'operations.recover', 'contract.json'),
    artifact_path: join(repoRoot, 'capabilities', 'operations.recover', 'artifacts', 'operations-recover.wasm'),
  },
  {
    capability_id: 'model.improve',
    contract_path: join(repoRoot, 'capabilities', 'model.improve', 'contract.json'),
    artifact_path: join(repoRoot, 'capabilities', 'model.improve', 'artifacts', 'model-improve.wasm'),
  },
  {
    capability_id: 'review.prepare',
    contract_path: join(repoRoot, 'capabilities', 'review.prepare', 'contract.json'),
    artifact_path: join(repoRoot, 'capabilities', 'review.prepare', 'artifacts', 'review-prepare.wasm'),
  },
];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function listDirtyEntries(path) {
  const gitDir = join(path, '.git');
  if (!(await exists(gitDir))) return { repo_present: false, dirty_entries: [] };
  const { spawn } = await import('node:child_process');
  return await new Promise(resolve => {
    const child = spawn('git', ['-C', path, 'status', '--short'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => {
      resolve({
        repo_present: true,
        dirty_entries: code === 0 ? stdout.trim().split('\n').filter(Boolean) : [`git-status-failed:${stderr.trim() || code}`],
      });
    });
  });
}

async function findPersonaVersions(personaId) {
  const personaRoot = join(registryRepo, 'personas', personaId);
  if (!(await exists(personaRoot))) return [];
  const entries = await readdir(personaRoot, { withFileTypes: true });
  const versions = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const personaFile = join(personaRoot, entry.name, 'persona.json');
    if (await exists(personaFile)) versions.push(entry.name);
  }
  return versions.sort();
}

async function validateContractPersonaRefs(contractPath) {
  const contract = JSON.parse(await readFile(contractPath, 'utf8'));
  const refs = [...new Set((contract.use_cases || []).map(useCase => useCase.persona_ref).filter(Boolean))].sort();
  return refs;
}

const registryState = await listDirtyEntries(registryRepo);
const personas = [];
for (const personaId of requiredPersonas) {
  personas.push({
    persona_id: personaId,
    registry_versions: await findPersonaVersions(personaId),
  });
}

const candidates = [];
for (const candidate of publishCandidates) {
  candidates.push({
    ...candidate,
    contract_exists: await exists(candidate.contract_path),
    artifact_exists: await exists(candidate.artifact_path),
    persona_refs: await validateContractPersonaRefs(candidate.contract_path),
  });
}

const missingPersonas = personas.filter(persona => persona.registry_versions.length === 0).map(persona => persona.persona_id);
const notReadyCandidates = candidates
  .filter(candidate => !candidate.contract_exists || !candidate.artifact_exists || candidate.persona_refs.some(ref => missingPersonas.includes(ref)))
  .map(candidate => candidate.capability_id);

console.log(JSON.stringify({
  checked_at: '2026-08-20',
  registry_repo: registryRepo,
  registry_repo_present: registryState.repo_present,
  registry_repo_dirty: registryState.dirty_entries.length > 0,
  registry_repo_dirty_entries: registryState.dirty_entries,
  required_personas: personas,
  publish_candidates: candidates,
  blocking_persona_ids: missingPersonas,
  blocking_capability_ids: notReadyCandidates,
  ready_for_dry_run: registryState.repo_present && registryState.dirty_entries.length === 0 && missingPersonas.length === 0 && notReadyCandidates.length === 0,
}, null, 2));

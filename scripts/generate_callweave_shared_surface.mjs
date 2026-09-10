import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const foundationDir = path.join(repoRoot, 'apps', 'callweave-foundation');
const outputJson = path.join(repoRoot, 'apps', 'callweave-shared-surface.json');
const outputMarkdown = path.join(repoRoot, 'apps', 'CALLWEAVE_SHARED_SURFACE.md');
const pwaOutputJson = path.join(repoRoot, 'apps', 'CallweavePWA', 'shared-surface.json');
const registryIndexPath = path.join(
  repoRoot,
  '.traverse',
  'workspaces',
  'callweave-foundation-local',
  'registry',
  'public',
  'index.json',
);

async function json(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function registryDetail(record) {
  return record
    ? {
        source: 'public_registry',
        version: record.version,
        summary: record.summary ?? record.description ?? '',
        use_cases: record.use_cases ?? [],
        permitted_targets: record.permitted_targets ?? [],
      }
    : null;
}

async function build() {
  const foundation = await json(path.join(foundationDir, 'app.manifest.json'));
  const registry = existsSync(registryIndexPath) ? await json(registryIndexPath) : { capabilities: [] };
  const registryCapabilities = new Map((registry.capabilities ?? []).map((item) => [item.id, item]));
  const workflowsByCapability = new Map();

  for (const declared of foundation.workflows) {
    const workflow = await json(path.join(foundationDir, declared.path));
    for (const node of workflow.nodes ?? []) {
      if (node.capability_id) workflowsByCapability.set(node.capability_id, { declared, workflow, node });
    }
  }

  const capabilities = [];
  for (const declared of foundation.components) {
    const component = await json(path.join(foundationDir, declared.manifest_path));
    const capabilityId = component.capability_id;
    const localContractPath = component.contract_path
      ? path.resolve(path.dirname(path.join(foundationDir, declared.manifest_path)), component.contract_path)
      : null;
    const localContract = localContractPath && existsSync(localContractPath) ? await json(localContractPath) : null;
    const registryRecord = registryCapabilities.get(capabilityId);
    const detail = registryDetail(registryRecord) ?? {
      source: 'local_contract_pending_registry_sync',
      version: component.capability_version,
      summary: localContract?.summary ?? '',
      use_cases: localContract?.use_cases ?? [],
      permitted_targets: component.permitted_targets ?? [],
    };
    const workflowEntry = workflowsByCapability.get(capabilityId);
    if (!workflowEntry) throw new Error(`No workflow invokes ${capabilityId}`);

    capabilities.push({
      capability_id: capabilityId,
      capability_version: detail.version,
      component_id: declared.component_id,
      workflow_id: workflowEntry.declared.workflow_id,
      workflow_version: workflowEntry.declared.workflow_version,
      workflow_summary: workflowEntry.workflow.summary,
      input_fields: Object.keys(workflowEntry.workflow.inputs?.schema?.properties ?? {}),
      output_fields: Object.keys(workflowEntry.workflow.outputs?.schema?.properties ?? {}),
      registry: detail,
    });
  }

  return {
    schema_version: '1.0.0',
    source_app: { app_id: foundation.app_id, version: foundation.version, manifest: 'apps/callweave-foundation/app.manifest.json' },
    policy: {
      statement: 'Every Callweave interface delegates domain work to this Traverse capability/workflow surface. Interfaces may expose a subset of routes, but may not duplicate business logic.',
      presentation_boundary: 'A UI sends commands, renders state and results, and delegates device-specific work to its native host.',
    },
    capabilities,
  };
}

function markdown(surface) {
  const rows = surface.capabilities.map((item, index) => {
    const useCases = item.registry.use_cases.length
      ? item.registry.use_cases.map((entry) => `  - ${entry.scenario}`).join('\n')
      : '  - No use cases were found in the local contract.';
    return `## ${index + 1}. \`${item.capability_id}\`

Workflow: \`${item.workflow_id}\` v${item.workflow_version}  
Registry status: ${item.registry.source}  
Targets: ${item.registry.permitted_targets.join(', ') || 'not declared'}

${item.registry.summary || item.workflow_summary}

Use cases:
${useCases}
`;
  });
  return `# Callweave shared Traverse surface

This is the canonical, generated inventory of the domain capabilities and one-node workflows that Callweave applications share. Its source is \`${surface.source_app.manifest}\`.

${surface.policy.statement}

${surface.policy.presentation_boundary}

The catalogue currently contains **${surface.capabilities.length}** capability/workflow pairs. “local_contract_pending_registry_sync” means the Foundation contract exists locally but was not present in the most recently synced public Registry index when this file was generated.

${rows.join('\n')}
`;
}

const surface = await build();
const expectedJson = `${JSON.stringify(surface, null, 2)}\n`;
const expectedMarkdown = markdown(surface);
if (process.argv.includes('--check')) {
  const actualJson = await readFile(outputJson, 'utf8');
  const actualMarkdown = await readFile(outputMarkdown, 'utf8');
  const actualPwaJson = await readFile(pwaOutputJson, 'utf8');
  if (actualJson !== expectedJson || actualMarkdown !== expectedMarkdown || actualPwaJson !== expectedJson) {
    throw new Error('Shared surface catalogue is stale. Run npm run traverse:shared-surface:generate.');
  }
  console.log(`Shared surface catalogue is current (${surface.capabilities.length} capability/workflow pairs).`);
} else {
  await writeFile(outputJson, expectedJson);
  await writeFile(outputMarkdown, expectedMarkdown);
  await writeFile(pwaOutputJson, expectedJson);
  console.log(`Generated shared surface catalogue (${surface.capabilities.length} capability/workflow pairs).`);
}

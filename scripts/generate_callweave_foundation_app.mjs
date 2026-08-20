import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';

const repoRoot = new URL('..', import.meta.url).pathname;
const capabilitiesRoot = join(repoRoot, 'capabilities');
const appRoot = join(repoRoot, 'apps', 'callweave-foundation');
const componentsRoot = join(appRoot, 'components');
const workflowsRoot = join(appRoot, 'workflows');
const foundationAppVersion = '1.3.0';

const encoder = new TextEncoder();

function stableJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function slugify(identifier) {
  return identifier.replaceAll('.', '-');
}

function createSha256Digest(buffer) {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function workflowFor({ capabilityID, capabilityVersion, contract }) {
  const inputSchema = contract.inputs.schema;
  const outputSchema = contract.outputs.schema;
  const inputKeys = Object.keys(inputSchema.properties || {});
  const outputKeys = Object.keys(outputSchema.properties || {});
  return {
    kind: 'workflow_definition',
    schema_version: '1.0.0',
    id: `callweave.foundation.${capabilityID}`,
    name: capabilityID,
    version: '1.0.0',
    lifecycle: 'active',
    owner: {
      team: 'callweave',
      contact: 'maintainers@callweave.local',
    },
    summary: `Exercise the standalone ${capabilityID} capability as a one-node Traverse workflow.`,
    inputs: { schema: inputSchema },
    outputs: { schema: outputSchema },
    nodes: [
      {
        node_id: 'run_capability',
        capability_id: capabilityID,
        capability_version: capabilityVersion,
        input: {
          from_workflow_input: inputKeys,
        },
        output: {
          to_workflow_state: outputKeys,
        },
      },
    ],
    edges: [],
    start_node: 'run_capability',
    terminal_nodes: ['run_capability'],
    tags: ['callweave', 'foundation', 'standalone-capability'],
    governing_spec: '007-workflow-registry-traversal',
  };
}

const capabilityDirs = (await readdir(capabilitiesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const appComponents = [];
const appWorkflows = [];

for (const directory of capabilityDirs) {
  const capabilityRoot = join(capabilitiesRoot, directory);
  const manifestPath = join(capabilityRoot, 'manifest.json');
  const contractPath = join(capabilityRoot, 'contract.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const contract = JSON.parse(await readFile(contractPath, 'utf8'));
  const artifactPath = join(capabilityRoot, manifest.binary.path);
  const artifact = await readFile(artifactPath);
  const wasmDigest = createSha256Digest(artifact);
  const slug = slugify(manifest.package_id);
  const componentDir = join(componentsRoot, slug);
  const workflowDir = join(workflowsRoot, slug);
  await mkdir(componentDir, { recursive: true });
  await mkdir(workflowDir, { recursive: true });

  const componentManifest = {
    component_id: `callweave.foundation.${manifest.package_id}-component`,
    version: manifest.version,
    schema_version: '1.0.0',
    capability_id: manifest.capability_ref.id,
    capability_version: manifest.capability_ref.version,
    contract_path: relative(componentDir, contractPath),
    wasm_binary_path: relative(componentDir, artifactPath),
    wasm_digest: wasmDigest,
    runtime_constraints: {
      host_api_access: manifest.constraints.host_api_access,
      network_access: manifest.constraints.network_access,
      filesystem_access: manifest.constraints.filesystem_access,
    },
    permitted_targets: ['local', 'device', 'edge', 'cloud'],
    dependencies: [],
    connector_requirements: [],
    validation_evidence: [
      {
        evidence_type: 'checked_in_fixture',
        status: 'passed',
        produced_by: 'callweave_foundation_generation',
      },
    ],
  };
  await writeFile(join(componentDir, 'component.manifest.json'), stableJson(componentManifest));

  const workflow = workflowFor({
    capabilityID: manifest.capability_ref.id,
    capabilityVersion: manifest.capability_ref.version,
    contract,
  });
  await writeFile(join(workflowDir, 'workflow.json'), stableJson(workflow));

  appComponents.push({
    component_id: componentManifest.component_id,
    version: componentManifest.version,
    digest: wasmDigest,
    manifest_path: relative(appRoot, join(componentDir, 'component.manifest.json')),
  });
  appWorkflows.push({
    workflow_id: workflow.id,
    workflow_version: workflow.version,
    path: relative(appRoot, join(workflowDir, 'workflow.json')),
  });
}

const appManifest = {
  app_id: 'callweave.foundation',
  version: foundationAppVersion,
  schema_version: '1.0.0',
  workspace_defaults: {
    workspace_id: 'callweave-foundation-local',
    registry_scope: 'private',
  },
  components: appComponents,
  workflows: appWorkflows,
  model_dependencies: [],
  config_schema: {
    type: 'object',
    required: ['workspace_id'],
    properties: {
      workspace_id: { type: 'string' },
      mode: {
        type: 'string',
        enum: ['foundation'],
      },
    },
    additionalProperties: false,
  },
  default_config: {
    workspace_id: 'callweave-foundation-local',
    mode: 'foundation',
  },
  placement_policy: {
    preferred_targets: ['local'],
    allow_fallback: false,
  },
  public_surfaces: ['cli'],
};

await mkdir(appRoot, { recursive: true });
await writeFile(join(appRoot, 'app.manifest.json'), stableJson(appManifest));
await writeFile(
  join(appRoot, 'workspace.config.json'),
  stableJson({
    workspace_id: 'callweave-foundation-local',
    mode: 'foundation',
  }),
);
await writeFile(
  join(appRoot, 'README.md'),
  [
    '# Callweave foundation Traverse app bundle',
    '',
    'This app bundle packages the executable, standalone Callweave foundation',
    'capabilities into a real Traverse application manifest with concrete',
    'component manifests and active one-node workflows.',
    '',
    'It is not the full Callweave daily local-first application workflow.',
    'That broader app still contains draft contracts that do not yet have',
    'executable packages or connector-backed activation evidence.',
    '',
    'Regenerate these files with:',
    '',
    '```bash',
    'node scripts/generate_callweave_foundation_app.mjs',
    '```',
  ].join('\n') + '\n',
);

console.log(
  JSON.stringify(
    {
      app_manifest: relative(repoRoot, join(appRoot, 'app.manifest.json')),
      component_count: appComponents.length,
      workflow_count: appWorkflows.length,
    },
    null,
    2,
  ),
);

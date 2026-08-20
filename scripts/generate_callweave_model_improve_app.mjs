import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const repoRoot = new URL('..', import.meta.url).pathname;
const appRoot = join(repoRoot, 'apps', 'callweave-model-improve');
const componentDir = join(appRoot, 'components', 'model-improve');
const workflowDir = join(appRoot, 'workflows', 'model-improve');
const contractPath = join(repoRoot, 'traverse', 'contracts', 'callweave', 'model-improve', 'contract.json');
const wrapperPath = join(componentDir, 'wrapper.json');
const appVersion = '0.1.0';

function stableJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function sha256(buffer) {
  return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

const contract = JSON.parse(await readFile(contractPath, 'utf8'));
const wrapper = {
  kind: 'compatible_wrapper',
  capability_id: 'callweave.model-improve',
  notes: 'Thin wrapper only. Host-owned local training, held-out evaluation, release publication, rollback, and append-only model provenance remain outside the portable contract.',
};

await mkdir(componentDir, { recursive: true });
await mkdir(workflowDir, { recursive: true });
await writeFile(wrapperPath, stableJson(wrapper));
const wrapperDigest = sha256(await readFile(wrapperPath));

const componentManifest = {
  component_id: 'callweave.model-improve-compatible-component',
  version: '0.1.0',
  schema_version: '1.0.0',
  capability_id: 'callweave.model-improve',
  capability_version: '0.1.0',
  execution_mode: 'compatible',
  contract_path: relative(componentDir, contractPath),
  wrapper_path: 'wrapper.json',
  platforms: ['local', 'macos'],
  runtime_constraints: {
    host_api_access: 'exception_required',
    network_access: 'forbidden',
    filesystem_access: 'sandbox_only',
  },
  permitted_targets: ['local', 'device'],
  dependencies: [],
  connector_requirements: [],
  validation_evidence: [
    {
      evidence_type: 'checked_in_smoke',
      status: 'passed',
      produced_by: 'model_improve_compatible_smoke',
    },
  ],
};
await writeFile(join(componentDir, 'component.manifest.json'), stableJson(componentManifest));

const workflow = {
  kind: 'workflow_definition',
  schema_version: '1.0.0',
  id: 'callweave.model-improve-test.workflow',
  name: 'model-improve-test',
  version: '0.1.0',
  lifecycle: 'active',
  owner: {
    team: 'callweave',
    contact: 'maintainers@callweave.local',
  },
  summary: 'Exercise the compatible model-improve component through the app registration path.',
  inputs: contract.inputs,
  outputs: contract.outputs,
  nodes: [
    {
      node_id: 'improve_model',
      capability_id: 'callweave.model-improve',
      capability_version: '0.1.0',
      input: {
        from_workflow_input: Object.keys(contract.inputs.schema.properties || {}),
      },
      output: {
        to_workflow_state: Object.keys(contract.outputs.schema.properties || {}),
      },
    },
  ],
  edges: [],
  start_node: 'improve_model',
  terminal_nodes: ['improve_model'],
  tags: ['callweave', 'compatible', 'host-adapter', 'model-improve'],
  governing_spec: '007-workflow-registry-traversal',
};
await writeFile(join(workflowDir, 'workflow.json'), stableJson(workflow));

const appManifest = {
  app_id: 'callweave.model-improve-test',
  version: appVersion,
  schema_version: '1.0.0',
  workspace_defaults: {
    workspace_id: 'callweave-model-improve-local',
    registry_scope: 'private',
  },
  components: [
    {
      component_id: componentManifest.component_id,
      version: componentManifest.version,
      digest: wrapperDigest,
      manifest_path: relative(appRoot, join(componentDir, 'component.manifest.json')),
    },
  ],
  workflows: [
    {
      workflow_id: workflow.id,
      workflow_version: workflow.version,
      path: relative(appRoot, join(workflowDir, 'workflow.json')),
    },
  ],
  model_dependencies: [],
  config_schema: {
    type: 'object',
    required: ['workspace_id'],
    properties: {
      workspace_id: { type: 'string' },
      mode: { type: 'string', enum: ['compatible-test'] },
    },
    additionalProperties: false,
  },
  default_config: {
    workspace_id: 'callweave-model-improve-local',
    mode: 'compatible-test',
  },
  placement_policy: {
    preferred_targets: ['local'],
    allow_fallback: false,
  },
  public_surfaces: ['cli'],
};

await writeFile(join(appRoot, 'app.manifest.json'), stableJson(appManifest));
await writeFile(join(appRoot, 'workspace.config.json'), stableJson(appManifest.default_config));
await writeFile(
  join(appRoot, 'README.md'),
  [
    '# Callweave model-improve compatible test app',
    '',
    'This app bundle exercises the host-integrated compatible-mode component',
    'for `callweave.model-improve`. It validates and registers a thin',
    'wrapper around the governed model release app contract.',
    '',
    'Generate these files with:',
    '',
    '```bash',
    'node scripts/generate_callweave_model_improve_app.mjs',
    '```',
  ].join('\n') + '\n',
);

console.log(JSON.stringify({
  app_manifest: relative(repoRoot, join(appRoot, 'app.manifest.json')),
  component_count: 1,
  workflow_count: 1,
  digest: wrapperDigest,
}, null, 2));

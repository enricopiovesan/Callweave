import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const repoRoot = new URL('..', import.meta.url).pathname;
const appRoot = join(repoRoot, 'apps', 'callweave-daily-create');
const componentDir = join(appRoot, 'components', 'daily-create');
const workflowDir = join(appRoot, 'workflows', 'daily-create');
const contractPath = join(repoRoot, 'traverse', 'contracts', 'callweave', 'daily-create', 'contract.json');
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
  capability_id: 'callweave.daily-create',
  notes: 'Thin wrapper only. Host-owned canvas rendering, artifact persistence, and append-only publication remain outside the portable contract.',
};

await mkdir(componentDir, { recursive: true });
await mkdir(workflowDir, { recursive: true });
await writeFile(wrapperPath, stableJson(wrapper));
const wrapperDigest = sha256(await readFile(wrapperPath));

const componentManifest = {
  component_id: 'callweave.daily-create-compatible-component',
  version: '0.1.0',
  schema_version: '1.0.0',
  capability_id: 'callweave.daily-create',
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
      produced_by: 'daily_create_compatible_smoke',
    },
  ],
};
await writeFile(join(componentDir, 'component.manifest.json'), stableJson(componentManifest));

const workflow = {
  kind: 'workflow_definition',
  schema_version: '1.0.0',
  id: 'callweave.daily-create-test.workflow',
  name: 'daily-create-test',
  version: '0.1.0',
  lifecycle: 'active',
  owner: {
    team: 'callweave',
    contact: 'maintainers@callweave.local',
  },
  summary: 'Exercise the compatible daily-create component through the app registration path.',
  inputs: contract.inputs,
  outputs: contract.outputs,
  nodes: [
    {
      node_id: 'create_daily_canvas',
      capability_id: 'callweave.daily-create',
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
  start_node: 'create_daily_canvas',
  terminal_nodes: ['create_daily_canvas'],
  tags: ['callweave', 'compatible', 'host-adapter', 'daily-create'],
  governing_spec: '007-workflow-registry-traversal',
};
await writeFile(join(workflowDir, 'workflow.json'), stableJson(workflow));

const appManifest = {
  app_id: 'callweave.daily-create-test',
  version: appVersion,
  schema_version: '1.0.0',
  workspace_defaults: {
    workspace_id: 'callweave-daily-create-local',
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
    workspace_id: 'callweave-daily-create-local',
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
    '# Callweave daily-create compatible test app',
    '',
    'This app bundle exercises the host-integrated compatible-mode component',
    'for `callweave.daily-create`. It validates and registers a thin wrapper',
    'around the explainable daily canvas creation contract.',
    '',
    'Generate these files with:',
    '',
    '```bash',
    'node scripts/generate_callweave_daily_create_app.mjs',
    '```',
  ].join('\n') + '\n',
);

console.log(
  JSON.stringify(
    {
      app_manifest: relative(repoRoot, join(appRoot, 'app.manifest.json')),
      component_count: 1,
      workflow_count: 1,
      digest: wrapperDigest,
    },
    null,
    2,
  ),
);

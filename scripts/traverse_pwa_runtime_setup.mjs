import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const traverseManifest = '/Users/enricopiovesan/Documents/repos/Traverse/Cargo.toml';
const appRoot = join(root, 'apps', 'callweave-pwa-runtime');
const manifestPath = join(appRoot, 'app.manifest.json');
const hostActivationPath = join(appRoot, 'host-activation.fixture.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const workspace = manifest.default_config.workspace_id;
const registrationPath = join(root, '.traverse', 'workspaces', workspace, 'apps', manifest.app_id, manifest.version, 'registration.json');

const run = commandArgs => {
  const result = spawnSync('cargo', [
    'run', '--offline', '-q', '--manifest-path', traverseManifest,
    '-p', 'traverse-cli-rs', '--', ...commandArgs,
  ], { cwd: root, encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(['registry', 'sync', '--workspace', workspace, '--json']);
run(['app', 'prepare', '--manifest', manifestPath, '--workspace', workspace, '--json']);
run(['app', 'activate', '--manifest', manifestPath, '--workspace', workspace, '--host-activation', hostActivationPath, '--json']);
try {
  const registration = JSON.parse(await readFile(registrationPath, 'utf8'));
  const digest = `sha256:${createHash('sha256').update(await readFile(manifestPath)).digest('hex')}`;
  if (registration.manifest_digest !== digest) {
    throw new Error(`existing registration for ${manifest.app_id}@${manifest.version} has a different manifest digest; bump the app version before registering`);
  }
  console.log(JSON.stringify({ status: 'already_registered', app_id: manifest.app_id, app_version: manifest.version }));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
  run(['app', 'register', '--manifest', manifestPath, '--workspace', workspace, '--json']);
}

import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const repoRoot = new URL('..', import.meta.url).pathname;
const traverseRepo = '/Users/enricopiovesan/Documents/repos/Traverse';
const traverseManifestPath = join(traverseRepo, 'Cargo.toml');
const runtimeHome = join(repoRoot, '.traverse', 'local');
const cargoTarget = join(runtimeHome, 'cargo-target');
const cargoHome = join(runtimeHome, 'cargo-home');
await mkdir(cargoTarget, { recursive: true });
await mkdir(cargoHome, { recursive: true });

const manifestPath = join(repoRoot, 'apps', 'callweave-daily-close', 'app.manifest.json');
const args = ['run', '-q', '--manifest-path', traverseManifestPath, '-p', 'traverse-cli-rs', '--', 'app', 'register', '--manifest', manifestPath, '--workspace', 'callweave-daily-close-local', '--json'];
const child = spawnSync('cargo', args, {
  cwd: repoRoot,
  encoding: 'utf8',
  env: { ...process.env, TRAVERSE_RUNTIME_HOME: runtimeHome, CARGO_TARGET_DIR: cargoTarget, CARGO_HOME: cargoHome },
});
if (child.stdout) process.stdout.write(child.stdout);
if (child.stderr) process.stderr.write(child.stderr);
process.exit(child.status ?? 1);

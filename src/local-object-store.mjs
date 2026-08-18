import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** Host-owned immutable asset writer, restricted to its configured root. */
export class LocalObjectStore {
  #root;
  constructor(root) { if (!root) throw new Error('store root is required'); this.#root = resolve(root); }

  async put({ assetId, bytes, extension = 'bin' }) {
    if (!/^[A-Za-z0-9._-]+$/.test(assetId) || !/^[A-Za-z0-9]+$/.test(extension)) throw new Error('unsafe asset identifier');
    const data = Buffer.from(bytes);
    const hash = sha256(data);
    const directory = this.#path('objects', hash.slice(0, 2));
    const finalPath = this.#path('objects', hash.slice(0, 2), `${assetId}-${hash}.${extension}`);
    await mkdir(directory, { recursive: true });
    const temporary = this.#path('objects', hash.slice(0, 2), `.${randomUUID()}.partial`);
    await writeFile(temporary, data, { flag: 'wx' });
    await rename(temporary, finalPath);
    return { asset_ref: `sha256:${hash}`, sha256: hash, size_bytes: data.length, path: finalPath };
  }

  #path(...parts) { const path = resolve(this.#root, ...parts); if (relative(this.#root, path).startsWith(`..${sep}`) || path === this.#root) throw new Error('path escapes configured store root'); return path; }
}

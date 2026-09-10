import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const plan = JSON.parse(await readFile(join(root, 'config/test-corpus/long-form-fixtures.json'), 'utf8'));
for (const fixture of plan.fixtures) {
  const bytes = await readFile(join(root, fixture.path));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== fixture.sha256) throw new Error(`${fixture.id}: checksum mismatch`);
  if (fixture.expected_status !== 'unknown') throw new Error(`${fixture.id}: long-form fixtures must remain unknown`);
  if (fixture.duration_seconds < 3600) throw new Error(`${fixture.id}: expected an hour-scale recording`);
}
console.log(`long_form_fixtures=valid count=${plan.fixtures.length}`);

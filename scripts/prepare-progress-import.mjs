import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {pathToFileURL} from 'node:url';

export function importSQL(rows) {
  if (!Array.isArray(rows)) throw new Error('Expected an array of progress rows.');
  const seen = new Set();
  const literal = value => "'" + value.replaceAll("'", "''") + "'";
  const statements = rows.map(row => {
    if (!/^[a-f0-9]{64}$/.test(row.key_hash || '') || seen.has(row.key_hash)) throw new Error('Invalid or duplicate progress identifier.');
    seen.add(row.key_hash);
    if (!Number.isSafeInteger(row.revision) || row.revision < 0 || !Number.isSafeInteger(row.updated_at) || row.updated_at < 0) throw new Error('Invalid progress revision or timestamp.');
    const state = JSON.parse(row.state), mutations = JSON.parse(row.recent_mutations);
    if (!state || Array.isArray(state) || typeof state !== 'object' || !Array.isArray(mutations) || mutations.some(id => typeof id !== 'string')) throw new Error('Invalid progress record.');
    // Preserve existing destination records on retries; never reset newer work.
    return `INSERT INTO lesson_progress (key_hash,state,revision,recent_mutations,updated_at) VALUES (${literal(row.key_hash)},${literal(row.state)},${row.revision},${literal(row.recent_mutations)},${row.updated_at}) ON CONFLICT(key_hash) DO NOTHING;`;
  });
  return statements.join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('Supply the path to a private JSON export.');
  const exported = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const rows = Array.isArray(exported) ? exported : exported.rows;
  const sql = importSQL(rows);
  const output = new URL('../.private-progress/import.sql', import.meta.url);
  await mkdir(dirname(output.pathname), {recursive: true, mode: 0o700});
  await writeFile(output, sql, {mode: 0o600});
  console.log(`Prepared ${rows.length} records in .private-progress/import.sql. Keep this file private; do not upload it to GitHub.`);
}

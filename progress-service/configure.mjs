import {writeFile} from 'node:fs/promises';

const id = process.argv[2];
if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id || '')) {
  throw new Error('Supply the database UUID returned by Cloudflare when creating the new D1 database.');
}
const config = {
  name: 'matter-lab-progress',
  main: 'index.js',
  compatibility_date: '2026-09-07',
  workers_dev: true,
  d1_databases: [{binding: 'DB', database_name: 'matter-lab-progress', database_id: id, migrations_dir: '../drizzle'}],
};
await writeFile(new URL('wrangler.json', import.meta.url), JSON.stringify(config, null, 2) + '\n', {mode: 0o600});
console.log('Independent progress service configured. No database was modified.');

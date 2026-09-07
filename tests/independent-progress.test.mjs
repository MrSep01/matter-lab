import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import service from '../progress-service/index.js';
import {importSQL} from '../scripts/prepare-progress-import.mjs';

test('independent service works without Sites assets and checks schema readiness', async () => {
  assert.equal((await service.fetch(new Request('https://progress.test/'), {})).status,404);
  assert.equal((await service.fetch(new Request('https://progress.test/health'), {})).status,503);
  const ready = await service.fetch(new Request('https://progress.test/health'), {DB:{prepare:()=>({first:async()=>null})}});
  assert.equal(ready.status,200);
  assert.deepEqual(await ready.json(),{ready:true});
  const preflight = await service.fetch(new Request('https://progress.test/api/progress', {method:'OPTIONS',headers:{Origin:'https://mrsep01.github.io','Access-Control-Request-Method':'PATCH','Access-Control-Request-Headers':'authorization,content-type'}}), {});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://mrsep01.github.io');
  const denied=await service.fetch(new Request('https://progress.test/api/progress',{headers:{Origin:'https://mrsep01.github.io'}}),{});
  assert.equal(denied.status,401);
});

test('private transfer preserves exact records and retries cannot overwrite destination work',()=>{
  const db=new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0000_swift_talos.sql',import.meta.url),'utf8'));
  const row={key_hash:'a'.repeat(64),state:JSON.stringify({'field:written-exit':"A student's answer: energy isn't lost.",'game:map-0':true}),revision:8,recent_mutations:JSON.stringify(['saved-mutation-1234']),updated_at:1788760000000};
  db.exec(importSQL([row]));
  assert.deepEqual({...db.prepare('SELECT * FROM lesson_progress').get()},row);
  db.prepare('UPDATE lesson_progress SET revision = 9, state = ?').run('{"field:written-exit":"Newer work"}');
  db.exec(importSQL([row]));
  assert.equal(db.prepare('SELECT revision FROM lesson_progress').get().revision,9);
  assert.equal(JSON.parse(db.prepare('SELECT state FROM lesson_progress').get().state)['field:written-exit'],'Newer work');
  assert.throws(()=>importSQL([row,row]),/duplicate/);
  assert.throws(()=>importSQL([{...row,key_hash:"'; DROP TABLE lesson_progress;--"}]),/identifier/);
  assert.throws(()=>importSQL([{...row,state:'null'}]),/record/);
  db.close();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';

export function database() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0000_swift_talos.sql', import.meta.url), 'utf8'));
  return {db, binding: {prepare(sql) { return {bind(...args) {return {
    async first() {return db.prepare(sql).get(...args) || null;},
    async run() {return {meta: {changes: db.prepare(sql).run(...args).changes}};},
  };}};}}};
}
const tokenA='A'.repeat(43),tokenB='B'.repeat(43);
const call=(env,method,token,body,origin='https://matter.test')=>worker.fetch(new Request('https://matter.test/api/progress',{
  method,headers:{Authorization:'Bearer '+token,Origin:origin,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,
}),env);
test('durable progress is isolated, merged, idempotent and bounded',async()=>{
  const {db,binding}=database(),env={DB:binding};
  assert.equal((await call(env,'GET',tokenA)).status,404);
  assert.equal((await call(env,'GET','bad')).status,401);
  assert.equal((await call(env,'PATCH',tokenA,{patch:{},mutationId:'1'.repeat(20)},'https://elsewhere.test')).status,403);
  const first={patch:{'field:written-exit':'Energy overcomes attractions.','game:map-0':true},mutationId:'first'.repeat(5)};
  assert.equal((await call(env,'PATCH',tokenA,first)).status,200);
  assert.equal((await call(env,'GET',tokenB)).status,404);
  const edits=[{patch:{'field:blank-0':'regular'},mutationId:'second'.repeat(4)},{patch:{'field:exam-answer-0':'Far apart and random.'},mutationId:'third'.repeat(5)}];
  const results=await Promise.all(edits.map(body=>call(env,'PATCH',tokenA,body)));assert(results.every(r=>r.status===200));
  await call(env,'PATCH',tokenA,{patch:{'field:written-exit':'Potential energy increases.'},mutationId:'fourth'.repeat(4)});
  await call(env,'PATCH',tokenA,first); // Lost response retried after a newer edit.
  const record=await (await call(env,'GET',tokenA)).json();
  assert.equal(record.state['field:written-exit'],'Potential energy increases.');
  assert.equal(record.state['field:blank-0'],'regular');assert.equal(record.state['field:exam-answer-0'],'Far apart and random.');
  assert.equal(record.revision,4);
  assert.notEqual(db.prepare('SELECT key_hash FROM lesson_progress').get().key_hash,tokenA);
  assert.equal((await call(env,'PATCH',tokenA,{patch:{'bad-key':true},mutationId:'invalid'.repeat(4)})).status,400);
  assert.equal((await call(env,'PATCH',tokenA,{patch:{'field:x':'x'.repeat(190000)},mutationId:'large'.repeat(5)})).status,413);
  assert.equal((await call({},'GET',tokenA)).status,503);
  const response=await call(env,'GET',tokenA);assert.equal(response.headers.get('Cache-Control'),'no-store');
  db.close();
});

test('GitHub Pages can resume existing work without cookies; other origins cannot', async () => {
  const {db,binding}=database(), env={DB:binding};
  const github='https://mrsep01.github.io';
  const preflight=(origin,method='PATCH',headers='authorization, content-type')=>worker.fetch(new Request('https://matter.test/api/progress',{
    method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':method,'Access-Control-Request-Headers':headers},
  }),env);
  const allowed=await preflight(github);
  assert.equal(allowed.status,204);
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'),github);
  assert.equal(allowed.headers.get('Access-Control-Allow-Credentials'),null);
  assert.equal((await preflight(github,'DELETE')).status,400);
  assert.equal((await preflight(github,'PATCH','x-unexpected')).status,400);
  const denied=await preflight('https://mrsep01.github.io.attacker.test');
  assert.equal(denied.status,403);
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'),null);
  assert.equal((await preflight('null')).status,403);
  await call(env,'PATCH',tokenA,{patch:{'field:written-exit':'Existing saved explanation'},mutationId:'existing'.repeat(4)});
  const resumed=await call(env,'GET',tokenA,null,github);
  assert.equal(resumed.status,200);
  assert.equal(resumed.headers.get('Access-Control-Allow-Origin'),github);
  assert.equal((await resumed.json()).state['field:written-exit'],'Existing saved explanation');
  const changed=await call(env,'PATCH',tokenA,{patch:{'field:blank-0':'regular'},mutationId:'github'.repeat(4)},github);
  assert.equal(changed.status,200);
  assert.equal((await (await call(env,'GET',tokenA)).json()).state['field:blank-0'],'regular');
  const invalid=await call(env,'GET','bad',null,github);
  assert.equal(invalid.status,401);
  assert.equal(invalid.headers.get('Access-Control-Allow-Origin'),github);
  db.close();
});

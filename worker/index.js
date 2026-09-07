const GITHUB_ORIGIN = 'https://mrsep01.github.io';
const jsonResponse = (body, status = 200, corsHeaders = {}) => new Response(JSON.stringify(body), {
  status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Authorization, Origin', ...corsHeaders},
});
const keyPattern = /^[A-Za-z0-9_-]{43}$/;
const fieldPattern = /^(field|quiz|game|arrows|mystery|thermal|temperature|energy|vocabulary|view|feedback|detail):[a-zA-Z0-9_ .-]{1,100}$/;
const MAX_BYTES = 180000;
// Only the hash of the private progress code is stored. No student identity is collected.
async function keyHash(key) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
}
function progressStore(db) {
  return {
    read: hash => db.prepare('SELECT state, revision, recent_mutations, updated_at FROM lesson_progress WHERE key_hash = ?').bind(hash).first(),
    create: (hash, state, mutation, now) => db.prepare('INSERT OR IGNORE INTO lesson_progress (key_hash, state, revision, recent_mutations, updated_at) VALUES (?, ?, 1, ?, ?)').bind(hash, JSON.stringify(state), JSON.stringify([mutation]), now).run(),
    update: (hash, state, mutations, revision, now) => db.prepare('UPDATE lesson_progress SET state = ?, recent_mutations = ?, revision = revision + 1, updated_at = ? WHERE key_hash = ? AND revision = ?').bind(JSON.stringify(state), JSON.stringify(mutations), now, hash, revision).run(),
  };
}
function publicRecord(row) { return {state: JSON.parse(row.state), revision: row.revision, updatedAt: row.updated_at}; }
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    const origin = request.headers.get('Origin');
    const allowedOrigin = origin === url.origin || origin === GITHUB_ORIGIN;
    const json = (body, status = 200) => jsonResponse(body, status, allowedOrigin ? {'Access-Control-Allow-Origin': origin} : {});
    if (url.pathname !== '/api/progress') return json({error: 'Not found'}, 404);
    if (origin && !allowedOrigin) return json({error: 'Use this app to save your work.'}, 403);
    // Pages uses the same private progress codes and database as the original app.
    // Preflight carries no progress code; the GET/PATCH request still requires it.
    if (request.method === 'OPTIONS') {
      const method = request.headers.get('Access-Control-Request-Method');
      const headers = (request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(header => header.trim()).filter(Boolean);
      if (!allowedOrigin || !['GET', 'PATCH'].includes(method) || headers.some(header => !['authorization', 'content-type'].includes(header))) return json({error: 'Unsupported save request.'}, 400);
      return new Response(null, {status: 204, headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, PATCH',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '600',
        'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
      }});
    }
    if (!['GET', 'PATCH'].includes(request.method)) return json({error: 'Method not allowed'}, 405);
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
    if (!keyPattern.test(token)) return json({error: 'A valid progress code is needed.'}, 401);
    if (!env.DB) return json({error: 'Saving is temporarily unavailable.'}, 503);
    try {
      const hash = await keyHash(token), store = progressStore(env.DB);
      if (request.method === 'GET') {
        const row = await store.read(hash);
        return row ? json(publicRecord(row)) : json({error: 'Progress code not found.'}, 404);
      }
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error: 'Expected JSON.'}, 415);
      if (Number(request.headers.get('Content-Length')) > MAX_BYTES) return json({error: 'This save is too large.'}, 413);
      // Bound bytes even when the sender omits Content-Length.
      const reader = request.body?.getReader();
      if (!reader) return json({error: 'Missing save.'}, 400);
      const chunks = []; let bytes = 0;
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > MAX_BYTES) { await reader.cancel(); return json({error: 'This save is too large.'}, 413); }
        chunks.push(chunk.value);
      }
      let payload;
      try { payload = JSON.parse(await new Blob(chunks).text()); } catch { return json({error: 'Invalid save.'}, 400); }
      const {patch, mutationId} = payload || {};
      if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).length > 250 || !/^[A-Za-z0-9_-]{16,80}$/.test(mutationId || '')) return json({error: 'Invalid save.'}, 400);
      if (Object.entries(patch).some(([key, value]) => !fieldPattern.test(key) || JSON.stringify(value).length > 60000)) return json({error: 'Invalid progress field.'}, 400);
      // Compare-and-swap avoids dropping independent answers saved by another tab.
      // Retried requests have one stable ID, so a lost reply never applies an old edit twice.
      for (let attempt = 0; attempt < 6; attempt++) {
        const row = await store.read(hash), now = Date.now();
        if (!row) {
          const created = await store.create(hash, patch, mutationId, now);
          if (created.meta.changes) return json({state: patch, revision: 1, updatedAt: now});
          continue;
        }
        const mutations = JSON.parse(row.recent_mutations);
        if (mutations.includes(mutationId)) return json(publicRecord(row));
        const state = {...JSON.parse(row.state), ...patch};
        if (JSON.stringify(state).length > 240000) return json({error: 'Your saved work is too large.'}, 413);
        const updated = await store.update(hash, state, [...mutations, mutationId].slice(-80), row.revision, now);
        if (updated.meta.changes) return json({state, revision: row.revision + 1, updatedAt: now});
      }
      return json({error: 'Saving is busy. Please retry.'}, 503);
    } catch (error) {
      console.error('Progress storage unavailable', error instanceof Error ? error.name : 'StorageError');
      return json({error: 'Saving is temporarily unavailable. Your current work is kept on this device.'}, 503);
    }
  },
};

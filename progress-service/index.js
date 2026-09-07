import progress from '../worker/index.js';

// Standalone API: no Sites runtime, website assets, or ChatGPT sign-in required.
export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path === '/health' && request.method === 'GET') {
      try {
        if (!env.DB) throw new Error('Database is not configured');
        await env.DB.prepare('SELECT key_hash FROM lesson_progress LIMIT 1').first();
        return Response.json({ready: true}, {headers: {'Cache-Control': 'no-store'}});
      } catch {
        return Response.json({ready: false}, {status: 503, headers: {'Cache-Control': 'no-store'}});
      }
    }
    if (path !== '/api/progress') return new Response('Not found', {status: 404});
    return progress.fetch(request, env, ctx);
  },
};

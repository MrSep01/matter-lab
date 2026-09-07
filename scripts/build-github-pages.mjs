import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

// Validate the endpoint before writing any published files.
const config = JSON.parse(await readFile('progress-config.json', 'utf8'));
const endpoint = new URL(config.progressApi);
if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/api/progress') {
  throw new Error('progressApi must be an HTTPS /api/progress URL without credentials, query or fragment.');
}
const attribute = endpoint.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
// Keep assets on GitHub so the lesson can open independently of the save service.
await mkdir('docs', {recursive: true});
await cp('public', 'docs', {recursive: true});
const original = await readFile('public/index.html', 'utf8');
const html = original.replace('</head>', `<meta name="progress-api" content="${attribute}"></head>`)
  .replace('Your answers, badges and practice save automatically.', 'Your answers, badges and practice save automatically. To bring work from the previous Matter Lab site, paste its progress code below.');
await writeFile('docs/index.html', html);
await writeFile('docs/.nojekyll', '');
console.log('GitHub Pages ready in docs/. Publish main /docs in GitHub Settings → Pages.');

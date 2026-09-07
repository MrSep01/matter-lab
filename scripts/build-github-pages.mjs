import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

// Keep assets on GitHub so the lesson can open independently of the save service.
await mkdir('docs', {recursive: true});
await cp('public', 'docs', {recursive: true});
const original = await readFile('public/index.html', 'utf8');
const html = original.replace('</head>', '<meta name="progress-api" content="https://sep-matter-lab.sep-apchem.chatgpt.site/api/progress"></head>')
  .replace('Your answers, badges and practice save automatically.', 'Your answers, badges and practice save automatically. To bring work from the previous Matter Lab site, paste its progress code below.');
await writeFile('docs/index.html', html);
await writeFile('docs/.nojekyll', '');
console.log('GitHub Pages ready in docs/. Publish main /docs in GitHub Settings → Pages.');

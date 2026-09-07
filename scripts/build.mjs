import { cp, mkdir, rm } from 'node:fs/promises';
// The original lesson stays buildless in public; only hosting layout changes.
await rm('dist', {recursive: true, force: true});
await mkdir('dist/server', {recursive: true});
await mkdir('dist/.openai', {recursive: true});
await cp('public', 'dist/client', {recursive: true});
await cp('worker/index.js', 'dist/server/index.js');
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('drizzle', 'dist/.openai/drizzle', {recursive: true});
console.log('Lesson, progress service and migrations built.');

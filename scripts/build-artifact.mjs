// Builds dist/index.html for publishing as a claude.ai Artifact:
// the host supplies <html>/<head>/<body>, and viewer sandboxes block page-started downloads.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const head = src.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>\s*/, '')
  .replace(/<meta name="viewport"[^>]*>\s*/, '');
const body = src.match(/<body>([\s\S]*?)<\/body>/)[1]
  .replace(/\s*<button[^>]*data-action="download"[^>]*>[\s\S]*?<\/button>/, '');

const out = `${head.trim()}\n${body.trim()}\n`;
assert.ok(out.startsWith('<meta') || out.startsWith('<title'), 'head content first');
assert.ok(out.includes('<title>AGL Motion Concept</title>'));
assert.ok(!/<\/?(html|head|body)[\s>]/.test(out) && !out.includes('<!doctype'), 'no document skeleton');
assert.ok(!out.includes('data-action="download"'), 'download button removed');
assert.ok(out.includes('data-action="copy"'), 'copy button kept');

mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/index.html', import.meta.url), out);
console.log('dist/index.html', out.length, 'bytes');

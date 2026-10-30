import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { questions } from '../server/questionBank.js';

const assets = await readdir(new URL('../dist/assets/', import.meta.url));
const scripts = await Promise.all(assets.filter(file => file.endsWith('.js') || file.endsWith('.map')).map(file => readFile(new URL(`../dist/assets/${file}`, import.meta.url), 'utf8')));
assert.ok(scripts.length, 'Build must exist before checking browser bundle');
for (const q of questions) {
  for (const script of scripts) {
    assert.ok(!script.includes(q.question), `Question bank leaked into public bundle: ${q.id}`);
  }
}
console.log('PASS: no private question-bank text is shipped in the browser build.');

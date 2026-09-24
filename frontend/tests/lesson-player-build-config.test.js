import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const tsconfigSource = fs.readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const tsconfig = JSON.parse(tsconfigSource);

test('lesson player supports Plyr default import typings during Angular compilation', () => {
  assert.equal(tsconfig.compilerOptions.allowSyntheticDefaultImports, true);
});

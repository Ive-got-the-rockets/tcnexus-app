import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const configUrl = new URL('../vercel.json', import.meta.url);

test('serves Angular routes through the SPA entrypoint on Vercel', () => {
  assert.equal(existsSync(configUrl), true, 'frontend/vercel.json must configure the SPA fallback');
  const config = JSON.parse(readFileSync(configUrl, 'utf8'));
  assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
});

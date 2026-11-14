import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverPath = path.join(frontendRoot, 'mock-api', 'server.js');

test('normal local Angular environment uses the local preview API', async () => {
  const environment = await readFile(path.join(frontendRoot, 'src', 'environments', 'environment.ts'), 'utf8');
  assert.match(environment, /apiBaseUrl:\s*['"]http:\/\/127\.0\.0\.1:8787\/wp-json\/tcnexus\/v1['"]/);
});

test('the local preview forwards Live Shows to the local WordPress backend', async () => {
  const server = await readFile(serverPath, 'utf8');

  assert.match(server, /LOCAL_WORDPRESS_API_BASE/);
  assert.match(server, /\/wp-json\/tcnexus\/v1\/live-shows/);
  assert.match(server, /\$\{LOCAL_WORDPRESS_API_BASE\}\/live-shows/);
});

test('the local preview forwards Shows to the local WordPress backend', async () => {
  const server = await readFile(serverPath, 'utf8');

  assert.match(server, /\$\{LOCAL_WORDPRESS_API_BASE\}\/shows/);
});

async function waitForServer(url, child) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The mock server needs a moment to bind its port.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  child.kill();
  throw new Error('Mock API did not become ready in time.');
}

test('local mock API exposes 10 platform courses, 10 trading courses, and 10 shows', async () => {
  const port = 18000 + Math.floor(Math.random() * 500);
  const child = spawn(process.execPath, [serverPath], {
    cwd: frontendRoot,
    env: { ...process.env, MOCK_API_PORT: String(port), TCNEXUS_SYNC_STAGING: '0' },
    stdio: 'ignore'
  });
  const baseUrl = `http://127.0.0.1:${port}/wp-json/tcnexus/v1`;

  try {
    await waitForServer(`${baseUrl}/courses`, child);
    const [coursesResponse, showsResponse] = await Promise.all([
      fetch(`${baseUrl}/courses`),
      fetch(`${baseUrl}/shows`)
    ]);
    const courses = await coursesResponse.json();
    const shows = await showsResponse.json();
    const localCourses = courses.filter((course) => course.local_demo === true);
    const localShows = shows.filter((show) => show.local_demo === true);
    const platform = localCourses.filter((course) => course.course_types.includes('Platform'));
    const trading = localCourses.filter((course) => !course.course_types.includes('Platform'));

    assert.equal(platform.length, 10);
    assert.equal(trading.length, 10);
    assert.equal(localShows.length, 10);

    for (const record of [...localCourses, ...localShows]) {
      assert.match(record.thumbnail, /^\/mock-content\//);
      assert.match(record.image, /^\/mock-content\//);
      assert.ok(record.lesson_count > 0);
    }
  } finally {
    child.kill();
  }
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const mockServer = fs.readFileSync(path.join(root, 'mock-api/server.js'), 'utf8');
const livePlayer = fs.readFileSync(path.join(root, 'src/app/features/live-player/live-player.ts'), 'utf8');

assert.match(
  mockServer,
  /fetch\(`\$\{LOCAL_WORDPRESS_API_BASE\}\/courses\/\$\{detailMatch\[1\]\}`\)/,
  'published Show detail requests must be forwarded to local WordPress before using fixtures'
);
assert.match(
  livePlayer,
  /coursesService\.getLiveShows\(\)/,
  'published Live Show pages must load from the Live Shows catalog'
);
assert.match(
  livePlayer,
  /String\(show\.id\) === this\.liveShowId/,
  'the live detail page must find the saved Live Show by its WordPress id'
);

console.log('published Show and Live Show detail contracts pass');

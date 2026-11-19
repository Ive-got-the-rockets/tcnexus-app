const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const player = fs.readFileSync(path.join(root, 'src/app/features/live-player/live-player.ts'), 'utf8');
const workspace = fs.readFileSync(path.join(root, 'src/app/features/live-stream-layout/live-stream-layout.ts'), 'utf8');

assert.match(player, /queryParams:\s*\{[^}]*liveShowId/);
assert.match(workspace, /queryParamMap\.get\('liveShowId'\)/);
assert.match(workspace, /navigate\(\['\/live',\s*this\.liveShowId\]/);
assert.doesNotMatch(workspace, /\['\/live',\s*'market-open-live'\]/);

console.log('live stream Exit returns to the originating show');

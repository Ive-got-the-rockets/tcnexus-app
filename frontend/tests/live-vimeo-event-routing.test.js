const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const restApi = fs.readFileSync(path.join(root, '../wordpress-plugin/tcnexus-lms/includes/class-tcnexus-rest-api.php'), 'utf8');
const livePlayer = fs.readFileSync(path.join(root, 'src/app/features/live-player/live-player.ts'), 'utf8');
const workspace = fs.readFileSync(path.join(root, 'src/app/features/live-stream-layout/live-stream-layout.ts'), 'utf8');

assert.match(restApi, /'vimeo_live_event_id'\s*=>\s*get_post_meta\( \$course->ID, TCNexus_Live_Show_Builder::LIVE_STREAM_META_KEY, true \)/,
  'the Live Show catalog must expose its saved Vimeo event id');
assert.match(livePlayer, /vimeoLiveEventId: catalogShow\.vimeo_live_event_id \|\| undefined/,
  'opening a saved Live Show must retain its Vimeo event id');
assert.match(livePlayer, /queryParams: \{ liveTitle: title, vimeoLiveEventId, liveShowId \}/,
  'the Live Show page must pass its Vimeo event id and originating show into the workspace');
assert.match(workspace, /queryParamMap\.get\('vimeoLiveEventId'\)/,
  'the workspace must read the event id from the Live Show page');
assert.match(workspace, /https:\/\/vimeo\.com\/event\/\$\{this\.vimeoLiveEventId\}\/embed/,
  'the video iframe must use the saved Vimeo event id');
assert.match(workspace, /live_event\/\$\{this\.vimeoLiveEventId\}/,
  'the chat iframe must use the saved Vimeo event id');
assert.doesNotMatch(workspace, /event\/6354032\/embed/,
  'the deleted demo event must not remain hard-coded');

console.log('live Vimeo event routing contract passes');

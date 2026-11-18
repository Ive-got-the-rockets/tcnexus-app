const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const builder = fs.readFileSync(path.join(root, 'includes', 'class-tcnexus-live-show-builder.php'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets', 'live-show-builder.js'), 'utf8');

assert.match(builder, /data-tcn-live-preview="video"[^>]*>Test Video<\/button>/,
  'the Live Stream panel must expose an active video preview button');
assert.match(builder, /data-tcn-live-preview="chat"[^>]*>Test Chat<\/button>/,
  'the Live Stream panel must expose an active chat preview button');
assert.doesNotMatch(builder, /<button type="button" class="tcn-btn-ghost" disabled>Test (Video|Chat)<\/button>/,
  'Live Stream preview controls must not be disabled');
assert.match(script, /data-tcn-live-preview/,
  'the builder script must handle Live Stream preview controls');
assert.match(script, /https:\/\/vimeo\.com\/event\/.*\/embed/,
  'video preview must open Vimeo\'s event embed');
assert.match(script, /https:\/\/vimeo\.com\/live\/interaction_tools\/live_event\//,
  'chat preview must open Vimeo\'s event chat');

console.log('live stream preview buttons contract passes');

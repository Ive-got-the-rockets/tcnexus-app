const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const component = fs.readFileSync(path.join(root, 'src/app/features/live-stream-layout/live-stream-layout.ts'), 'utf8');
const template = fs.readFileSync(path.join(root, 'src/app/features/live-stream-layout/live-stream-layout.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/app/features/live-stream-layout/live-stream-layout.scss'), 'utf8');

assert.doesNotMatch(template, />Show<\/button>/, 'the standalone Show control must be removed');
assert.match(template, /\{\{ showChat \? 'Hide Chat' : 'Show Chat' \}\}/, 'the Chat control must describe its current action');
assert.match(component, /protected showChat = false;/, 'Chat visibility must be independent state');
assert.match(component, /protected showTcApp = false;/, 'TC-LENS visibility must be independent state');
assert.match(component, /protected showTcLensAi = false;/, 'AI visibility must be independent state');
assert.match(template, /@if \(showChat\) \{ <aside class="live-stream-chat"/, 'Chat must render only when enabled');
assert.match(template, /@if \(showTcLensAi\) \{ <section class="live-stream-bottom"/, 'AI must use the lower panel');
assert.match(styles, /\.live-stream-bottom--with-chat\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)\}/, 'Chat and AI must split the lower panel');
assert.match(styles, /\.live-stream-bottom--ai-only\{grid-template-columns:1fr\}/, 'AI must fill the lower panel when Chat is hidden');

console.log('live workspace panel toggle contract passes');

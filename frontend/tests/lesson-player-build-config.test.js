import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const tsconfigSource = fs.readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const tsconfig = JSON.parse(tsconfigSource);

test('lesson player supports Plyr default import typings during Angular compilation', () => {
  assert.equal(tsconfig.compilerOptions.allowSyntheticDefaultImports, true);
});

test('theater X-Ray layout reserves the reference bottom gap', () => {
  const lessonPlayerSource = fs.readFileSync(new URL('../src/app/features/lesson-player/lesson-player.ts', import.meta.url), 'utf8');

  assert.match(lessonPlayerSource, /const XRAY_BOTTOM_BAR_HEIGHT = 180;/);
  assert.match(lessonPlayerSource, /computeDockedXrayLayout\(XRAY_PANEL_WIDTH, XRAY_BOTTOM_BAR_HEIGHT\)/);
  assert.match(lessonPlayerSource, /panelRightInset/);
  assert.match(lessonPlayerSource, /bottomBarRightInset/);
  assert.match(lessonPlayerSource, /xrayPanel\.style\.right/);
  assert.match(lessonPlayerSource, /xrayBottomBar\.style\.left/);
  assert.match(lessonPlayerSource, /bottomBarHeight/);
  assert.match(lessonPlayerSource, /xrayBottomBar\.style\.setProperty\('height', `\$\{bottomBarHeight\}px`, 'important'\)/);
  assert.match(lessonPlayerSource, /videoWrapper\.style\.setProperty\('height', `\$\{rect\.height\}px`, 'important'\)/);

  const lessonPlayerStyles = fs.readFileSync(new URL('../src/app/features/lesson-player/lesson-player.scss', import.meta.url), 'utf8');
  assert.match(lessonPlayerStyles, /\.player-page\s*\{[\s\S]*background: #000;/);
});

test('the local static bundle includes the current theater sizing', () => {
  const frontendRoot = new URL('..', import.meta.url);
  const index = fs.readFileSync(new URL('index.html', frontendRoot), 'utf8');
  const stylesheet = index.match(/href="([^"]+\.css)"/)?.[1];
  const script = index.match(/src="([^"]+\.js)" type="module"/)?.[1];

  assert.ok(stylesheet, 'local index should reference a stylesheet');
  assert.ok(script, 'local index should reference the application bundle');
  const stylesheetSource = fs.readFileSync(new URL(stylesheet, frontendRoot), 'utf8');
  assert.match(stylesheetSource, /width:calc\(100vw - 440px\)!important/);
  assert.match(stylesheetSource, /min-height:180px!important/);
  assert.doesNotMatch(stylesheetSource, /max-height:180px!important/);
  assert.match(fs.readFileSync(new URL(script, frontendRoot), 'utf8'), /180/);
});

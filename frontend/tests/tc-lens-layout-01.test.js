import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const routes = readFileSync(new URL('../src/app/app.routes.ts', import.meta.url), 'utf8');
const templateUrl = new URL('../src/app/features/tc-lens-layout-01/tc-lens-layout-01.html', import.meta.url);
const stylesUrl = new URL('../src/app/features/tc-lens-layout-01/tc-lens-layout-01.scss', import.meta.url);
const componentUrl = new URL('../src/app/features/tc-lens-layout-01/tc-lens-layout-01.ts', import.meta.url);
const lessonPlayerUrl = new URL('../src/app/features/lesson-player/lesson-player.ts', import.meta.url);
const layoutRoutingUrl = new URL('../src/app/features/lesson-player/local-layout-one.ts', import.meta.url);

test('registers TC Lens Layout 01 without changing the lesson-player route', () => {
  assert.match(routes, /path: 'tc-lens-layout-01', component: TcLensLayout01Page, data: \{ hideChrome: true \}/);
  assert.match(routes, /path: 'courses\/:id\/lessons\/:lessonId', component: LessonPlayerPage, data: \{ hideChrome: true \}/);
});

test('renders account, video, LLM, and app regions in semantic order', () => {
  const template = readFileSync(templateUrl, 'utf8');
  const regions = [...template.matchAll(/data-region="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(regions, ['account', 'video', 'llm', 'app']);
  assert.match(template, /<iframe[\s\S]*?\[title\]="lessonTitle\(\)"[\s\S]*?\[src\]="videoUrl"/);
  assert.match(template, /<iframe[\s\S]*?title="TC Lens app"[\s\S]*?\[src\]="tcLensUrl"/);
});

test('reuses the existing TC Lens URL helper', () => {
  const component = readFileSync(componentUrl, 'utf8');
  assert.match(component, /import \{ buildTcLensUrl \} from '\.\.\/lesson-player\/tc-lens-url';/);
  assert.match(component, /buildTcLensUrl\(TC_APP_ORIGIN, this\.lessonId\)/);
  assert.match(component, /query\.set\('tcLensHost', 'workspace'\)/);
  assert.match(component, /positiveId\('lessonId', 66\)/);
});

test('connects the tutor to the same app frame and lesson identifiers', () => {
  const template = readFileSync(templateUrl, 'utf8');
  const component = readFileSync(componentUrl, 'utf8');
  assert.match(template, /<tc-tutor[^>]*\[attr\.video-id\]="lessonId"[^>]*\[attr\.chapter\]="chapter\(\)"[^>]*app-frame="#tc-workspace-app"/);
  assert.match(template, /<iframe[^>]*id="tc-workspace-app"/);
  assert.match(component, /json\.textContent = JSON\.stringify\(buildTcLessonContext\(this\.lesson\)\)/);
  assert.match(component, /readWorkspacePlayback\(event, window\.location\.origin/);
});

test('keeps the app column and responsive regions in the workspace', () => {
  const styles = readFileSync(stylesUrl, 'utf8');
  assert.match(styles, /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(570px, 570px\)/);
  assert.match(styles, /grid-template-rows:[^;]*minmax\(350px,/);
  assert.match(styles, /\.tc-lens-layout__llm\s*\{[\s\S]*?min-height:\s*350px/);
  assert.match(styles, /\.tc-lens-layout__video\s*\{[\s\S]*?aspect-ratio:\s*auto/);
  assert.match(styles, /gap:\s*4px/);
  assert.match(styles, /background:\s*#2d3947/);
  assert.match(styles, /height:\s*100dvh/);
  assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*?\.tc-lens-layout__app\s*\{[\s\S]*?width:\s*min\(clamp\(280px,\s*70vw,\s*400px\), 100%\)/);
  assert.match(styles, /grid-template-areas:[\s\S]*?"account"[\s\S]*?"video"[\s\S]*?"llm"[\s\S]*?"app"/);
  assert.match(styles, /overflow-x:\s*hidden/);
});

test('preserves the live workspace entry and both distinct exit paths', () => {
  const template = readFileSync(templateUrl, 'utf8');
  const component = readFileSync(componentUrl, 'utf8');
  const player = readFileSync(lessonPlayerUrl, 'utf8');
  const routing = readFileSync(layoutRoutingUrl, 'utf8');
  assert.match(template, /class="tc-lens-workspace-exit"[\s\S]*?\(click\)="exitWorkspace\(\)"/);
  assert.match(component, /workspaceExitUrl\(this\.courseId, this\.lessonId, this\.currentTime/);
  assert.match(routing, /search\.set\('layout', '0'\)[\s\S]*?search\.set\('resume', String\(safePlaybackSecond\(currentTime\)\)\)/);
  assert.match(player, /workspaceEntryUrl\(course\.id, lesson\.id, this\.player\?\.currentTime/);
  assert.match(player, /createCloseButton\(\)[\s\S]*?this\.router\.navigate\(\['\/courses', course\.id\]\)/);
});

test('makes the video X close the entire TC Lens workspace', () => {
  const component = readFileSync(componentUrl, 'utf8');
  const player = readFileSync(lessonPlayerUrl, 'utf8');
  assert.match(player, /usesWorkspacePane\(\)[\s\S]*?type:\s*'tc-nexus-close-workspace'[\s\S]*?window\.parent\.postMessage/);
  assert.match(component, /readWorkspaceClose\(event, window\.location\.origin[\s\S]*?window\.location\.assign\(`\/courses\/\$\{this\.courseId\}`\)/);
});

test('animates into the live workspace while the TradeCheetah iframe loads', () => {
  const template = readFileSync(templateUrl, 'utf8');
  const styles = readFileSync(stylesUrl, 'utf8');
  assert.match(template, /class="tc-lens-frame tc-lens-layout__app"[^>]*class\.tc-lens-layout__app--ready/);
  assert.match(template, /class="tc-lens-pane-loading"[\s\S]*?Loading TradeCheetah/);
  assert.match(styles, /@keyframes tc-lens-app-enter/);
  assert.match(styles, /@keyframes tc-lens-tutor-enter/);
  assert.match(styles, /view-transition-name:\s*tc-nexus-video/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test('mirrors the workspace animation before exiting back to the player', () => {
  const template = readFileSync(templateUrl, 'utf8');
  const component = readFileSync(componentUrl, 'utf8');
  const styles = readFileSync(stylesUrl, 'utf8');
  assert.match(template, /\[class\.tc-lens-layout--exiting\]="exiting\(\)"/);
  assert.match(component, /exiting\.set\(true\)[\s\S]*?setTimeout\([\s\S]*?workspaceExitUrl/);
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(styles, /\.tc-lens-layout--exiting \.tc-lens-layout__app[\s\S]*?translateX\(56px\)/);
  assert.match(styles, /\.tc-lens-layout--exiting \.tc-lens-layout__llm[\s\S]*?translateY\(42px\)/);
  assert.match(styles, /\.tc-lens-layout--exiting[\s\S]*?pointer-events:\s*none/);
});

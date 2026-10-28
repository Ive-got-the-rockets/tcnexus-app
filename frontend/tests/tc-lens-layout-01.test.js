import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const routes = readFileSync(new URL('../src/app/app.routes.ts', import.meta.url), 'utf8');
const templateUrl = new URL('../src/app/features/tc-lens-layout-01/tc-lens-layout-01.html', import.meta.url);
const stylesUrl = new URL('../src/app/features/tc-lens-layout-01/tc-lens-layout-01.scss', import.meta.url);
const componentUrl = new URL('../src/app/features/tc-lens-layout-01/tc-lens-layout-01.ts', import.meta.url);

test('registers TC Lens Layout 01 without changing the lesson-player route', () => {
  assert.match(routes, /path: 'tc-lens-layout-01', component: TcLensLayout01Page, data: \{ hideChrome: true \}/);
  assert.match(routes, /path: 'courses\/:id\/lessons\/:lessonId', component: LessonPlayerPage, data: \{ hideChrome: true \}/);
});

test('renders account, video, LLM, and app regions in semantic order', () => {
  const template = readFileSync(templateUrl, 'utf8');
  const regions = [...template.matchAll(/data-region="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(regions, ['account', 'video', 'llm', 'app']);
  assert.match(template, /<iframe[\s\S]*?title="TC Lens app"[\s\S]*?\[src\]="tcLensUrl"/);
});

test('reuses the existing TC Lens URL helper', () => {
  const component = readFileSync(componentUrl, 'utf8');
  assert.match(component, /import \{ buildTcLensUrl \} from '\.\.\/lesson-player\/tc-lens-url';/);
  assert.match(component, /buildTcLensUrl\('https:\/\/app\.tradecheetah\.com', 123\)/);
});

test('keeps the LLM frame at least 300px tall and stacks without overflow', () => {
  const styles = readFileSync(stylesUrl, 'utf8');
  assert.match(styles, /\.tc-lens-layout__llm\s*\{[\s\S]*?min-height:\s*300px/);
  assert.match(styles, /@media \(max-width:\s*900px\)[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(styles, /grid-template-areas:[\s\S]*?"account"[\s\S]*?"video"[\s\S]*?"llm"[\s\S]*?"app"/);
  assert.match(styles, /overflow-x:\s*hidden/);
});

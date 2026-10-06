const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'layout-style-3.ts'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, 'layout-style-3.html'), 'utf8');
const resizeObserverCallback = source.match(/this\.resizeObserver = new ResizeObserver\(\(\) => \{([\s\S]*?)\n\s*\}\);/i)?.[1] ?? '';

assert.match(
  resizeObserverCallback,
  /this\.measureEdges\(['"]shows['"]\)/,
  'The resize observer must remeasure the Shows carousel after async cards render.',
);
assert.match(
  template,
  /#showsTrack[^>]*\(edgesChange\)="onCarouselEdgesChange\('shows', \$event\)"/,
  'The Shows track must publish its live scroll edge state to the navigation controls.',
);
assert.match(
  template,
  /#platformTrack[^>]*\(edgesChange\)="onCarouselEdgesChange\('platform', \$event\)"/,
  'The Platform track must use the same live scroll edge state as the reference carousel.',
);
assert.match(
  template,
  /#track[^>]*\(edgesChange\)="onCarouselEdgesChange\('trading', \$event\)"/,
  'The Trading track must expose the shared edge-state contract.',
);

console.log('shows carousel navigation contract passes');

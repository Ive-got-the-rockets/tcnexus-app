const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'layout-style-3.ts'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, 'layout-style-3.html'), 'utf8');

assert.match(
  source,
  /this\.scrollSettledTimers\[kind\] = setTimeout\(\(\) => \{[\s\S]*?this\.onCarouselScrollSettled\(kind\)/,
  'Carousel scrolling state must settle asynchronously after scroll activity stops.',
);
assert.match(
  source,
  /const previousTimer = this\.scrollSettledTimers\[kind\][\s\S]*?clearTimeout\(previousTimer\)/,
  'Carousel scroll settling must debounce repeated scroll events.',
);
const directive = fs.readFileSync(path.join(__dirname, '..', 'catalog', 'row-scroll.directive.ts'), 'utf8');
assert.match(
  directive,
  /scrollSettled\s*=\s*new EventEmitter<void>\(\)/,
  'The shared row-scroll directive must expose a true scroll-settled event.',
);
assert.match(
  directive,
  /addEventListener\('scrollend', this\.onScrollEnd/,
  'The shared row-scroll directive must notify navigation when smooth scrolling ends.',
);
assert.match(
  template,
  /!showsEdges\(\)\.atStart && !scrolling\.shows\(\)/,
  'The Shows previous navigation must remain hidden while the row is moving.',
);

console.log('carousel scroll settling contract passes');

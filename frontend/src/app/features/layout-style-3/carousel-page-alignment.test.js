const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'layout-style-3.ts'), 'utf8');

assert.doesNotMatch(
  source,
  /Math\.ceil\(length \/ 5\)/,
  'Carousel page counts must not hard-code five cards per page.',
);
assert.doesNotMatch(
  source,
  /cards\[page \* 5\]/,
  'Carousel page jumps must use the active responsive card count.',
);
assert.match(
  source,
  /private carouselPageTargets\([\s\S]*?card\.offsetLeft - edgeInset/,
  'Carousel page targets must leave room for the incoming partial card.',
);
assert.match(
  source,
  /const pageTargets = this\.carouselPageTargets\(track, cards, cardsPerPage\)/,
  'All carousel navigation paths must use the adjusted page targets.',
);
assert.match(
  source,
  /this\.pageIndex\[kind\]\.set\(page\)/,
  'Selecting a pagination dot must immediately update the active page indicator.',
);
assert.match(
  source,
  /this\.measureEdges\(kind\);/,
  'Settling a carousel must resynchronize the active page indicator.',
);
assert.match(
  source,
  /private carouselEdgeInset\(/,
  'Carousel edge spacing must be measured from the rendered card geometry.',
);
assert.match(
  source,
  /private balanceCarouselPartials\(/,
  'Carousel navigation must balance the rendered left and right partial cards.',
);
assert.match(
  source,
  /this\.balanceCarouselPartials\(kind\)/,
  'Carousel partial-card balancing must run when scrolling settles.',
);
assert.match(
  source,
  /this\.scrollSettledTimers\[kind\] = setTimeout\(\(\) => \{[\s\S]*?this\.onCarouselScrollSettled\(kind\)/,
  'The fallback settle timer must also balance the partial cards.',
);

console.log('carousel page alignment contract passes');

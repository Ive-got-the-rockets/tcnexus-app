import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const routes = readFileSync(new URL('../src/app/app.routes.ts', import.meta.url), 'utf8');
const templateUrl = new URL('../src/app/features/mobile-layout-1/mobile-layout-1.html', import.meta.url);
const childTemplateUrl = new URL('../src/app/features/layout-style-3/layout-style-3.html', import.meta.url);
const stylesUrl = new URL('../src/app/features/mobile-layout-1/mobile-layout-1.scss', import.meta.url);
const componentUrl = new URL('../src/app/features/mobile-layout-1/mobile-layout-1.ts', import.meta.url);
const childComponentUrl = new URL('../src/app/features/layout-style-3/layout-style-3.ts', import.meta.url);

test('registers Mobile Layout 1 as an isolated page', () => {
  assert.match(routes, /path: 'mobile-layout-1', component: MobileLayout1Page, data: \{ hideChrome: true \}/);
});

test('renders hamburger, wordmark, cart, and profile in mobile header order', () => {
  const template = readFileSync(templateUrl, 'utf8');
  const controls = [...template.matchAll(/data-mobile-control="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(controls, ['menu', 'wordmark', 'cart', 'profile']);
  assert.match(template, /aria-label="Cart"/);
  assert.match(template, /aria-label="Profile"/);
  assert.match(template, /aria-label="Open navigation menu"/);
  assert.match(template, /\[attr\.aria-expanded\]="menuOpen\(\)"/);
});

test('places every current navigation item in the hamburger menu', () => {
  const template = readFileSync(templateUrl, 'utf8');

  for (const label of ['Home', 'Trading Courses', 'Platform Courses', 'Shows', 'Store']) {
    assert.match(template, new RegExp(`>${label}<`));
  }
});

test('keeps mobile layout styling local and touch friendly', () => {
  const styles = readFileSync(stylesUrl, 'utf8');
  const component = readFileSync(componentUrl, 'utf8');

  assert.match(component, /selector: 'app-mobile-layout-1'/);
  assert.match(component, /imports: \[RouterLink, LayoutStyle3Page\]/);
  assert.match(styles, /\.mobile-layout-1__action[\s\S]*?min-width:\s*44px[\s\S]*?min-height:\s*44px/);
  assert.match(styles, /@media \(min-width:\s*600px\)/);
});

test('fits the complete featured artwork to the phone width', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__background\s*\{[\s\S]*?width:\s*100vw[\s\S]*?aspect-ratio:\s*16\s*\/\s*9/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__background img\s*\{[\s\S]*?width:\s*100%[\s\S]*?height:\s*100%[\s\S]*?object-fit:\s*contain\s*!important/);
});

test('uses the supplied Top Gun artwork only through the mobile featured override', () => {
  const template = readFileSync(templateUrl, 'utf8');
  const component = readFileSync(componentUrl, 'utf8');
  const catalogComponent = readFileSync(new URL('../src/app/features/layout-style-3/layout-style-3.ts', import.meta.url), 'utf8');
  const publicAsset = new URL('../public/mobile-layout-1/from-market-0-to-top-gun-mobile-hero-langing.jpg', import.meta.url);

  assert.equal(existsSync(publicAsset), true);
  assert.match(template, /\[featuredImageOverrides\]="mobileFeaturedImageOverrides"/);
  assert.match(component, /'From Market 0 to top gun':\s*'\/mobile-layout-1\/from-market-0-to-top-gun-mobile-hero-langing\.jpg'/);
  assert.match(catalogComponent, /featuredImageOverrides\s*=\s*input<Readonly<Record<string, string>>>\(\{\}\)/);
  assert.match(catalogComponent, /this\.featuredImageOverrides\(\)\[course\.title\]/);
});

test('uses the supplied Top Gun title artwork only through the mobile title override', () => {
  const template = readFileSync(templateUrl, 'utf8');
  const component = readFileSync(componentUrl, 'utf8');
  const catalogTemplate = readFileSync(new URL('../src/app/features/layout-style-3/layout-style-3.html', import.meta.url), 'utf8');
  const catalogComponent = readFileSync(new URL('../src/app/features/layout-style-3/layout-style-3.ts', import.meta.url), 'utf8');
  const publicAsset = new URL('../public/mobile-layout-1/from-market-0-to-top-gun-mobile-tittle.png', import.meta.url);

  assert.equal(existsSync(publicAsset), true);
  assert.match(template, /\[featuredTitleImageOverrides\]="mobileFeaturedTitleImageOverrides"/);
  assert.match(component, /'From Market 0 to top gun':\s*'\/mobile-layout-1\/from-market-0-to-top-gun-mobile-tittle\.png'/);
  assert.match(catalogComponent, /featuredTitleImageOverrides\s*=\s*input<Readonly<Record<string, string>>>\(\{\}\)/);
  assert.match(catalogComponent, /this\.featuredTitleImageOverrides\(\)\[course\.title\]/);
  assert.match(catalogTemplate, /featuredTitleImageUrl\(course\); as titleImage/);
  assert.match(catalogTemplate, /\[src\]="titleImage"/);
});

test('keeps the mobile title artwork at its intrinsic dimensions', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__title-image\s*\{[\s\S]*?width:\s*auto\s*!important[\s\S]*?height:\s*auto\s*!important[\s\S]*?max-width:\s*100%/);
});

test('keeps the mobile featured container borderless', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.doesNotMatch(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__background\s*\{[^}]*border:/);
});

test('aligns the title wrapper bottom with the featured container bottom', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-page\s*\{[\s\S]*?--hero-content-top:\s*calc\(\(100vw \* 9 \/ 16\) - 61px\)/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__heading\s*\{[\s\S]*?display:\s*flex[\s\S]*?align-items:\s*flex-end[\s\S]*?height:\s*61px/);
});

test('positions featured badges 15px below the hero bottom without overlap', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__meta\s*\{[\s\S]*?position:\s*relative[\s\S]*?margin-top:\s*15px[\s\S]*?transform:\s*none/);
  assert.doesNotMatch(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__meta\s*\{[^}]*position:\s*absolute/);
});

test('wraps long featured badge groups within the mobile viewport', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__meta\s*\{[\s\S]*?width:\s*100%[\s\S]*?max-width:\s*100%/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__meta-primary,[\s\S]*?\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__meta-levels\s*\{[\s\S]*?flex-wrap:\s*wrap[\s\S]*?max-width:\s*100%/);
});

test('stacks level badges on a clean second mobile row', () => {
  const template = readFileSync(templateUrl, 'utf8');
  const styles = readFileSync(stylesUrl, 'utf8');
  const catalogTemplate = readFileSync(new URL('../src/app/features/layout-style-3/layout-style-3.html', import.meta.url), 'utf8');
  const catalogComponent = readFileSync(new URL('../src/app/features/layout-style-3/layout-style-3.ts', import.meta.url), 'utf8');

  assert.match(template, /\[stackFeaturedLevelBadges\]="true"/);
  assert.match(catalogComponent, /stackFeaturedLevelBadges\s*=\s*input\(false\)/);
  assert.match(catalogTemplate, /@if \(stackFeaturedLevelBadges\(\)\)[\s\S]*?class="style-featured__meta-levels"[\s\S]*?@for \(level of courseLevelBadges\(course\); track level\)[\s\S]*?<span class="style-featured__level-badge">\{\{ level \}\}<\/span>/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__meta\s*\{[\s\S]*?flex-direction:\s*column/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__meta-levels\s*\{[\s\S]*?gap:\s*9px/);
});

test('keeps every mobile featured action at the same height', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /--mobile-featured-action-height:\s*40px/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__actions\s*>\s*button,[\s\S]*?\.style-featured__actions\s*>\s*\.style-featured__language,[\s\S]*?\.style-featured__language-trigger\s*\{[\s\S]*?height:\s*var\(--mobile-featured-action-height\)[\s\S]*?min-height:\s*var\(--mobile-featured-action-height\)/);
});

test('compensates mobile card geometry for the scaled preview', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /--mobile-carousel-card-width:\s*245\.333px/);
  assert.match(styles, /--mobile-carousel-card-height:\s*140px/);
  assert.match(styles, /--mobile-carousel-gap:\s*10\.667px/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-card\s*\{[\s\S]*?flex:\s*0\s+0\s+var\(--mobile-carousel-card-width\)\s*!important;[\s\S]*?height:\s*var\(--mobile-carousel-card-height\)\s*!important;/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-carousel__track\s*\{[\s\S]*?gap:\s*var\(--mobile-carousel-gap\)\s*!important;[\s\S]*?overflow-x:\s*auto/);
});

test('hides carousel navigation arrows on the mobile layout', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-carousel__arrow\s*\{[\s\S]*?display:\s*none\s*!important;/);
});

test('places the featured image below a dedicated mobile header', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /\.mobile-layout-1__header\s*\{[^}]*position:\s*relative;[^}]*height:\s*var\(--mobile-header-height\);[^}]*background:\s*#0c0d0d;/);
  assert.doesNotMatch(styles, /\.mobile-layout-1__header\s*\{[^}]*position:\s*fixed;/);
});

test('uses eight pixels of vertical padding in the mobile header', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /--mobile-header-height:\s*60px/);
  assert.match(styles, /\.mobile-layout-1__header\s*\{[^}]*box-sizing:\s*border-box;[^}]*padding:\s*8px\s+14px\s+8px\s+20px;/);
});

test('keeps only the featured artwork and title before the mobile carousels', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__meta,[\s\S]*?\.style-featured__details,[\s\S]*?\.style-featured__actions\s*\{[\s\S]*?display:\s*none\s*!important;/);
});

test('centers featured pagination horizontally below the mobile hero', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured-pagination\s*\{[^}]*top:\s*calc\(\(100vw \* 9 \/ 16\) \+ 8px\);[^}]*left:\s*50%;[^}]*transform:\s*translateX\(-50%\);/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured-pagination__track\s*\{[^}]*position:\s*relative;[^}]*display:\s*flex;[^}]*flex-direction:\s*row;/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured-pagination__item\s*\{[^}]*position:\s*relative;[^}]*transform:\s*none\s*!important;/);
});

test('uses a moving hexagon active state for mobile featured pagination', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured-pagination__item\s*\{[\s\S]*?width:\s*6px;[\s\S]*?height:\s*6px;/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured-pagination__item::before\s*\{[\s\S]*?background:\s*#8b8b8b[\s\S]*?border-radius:\s*50%;/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured-pagination__item--active::before\s*\{[\s\S]*?clip-path:\s*polygon\(/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured-pagination__item--active::after\s*\{[\s\S]*?background:\s*#0c0d0d[\s\S]*?clip-path:\s*polygon\(/);
});

test('supports horizontal touch swipes between featured slides', () => {
  const template = readFileSync(childTemplateUrl, 'utf8');
  const component = readFileSync(childComponentUrl, 'utf8');
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(template, /class="style-featured__background"[^>]*\(touchstart\)="onFeaturedTouchStart\(\$event\)"[^>]*\(touchmove\)="onFeaturedTouchMove\(\$event\)"[^>]*\(touchend\)="onFeaturedTouchEnd\(\$event\)"/);
  assert.match(component, /protected onFeaturedTouchStart\(event: TouchEvent\)/);
  assert.match(component, /protected onFeaturedTouchEnd\(event: TouchEvent\)/);
  assert.match(component, /protected onFeaturedTouchMove\(event: TouchEvent\)/);
  assert.match(component, /featuredSwipeOffset\.set\(deltaX\)/);
  assert.match(component, /const direction = deltaX < 0 \? 1 : -1/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured__background\s*\{[\s\S]*?touch-action:\s*pan-y;/);
  assert.match(styles, /--featured-drag-offset/);
  assert.match(template, /style-featured__swipe-image--previous/);
  assert.match(template, /style-featured__swipe-image--next/);
  assert.match(styles, /style-featured__swipe-image--next[\s\S]*?translateX\(calc\(100%/);
  assert.match(styles, /style-featured__swipe-image--previous[\s\S]*?translateX\(calc\(-100%/);
});

test('animates featured slides with a directional horizontal transition', () => {
  const template = readFileSync(childTemplateUrl, 'utf8');
  const component = readFileSync(childComponentUrl, 'utf8');
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(template, /\[class\.style-page--featured-next\]="featuredSlideMotion\(\) === 'next'"/);
  assert.match(template, /\[class\.style-page--featured-previous\]="featuredSlideMotion\(\) === 'previous'"/);
  assert.match(component, /protected readonly featuredSlideMotion = signal<.*>\(null\)/);
  assert.match(component, /this\.featuredSlideMotion\.set\(direction > 0 \? 'next' : 'previous'\)/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-page--featured-next\s+\.style-featured__background img[\s\S]*?animation:/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-page--featured-previous\s+\.style-featured__background img[\s\S]*?animation:/);
});

test('animates the active pagination marker', () => {
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(styles, /@keyframes mobile-pagination-activate/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured-pagination__item--active::before\s*\{[\s\S]*?animation:\s*mobile-pagination-activate/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured-pagination__item::before\s*\{[\s\S]*?transition:\s*opacity/);
});

test('uses a left-anchored gray pagination sequence on mobile', () => {
  const component = readFileSync(childComponentUrl, 'utf8');
  const styles = readFileSync(stylesUrl, 'utf8');

  assert.match(component, /if \(this\.stackFeaturedLevelBadges\(\)\)[\s\S]*?Array\.from\(\{ length: visibleCount/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured-pagination__item\s*\{[\s\S]*?width:\s*6px;[\s\S]*?height:\s*6px;/);
  assert.match(styles, /\.mobile-layout-1__content\s+::ng-deep\s+\.style-featured-pagination__item::before\s*\{[\s\S]*?background:\s*#8b8b8b;/);
});

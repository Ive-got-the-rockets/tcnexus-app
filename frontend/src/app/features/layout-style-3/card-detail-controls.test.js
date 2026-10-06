const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const template = fs.readFileSync(path.join(__dirname, 'layout-style-3.html'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, 'layout-style-3.scss'), 'utf8');
const component = fs.readFileSync(path.join(__dirname, 'layout-style-3.ts'), 'utf8');

assert.match(template, /class="style-card__play"[\s\S]*?<span class="style-card__play-label">Play<\/span>/);
assert.match(styles, /\.style-card__play\s*\{[\s\S]*?width:\s*149px;[\s\S]*?height:\s*28px;/);
assert.match(styles, /\.style-card__play[\s\S]*?width:\s*16\.56px;[\s\S]*?height:\s*16\.56px;/);
assert.match(styles, /\.style-card__trailer\s*\{[\s\S]*?width:\s*28px;[\s\S]*?height:\s*28px;/);
assert.match(styles, /\.style-card__meta[\s\S]*?text-shadow:\s*none/);
assert.match(styles, /\.style-card__meta-badge[\s\S]*?background:\s*#33373D/);
assert.equal((template.match(/class="style-card__trailer-icon" viewBox="31 37 82 70" preserveAspectRatio="none"/g) ?? []).length, 3, 'Each trailer control must use the supplied SVG artwork inline.');
assert.match(styles, /\.style-card__trailer[\s\S]*?background:\s*#fff !important;[\s\S]*?color:\s*#33373D !important;/, 'Trailer hover must invert to a white button with gray artwork.');
assert.match(styles, /\.style-card__trailer-icon[\s\S]*?width:\s*15px;[\s\S]*?height:\s*15px;/, 'Trailer artwork must be 15px square.');
assert.match(template, /class="style-featured__trailer-icon" viewBox="31 37 82 70" preserveAspectRatio="none"/, 'Featured trailer control must use the shared trailer artwork.');
assert.match(styles, /\.style-featured__start\s*\{[\s\S]*?width:\s*40px;[\s\S]*?height:\s*40px;[\s\S]*?background:\s*#fff;/, 'Featured play control must retain its size with a white rectangular treatment.');
assert.match(styles, /\.style-featured__start > \.play-triangle[\s\S]*?width:\s*16\.56px;[\s\S]*?height:\s*16\.56px;/, 'Featured play icon must match the expanded-card play icon.');
assert.match(template, /featuredPlayTooltip\(course\)/, 'Featured play control must expose a course/show-specific tooltip.');
assert.match(template, /class="style-featured__tooltip" aria-hidden="true">Play Trailer<\//, 'Featured trailer control must expose the trailer tooltip.');
assert.match(template, /featuredListTooltip\(course\)/, 'Featured lesson/episode list must expose a type-specific tooltip.');
assert.match(template, /class="style-featured__tooltip" aria-hidden="true">Choose your language<\//, 'Featured language control must expose the language tooltip.');
assert.match(styles, /\.style-featured__tooltip\s*\{[\s\S]*?font-family:\s*'Barlow',[\s\S]*?font-size:\s*14px;[\s\S]*?font-weight:\s*500;/, 'Featured tooltips must match the expanded-card tooltip typography.');
assert.match(component, /coursePreviewImageUrl\(detail: CourseDetail\): string \{\s*return detail\.image\s*\n\s*\?\? detail\.landing_background\s*\n\s*\?\? detail\.thumbnail/, 'Modal previews must prefer the high-resolution course artwork.');
assert.match(styles, /\.style-course-modal\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?overflow:\s*hidden;/, 'Modal layout must constrain its content so the inner list can scroll.');
assert.match(styles, /\.style-course-modal__content\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overflow-y:\s*auto;/, 'Modal content must provide the scrollable episode area.');
assert.match(template, /coursePreviewLevelOptions\(detail\)[\s\S]*?coursePreviewLevelMenuOpen\(\)[\s\S]*?chooseCoursePreviewLevel\(level\.slug\)/, 'Modal lessons heading must expose the shared level selector behavior.');
assert.match(component, /coursePreviewLessons\(detail: CourseDetail\): Lesson\[\]/, 'Modal lesson rows must be derived from the selected level.');
assert.match(styles, /\.style-course-modal__heading-trigger:hover[\s\S]*?background:\s*#fff;[\s\S]*?color:\s*#33373D;/, 'Modal level selector must use the single-page active treatment.');
assert.match(styles, /\.style-card__meta-primary,\s*\.style-card__meta-levels\s*\{[\s\S]*?flex-wrap:\s*wrap;/, 'Expanded-card metadata must wrap multiple level badges.');
assert.match(template, /class="style-card__meta-level"[\s\S]*?style-card__level-badge/, 'Each expanded-card level badge must stay grouped with its separator when wrapping.');

console.log('card detail controls contract passes');

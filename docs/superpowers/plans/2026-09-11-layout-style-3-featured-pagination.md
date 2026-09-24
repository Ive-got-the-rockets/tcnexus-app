# Layout Style 3 Featured Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a vertically stacked, clickable featured-item pagination control to Layout Style 3 so each indicator selects one individual show or course.

**Architecture:** Extend the existing `LayoutStyle3Page` signal state with a unified featured-item list and selected index. Reuse the existing hero bindings and featured-detail loading flow, while adding a dedicated indicator group positioned relative to the hero background. Keep this pagination state independent from the three existing carousel pagination states.

**Tech Stack:** Angular standalone component, signals/computed state, Angular template control flow, SCSS responsive media queries, Vitest/browser preview verification.

---

### Task 1: Add featured-item state and selection flow

**Files:**
- Modify: `frontend/src/app/features/layout-style-3/layout-style-3.ts`

- [ ] **Step 1: Add state for the unified featured collection and selected item**

Add signals near the existing `featured` signal:

```ts
protected readonly featuredIndex = signal(0);
protected readonly featuredItems = computed(() => {
  const available = [
    ...this.courses().filter(course => !course.course_types.includes('Platform')),
    ...this.shows(),
  ];
  return available.filter((item, index, all) => all.findIndex(candidate => candidate.id === item.id) === index);
});
protected readonly featuredPaginationItems = computed(() => {
  const items = this.featuredItems();
  const activeIndex = this.featuredIndex();
  const visibleCount = Math.min(5, items.length);
  const start = Math.min(
    Math.max(0, activeIndex - Math.floor(visibleCount / 2)),
    Math.max(0, items.length - visibleCount),
  );

  return items.slice(start, start + visibleCount).map((item, offset) => ({
    item,
    index: start + offset,
  }));
});
```

- [ ] **Step 2: Populate the collection using the loaded shows and courses**

In the existing `forkJoin` subscription, after the show and course arrays are available, create a local unified collection from the non-platform courses and shows, remove duplicate IDs, and use it to choose the initial featured item. The component-level pagination collection is derived from the populated `courses` and `shows` signals so it cannot drift from the carousel data:

```ts
const featuredItems = [...courseCandidates, ...showCandidates]
  .filter((item, index, all) => all.findIndex(candidate => candidate.id === item.id) === index);
```

Use the selected featured ID to initialize `featuredIndex` after `this.featured.set(featured)`:

```ts
const initialFeaturedIndex = featuredItems.findIndex(item => item.id === featured?.id);
this.featuredIndex.set(Math.max(0, initialFeaturedIndex));
```

- [ ] **Step 3: Add a single selection method that updates hero state and details**

Add a protected method:

```ts
protected selectFeatured(index: number): void {
  const item = this.featuredItems()[index];
  if (!item || item.id === this.featured()?.id) return;

  this.featuredIndex.set(index);
  this.featured.set(item);
  this.featuredDetail.set(null);
  this.selectedLanguage.set(this.courseLanguages(item)[0]?.slug ?? 'en');
  this.coursesService.getCourse(item.id).subscribe({
    next: detail => {
      if (this.featured()?.id === detail.id) this.featuredDetail.set(detail);
    }
  });
}
```

- [ ] **Step 4: Verify TypeScript state compiles before template work**

Run from `frontend`:

```powershell
npm run build
```

Expected: the Angular build completes, allowing any existing bundle-budget or external-font warning but no TypeScript error involving the new signals or method.

### Task 2: Add featured pagination markup

**Files:**
- Modify: `frontend/src/app/features/layout-style-3/layout-style-3.html`

- [ ] **Step 1: Add the indicator group directly below the header boundary**

Place this inside `<main class="style-page">`, before the featured hero content, so it is positioned independently from the hero text:

```html
@if (featuredPaginationItems().length > 1) {
  <nav class="style-featured-pagination" aria-label="Featured content">
    @for (entry of featuredPaginationItems(); track entry.item.id) {
      <button
        type="button"
        class="style-featured-pagination__item"
        [class.style-featured-pagination__item--active]="featuredIndex() === entry.index"
        [attr.aria-label]="'Show featured content: ' + entry.item.title"
        [attr.aria-current]="featuredIndex() === entry.index ? 'true' : null"
        (click)="selectFeatured(entry.index)"
      ></button>
    }
  </nav>
}
```

Use the item title in the label even for courses so every control remains understandable to assistive technology.

- [ ] **Step 2: Confirm the hero remains bound to the existing `featured()` signal**

Do not duplicate the hero markup or introduce a second content source. The existing title, description, background, metadata, people, and actions should continue reading from `featured()` and `featuredDetail()`.

### Task 3: Style and position the vertical pagination

**Files:**
- Modify: `frontend/src/app/features/layout-style-3/layout-style-3.scss`

- [ ] **Step 1: Add the base vertical control styles**

Add styles near the existing carousel pagination styles:

```scss
.style-featured-pagination {
  position: absolute;
  top: 18.75vw;
  right: 15px;
  z-index: 25;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  transform: translateY(-50%);
}

.style-featured-pagination__item {
  width: 3px;
  min-width: 3px;
  height: 4px;
  padding: 0;
  border: 0;
  border-radius: 1px;
  background: color-mix(in srgb, var(--paper) 38%, transparent);
  opacity: 0.55;
  cursor: pointer;
  transition: width 0.2s ease, opacity 0.2s ease, background 0.2s ease;
}

.style-featured-pagination__item--active {
  width: 5px;
  min-width: 5px;
  background: var(--paper);
  opacity: 0.95;
}

.style-featured-pagination__item:hover,
.style-featured-pagination__item:focus-visible {
  background: var(--signal);
  opacity: 1;
}
```

- [ ] **Step 2: Keep the active indicator visually centered in the stack**

Render at most five indicators at a time. The computed `featuredPaginationItems` window keeps the selected item centered whenever it is not near the beginning or end of the collection; at the edges, the window clamps to the available items.

### Task 4: Verify interaction and responsive behavior

**Files:**
- Test: `frontend/src/app/features/layout-style-3/trailer-embed-url.spec.ts` only if a new pure helper is extracted; otherwise use browser verification and the existing test suite.

- [ ] **Step 1: Verify the live 1024 × 768 view**

Confirm:

- The indicator stack is 15px from the right viewport edge.
- The stack is vertically centered over the hero background.
- The active item is 5px wide and visibly brighter.
- Clicking another indicator updates the title, description, background, metadata, and action set.
- Existing shows, trading-course, and platform-course pagination remains unchanged.

- [ ] **Step 2: Verify desktop HD**

Set the preview to 1920 × 1080 and confirm the featured pagination remains inside the hero image, maintains the 15px right offset, and does not alter the existing desktop hero position.

- [ ] **Step 3: Run the existing checks**

From `frontend`:

```powershell
npm run build
npm test -- --run
```

Expected: build succeeds aside from any already-known external Google Fonts or bundle-budget warnings; existing tests remain passing with no new failures.

import { Component, Injector, OnDestroy, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { CoursesService } from '../../core/courses.service';
import { MyListService } from '../../core/my-list.service';
import { Course } from '../../core/models';
import { MorphRect, TransitionService } from '../../core/transition.service';
import { VisitorService } from '../../core/visitor.service';
import { WatchProgressService } from '../../core/watch-progress.service';
import { RowScrollDirective, ScrollEdges } from './row-scroll.directive';

type CatalogStatus = 'loading' | 'error' | 'ready';

interface CourseRow {
  title: string;
  courses: Course[];
}

interface PreviewPosition {
  top: string;
  left: string;
}

interface ReturnOverlayState {
  thumbnailUrl: string;
}

const UNKNOWN_EDGES: ScrollEdges = { atStart: true, atEnd: true };
const PREVIEW_WIDTH = 416;
const PREVIEW_HEIGHT = 460;
const PREVIEW_SHOW_DELAY = 200;
const PREVIEW_HIDE_DELAY = 150;
const VIEWPORT_MARGIN = 8;

@Component({
  selector: 'app-course-catalog',
  imports: [RowScrollDirective],
  templateUrl: './course-catalog.html',
  styleUrl: './course-catalog.scss'
})
export class CourseCatalog implements OnDestroy {
  private readonly coursesService = inject(CoursesService);
  private readonly visitor = inject(VisitorService);
  private readonly myList = inject(MyListService);
  private readonly watchProgress = inject(WatchProgressService);
  private readonly router = inject(Router);
  private readonly transition = inject(TransitionService);
  private readonly injector = inject(Injector);

  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly previewCourse = signal<Course | null>(null);
  protected readonly previewPosition = signal<PreviewPosition | null>(null);
  /**
   * The actual small grid card's rect, captured when the popup opens — NOT
   * the popup's own rect. The popup is centered on the card but clamped to
   * the viewport, so for cards near the top/bottom its box can land well
   * away from the card's real position, especially vertically (the popup is
   * ~460px tall vs a card's ~140px). Navigating from the popup needs to
   * stage this so the morph targets where the card actually sits, not
   * wherever the popup happened to be floating.
   */
  private previewCardRect: DOMRect | null = null;
  private previewRowTitle: string | null = null;

  protected readonly status = signal<CatalogStatus>('loading');
  protected readonly courses = signal<Course[]>([]);
  protected readonly failedImages = signal<ReadonlySet<number>>(new Set());
  protected readonly rowEdges = signal<ReadonlyMap<string, ScrollEdges>>(new Map());
  protected readonly skeletonRows = Array.from({ length: 3 });
  protected readonly skeletonCards = Array.from({ length: 6 });

  /**
   * Arriving back from a course page: floats a fullscreen copy of that
   * course's image over the catalog, then shrinks it down onto wherever the
   * real card actually is (found live, after scroll restoration puts
   * everything back roughly where it was) — the mirror of the detail page's
   * own entry animation, played here instead of there so it looks like the
   * catalog was open the whole time and the image is landing back on it.
   */
  protected readonly returnOverlay = signal<ReturnOverlayState | null>(null);
  protected readonly returnRect = signal<MorphRect | null>(null);
  protected readonly returnSettled = signal(false);
  private returnAnimationStarted = false;

  protected readonly featured = computed<Course | null>(() => this.courses()[0] ?? null);

  /**
   * All Courses, then My List (registered users only, and only once they've
   * actually added something to it), then the two top-level categories a
   * course is tagged with — "Platform" for how-to-use-TC-Nexus tutorials,
   * everything else counts as trading.
   */
  protected readonly rows = computed<CourseRow[]>(() => {
    const courses = this.courses();
    if (!courses.length) {
      return [];
    }

    const isPlatform = (course: Course) => course.course_types.includes('Platform');
    const rows: CourseRow[] = [{ title: 'All Courses', courses }];

    if (this.visitor.isRegistered()) {
      const listedIds = this.myList.courseIds();
      const listed = courses.filter((course) => listedIds.has(course.id));
      if (listed.length > 0) {
        rows.push({ title: 'My List', courses: listed });
      }
    }

    rows.push({ title: 'Trading Courses', courses: courses.filter((course) => !isPlatform(course)) });
    rows.push({ title: 'Platform Courses', courses: courses.filter(isPlatform) });

    return rows;
  });

  constructor() {
    this.load();

    const returning = this.transition.consumeReturn();
    if (returning) {
      this.returnOverlay.set({ thumbnailUrl: returning.thumbnailUrl });
      this.returnRect.set(this.fullscreenRect());

      // Wait for the course list to actually be on screen (rows rendered,
      // each row's scroll position restored) before trying to measure the
      // real card — afterNextRender guarantees a committed render, unlike a
      // fixed rAF-count guess.
      effect(() => {
        if (this.status() === 'ready' && !this.returnAnimationStarted) {
          this.returnAnimationStarted = true;
          afterNextRender(() => this.beginReturnShrink(returning.courseId, returning.rowTitle), {
            injector: this.injector
          });
        }
      });
    }
  }

  private fullscreenRect(): MorphRect {
    return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
  }

  private beginReturnShrink(courseId: number, rowTitle: string): void {
    const selector = `.card[data-course-id="${courseId}"]`;
    // Prefer the exact row it was opened from (rows scroll independently),
    // falling back to any row with this course if that one's gone (e.g. it
    // was removed from "My List" while you were away).
    const cardEl =
      (document.querySelector(`.row[data-row-title="${CSS.escape(rowTitle)}"] ${selector}`) as HTMLElement | null) ??
      (document.querySelector<HTMLElement>(selector) as HTMLElement | null);

    if (!cardEl) {
      this.returnOverlay.set(null);
      return;
    }

    const rect = cardEl.getBoundingClientRect();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.returnRect.set({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
        this.returnSettled.set(true);
      });
    });
  }

  protected onReturnTransitionEnd(event: TransitionEvent): void {
    if (event.propertyName !== 'width') {
      return;
    }
    // Shrunk onto the real card now — hide the overlay and let the actual grid show through.
    this.returnOverlay.set(null);
  }

  protected load(): void {
    this.status.set('loading');
    this.coursesService.getCourses().subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.status.set('ready');
      },
      error: () => {
        this.status.set('error');
      }
    });
  }

  protected thumbnailUrl(course: Course): string {
    return course.thumbnail ?? `https://picsum.photos/seed/tcnexus-${course.id}/640/360`;
  }

  protected backdropUrl(course: Course): string {
    return course.thumbnail ?? `https://picsum.photos/seed/tcnexus-${course.id}/1600/900`;
  }

  protected onImageError(courseId: number): void {
    const next = new Set(this.failedImages());
    next.add(courseId);
    this.failedImages.set(next);
  }

  protected isRegistered(): boolean {
    return this.visitor.isRegistered();
  }

  protected isInMyList(courseId: number): boolean {
    return this.myList.has(courseId);
  }

  protected toggleMyList(courseId: number): void {
    this.myList.toggle(courseId);
  }

  protected onRowEdges(rowTitle: string, edges: ScrollEdges): void {
    const next = new Map(this.rowEdges());
    next.set(rowTitle, edges);
    this.rowEdges.set(next);
  }

  protected edgesFor(rowTitle: string): ScrollEdges {
    return this.rowEdges().get(rowTitle) ?? UNKNOWN_EDGES;
  }

  protected courseTypeLabel(course: Course): string {
    return course.course_types.includes('Platform') ? 'Platform Course' : 'Trading Course';
  }

  /** Stages the clicked element's rect so the detail page can grow it into place, then navigates. */
  protected goToCourse(course: Course, rowTitle: string, sourceEl: HTMLElement): void {
    this.stageAndNavigate(course, rowTitle, sourceEl.getBoundingClientRect());
  }

  /**
   * The card's own Play button — jumps straight into the lesson the visitor
   * last left off on (same lesson, same position, resumed the same way the
   * lesson player already resumes from a direct link), or lesson 1 if
   * they've never started this course. Works the same for registered and
   * anonymous visitors, since watch progress is tracked locally either way.
   * Needs the full course record (the catalog only holds the lightweight
   * list-page Course, with no lessons array) to know lesson 1's real id
   * when there's nothing to resume.
   */
  protected playCourse(course: Course, event: Event): void {
    event.stopPropagation();

    const resumeLessonId = this.watchProgress.lastLessonForCourse(course.id);
    if (resumeLessonId) {
      this.router.navigate(['/courses', course.id, 'lessons', resumeLessonId]);
      return;
    }

    this.coursesService.getCourse(course.id).subscribe({
      next: (detail) => {
        const firstLesson = detail.lessons[0];
        if (firstLesson) {
          this.router.navigate(['/courses', course.id, 'lessons', firstLesson.id]);
        }
      }
    });
  }

  /** Same as goToCourse, but for clicks from inside the hover popup — see previewCardRect above. */
  protected goToCourseFromPreview(course: Course): void {
    if (!this.previewCardRect || !this.previewRowTitle) {
      return;
    }
    this.stageAndNavigate(course, this.previewRowTitle, this.previewCardRect);
  }

  private stageAndNavigate(course: Course, rowTitle: string, rect: DOMRect): void {
    this.transition.stage(
      { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      this.thumbnailUrl(course),
      rowTitle
    );
    this.router.navigate(['/courses', course.id]);
  }

  /** Netflix-style hover expand: wait a beat, then float a bigger preview over the card. */
  protected onCardEnter(course: Course, rowTitle: string, event: MouseEvent): void {
    this.clearHideTimer();
    this.clearShowTimer();

    const cardEl = event.currentTarget as HTMLElement;
    this.showTimer = setTimeout(() => {
      const rect = cardEl.getBoundingClientRect();
      this.previewCardRect = rect;
      this.previewRowTitle = rowTitle;

      const left = Math.min(
        Math.max(rect.left + rect.width / 2 - PREVIEW_WIDTH / 2, VIEWPORT_MARGIN),
        window.innerWidth - PREVIEW_WIDTH - VIEWPORT_MARGIN
      );
      const top = Math.min(
        Math.max(rect.top + rect.height / 2 - PREVIEW_HEIGHT / 2, VIEWPORT_MARGIN),
        window.innerHeight - PREVIEW_HEIGHT - VIEWPORT_MARGIN
      );

      this.previewPosition.set({ top: `${top}px`, left: `${left}px` });
      this.previewCourse.set(course);
    }, PREVIEW_SHOW_DELAY);
  }

  /** Used by both the card and the preview popup, so moving between the two never closes it. */
  protected scheduleHide(): void {
    this.clearShowTimer();
    this.clearHideTimer();
    this.hideTimer = setTimeout(() => {
      this.previewCourse.set(null);
      this.previewPosition.set(null);
    }, PREVIEW_HIDE_DELAY);
  }

  protected cancelHide(): void {
    this.clearHideTimer();
  }

  ngOnDestroy(): void {
    this.clearShowTimer();
    this.clearHideTimer();
  }

  private clearShowTimer(): void {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private clearHideTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}

import { Component, ElementRef, HostListener, Injector, OnDestroy, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CoursesService } from '../../core/courses.service';
import { MyListService } from '../../core/my-list.service';
import { Course, CourseDetail, Lesson, Person, RegistrationSettings } from '../../core/models';
import { DEFAULT_CARD_ANIMATION_SETTINGS, normalizeCardAnimationSettings } from '../../core/registration-settings';
import { AccessService } from '../../core/access.service';
import { MorphRect, TransitionService } from '../../core/transition.service';
import { VisitorService } from '../../core/visitor.service';
import { WatchProgressService } from '../../core/watch-progress.service';
import { RowScrollDirective, ScrollEdges } from './row-scroll.directive';

type CatalogStatus = 'loading' | 'error' | 'ready';
type CatalogMode = 'home' | 'trading' | 'platform';

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
  private readonly accessService = inject(AccessService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transition = inject(TransitionService);
  private readonly injector = inject(Injector);

  private readonly heroContent = viewChild<ElementRef<HTMLElement>>('heroContent');
  /** Collapsed hero content offset, so expanding the description grows downward instead of lifting the title. */
  protected readonly heroPinTop = signal<number | null>(null);

  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly previewCourse = signal<Course | null>(null);
  protected readonly previewPosition = signal<PreviewPosition | null>(null);
  /** Pointer only after the hover-zoom animation has finished. */
  protected readonly previewReady = signal(false);
  protected readonly previewClosing = signal(false);
  protected readonly previewSwitching = signal(false);
  protected readonly cardAnimation = signal(DEFAULT_CARD_ANIMATION_SETTINGS);
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
  private readonly featuredCourseId = signal<number | null>(null);
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

  protected readonly catalogMode = signal<CatalogMode>('home');
  protected readonly categoryCourses = computed(() => {
    const courses = this.courses();
    if (this.catalogMode() === 'platform') {
      return courses.filter((course) => course.course_types.includes('Platform'));
    }
    if (this.catalogMode() === 'trading') {
      return courses.filter((course) => !course.course_types.includes('Platform'));
    }
    return courses;
  });
  protected readonly featured = computed<Course | null>(() => {
    const candidates = this.categoryCourses();
    const selected = this.featuredCourseId();
    return candidates.find((course) => course.id === selected) ?? candidates[0] ?? null;
  });

  /** Toggle description visibility */
  protected readonly descriptionExpanded = signal(false);  // Hidden by default
  protected readonly descriptionHovered = signal(false);
  protected readonly descriptionVisible = computed(
    () => this.descriptionExpanded() || this.descriptionHovered()
  );

  /** Featured course with lessons — needed for the landing-page episode panel. */
  protected readonly featuredDetail = signal<CourseDetail | null>(null);
  protected readonly episodeListOpen = signal(false);
  protected readonly episodeRowsRevealed = signal(false);

  toggleDescription(): void {
    // A click turns the temporary hover reveal into an explicit toggle.
    this.descriptionHovered.set(false);
    this.descriptionExpanded.set(!this.descriptionExpanded());
  }

  openDescriptionOnHover(): void {
    this.descriptionHovered.set(true);
  }

  closeDescriptionOnHover(): void {
    this.descriptionHovered.set(false);
  }

  get descriptionLabel(): string {
    return this.descriptionVisible() ? 'Hide details' : 'Show more';
  }

  protected personPhotoUrl(person: Person): string {
    return person.photo ?? `https://i.pravatar.cc/80?u=${person.id}`;
  }

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
    const mode = this.catalogMode();
    const featuredId = this.featured()?.id;
    const withoutFeatured = (course: Course) => course.id !== featuredId;
    if (mode === 'trading' || mode === 'platform') {
      return [{ title: mode === 'platform' ? 'Platform Courses' : 'Trading Courses', courses: this.categoryCourses().filter(withoutFeatured) }];
    }

    const rows: CourseRow[] = [{ title: 'All Courses', courses: courses.filter(withoutFeatured) }];

    if (this.visitor.isRegistered()) {
      const listedIds = this.myList.courseIds();
      const listed = courses.filter((course) => listedIds.has(course.id)).filter(withoutFeatured);
      if (listed.length > 0) {
        rows.push({ title: 'My List', courses: listed });
      }
    }

    rows.push({ title: 'Trading Courses', courses: courses.filter((course) => !isPlatform(course)).filter(withoutFeatured) });
    rows.push({ title: 'Platform Courses', courses: courses.filter(isPlatform).filter(withoutFeatured) });

    return rows;
  });

  constructor() {
    this.accessService.registrationSettings$.subscribe((settings: RegistrationSettings) => {
      this.cardAnimation.set(normalizeCardAnimationSettings(settings.animations?.card_carousel));
    });

    this.route.data.subscribe((data) => {
      const mode = data['catalogMode'];
      this.catalogMode.set(mode === 'trading' || mode === 'platform' ? mode : 'home');
      this.episodeListOpen.set(false);
      this.episodeRowsRevealed.set(false);
      if (this.courses().length) {
        this.chooseFeaturedCourse(this.courses());
      }
      this.loadFeaturedDetail();
    });

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
        this.chooseFeaturedCourse(courses);
        this.status.set('ready');
        afterNextRender(() => this.pinHeroContent(), { injector: this.injector });
        this.loadFeaturedDetail();
      },
      error: () => {
        this.status.set('error');
      }
    });
  }

  private chooseFeaturedCourse(courses: Course[]): void {
    const candidates = this.catalogMode() === 'platform'
      ? courses.filter((course) => course.course_types.includes('Platform'))
      : courses.filter((course) => !course.course_types.includes('Platform'));
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    this.featuredCourseId.set(selected?.id ?? null);
  }

  private loadFeaturedDetail(): void {
    const featured = this.featured();
    this.featuredDetail.set(null);
    if (!featured) return;

    this.coursesService.getCourse(featured.id).subscribe({
      next: (detail) => {
        if (this.featured()?.id === detail.id) {
          this.featuredDetail.set(detail);
        }
      }
    });
  }

  protected thumbnailUrl(course: Course): string {
    return course.thumbnail ?? `https://picsum.photos/seed/tcnexus-${course.id}/640/360`;
  }

  /** The hero banner is much larger than a catalog card, so it needs the high-res "Course Image", not the small card thumbnail — see Course.image. */
  protected backdropUrl(course: Course): string {
    return course.image ?? course.thumbnail ?? `https://picsum.photos/seed/tcnexus-${course.id}/1600/900`;
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

  /** The featured hero's "Course Overview" button — same idea as the course-detail page's, just opens straight from the catalog's lightweight Course. */
  protected openOverview(course: Course, event: Event): void {
    event.stopPropagation();
    if (course.overview_link) {
      window.open(course.overview_link, '_blank', 'noopener');
    }
  }

  protected toggleEpisodeList(course: Course, event: Event): void {
    event.stopPropagation();
    if (this.episodeListOpen()) {
      this.closeEpisodeList();
      return;
    }

    this.previewCourse.set(null);
    this.previewPosition.set(null);
    this.episodeListOpen.set(true);

    const existing = this.featuredDetail();
    if (existing?.id === course.id) {
      this.revealEpisodeRows();
      return;
    }

    this.coursesService.getCourse(course.id).subscribe({
      next: (detail) => {
        this.featuredDetail.set(detail);
        this.revealEpisodeRows();
      }
    });
  }

  protected closeEpisodeList(): void {
    this.episodeListOpen.set(false);
    this.episodeRowsRevealed.set(false);
  }

  private pinHeroContent(): void {
    const el = this.heroContent()?.nativeElement;
    if (!el || this.descriptionExpanded()) {
      return;
    }
    this.heroPinTop.set(el.offsetTop);
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    if (!this.descriptionExpanded()) {
      this.heroPinTop.set(null);
      afterNextRender(() => this.pinHeroContent(), { injector: this.injector });
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.episodeListOpen()) {
      this.closeEpisodeList();
    }
  }

  private revealEpisodeRows(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.episodeRowsRevealed.set(true));
    });
  }

  protected openEpisode(lesson: Lesson): void {
    const course = this.featuredDetail();
    if (!course) return;
    this.router.navigate(['/courses', course.id, 'lessons', lesson.id]);
  }

  protected restartEpisode(lesson: Lesson, event: Event): void {
    event.stopPropagation();
    const course = this.featuredDetail();
    if (!course) return;
    this.router.navigate(['/courses', course.id, 'lessons', lesson.id], { queryParams: { restart: '1' } });
  }

  protected isLessonLocked(lesson: Lesson): boolean {
    if (lesson.tier === 'paid') return true;
    if (lesson.tier === 'registered') return !this.visitor.isRegistered();
    return false;
  }

  protected lessonThumbnailUrl(lesson: Lesson): string {
    return lesson.thumbnail ?? `https://picsum.photos/seed/tcnexus-lesson-${lesson.id}/160/90`;
  }

  protected watchedPercent(lesson: Lesson): number {
    return this.watchProgress.fractionFor(lesson.id) * 100;
  }

  protected lessonRowDelay(index: number): string {
    return `${Math.min(index * 40, 600)}ms`;
  }

  /** Stages the clicked element's rect so the detail page can grow it into place, then navigates. */
  protected goToCourse(course: Course, rowTitle: string, sourceEl: HTMLElement): void {
    this.stageAndNavigate(course, rowTitle, sourceEl.getBoundingClientRect());
  }

  /**
   * The card's own Play button — always starts the course from lesson 1
   * (restart=1 skips resuming even if lesson 1 itself has saved progress).
   * Resuming where the visitor left off is Continue Watching's job now (see
   * hasProgress/continueWatching below). Needs the full course record (the
   * catalog only holds the lightweight list-page Course, with no lessons
   * array) to know lesson 1's real id.
   */
  protected playCourse(course: Course, event: Event): void {
    event.stopPropagation();

    this.coursesService.getCourse(course.id).subscribe({
      next: (detail) => {
        const firstLesson = detail.lessons[0];
        if (firstLesson) {
          this.router.navigate(['/courses', course.id, 'lessons', firstLesson.id], {
            queryParams: { restart: '1' }
          });
        }
      }
    });
  }

  /** Whether this course has any saved local progress — drives the Continue Watching button's visibility. */
  protected hasProgress(courseId: number): boolean {
    return this.watchProgress.lastLessonForCourse(courseId) !== null;
  }

  /** Jumps straight into the lesson (and position) the visitor last left off on. Only shown when hasProgress() is true. */
  protected continueWatching(course: Course, event: Event): void {
    event.stopPropagation();

    const resumeLessonId = this.watchProgress.lastLessonForCourse(course.id);
    if (resumeLessonId) {
      this.router.navigate(['/courses', course.id, 'lessons', resumeLessonId]);
    }
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
      const switching = !!this.previewCourse() && this.previewCourse()?.id !== course.id;
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
      this.previewReady.set(false);
      this.previewClosing.set(false);
      this.previewSwitching.set(false);
      this.previewCourse.set(course);
      if (switching) {
        this.previewSwitching.set(true);
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.previewReady.set(true);
      }
    }, PREVIEW_SHOW_DELAY);
  }

  protected onPreviewAnimationEnd(event: AnimationEvent): void {
    if (event.animationName !== 'preview-in') {
      if (event.animationName === 'preview-out') {
        this.previewCourse.set(null);
        this.previewPosition.set(null);
        this.previewReady.set(false);
        this.previewClosing.set(false);
      } else if (event.animationName === 'preview-switch') {
        this.previewSwitching.set(false);
        this.previewReady.set(true);
      }
      return;
    }
    this.previewReady.set(true);
  }

  /** Used by both the card and the preview popup, so moving between the two never closes it. */
  protected scheduleHide(): void {
    this.clearShowTimer();
    this.clearHideTimer();
    this.hideTimer = setTimeout(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.previewCourse.set(null);
        this.previewPosition.set(null);
        this.previewReady.set(false);
        this.previewClosing.set(false);
        this.previewSwitching.set(false);
      } else {
        this.previewClosing.set(true);
      }
    }, PREVIEW_HIDE_DELAY);
  }

  protected cancelHide(): void {
    this.clearHideTimer();
    this.previewClosing.set(false);
    this.previewSwitching.set(false);
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

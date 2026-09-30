import { Component, ElementRef, Injector, OnDestroy, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CoursesService } from '../../core/courses.service';
import { AccessService } from '../../core/access.service';
import { AuthModalService } from '../../core/auth-modal.service';
import { CourseDetail, CourseLevelSlug, CourseLevelVersion, Lesson, Person, ShowSeason } from '../../core/models';
import { profilePlaceholderUrl } from '../../core/profile-placeholders';
import { isAnonymousFreeLimitReached } from '../../core/registration-settings';
import { MorphHandoff, MorphRect, TransitionService } from '../../core/transition.service';
import { VisitorService } from '../../core/visitor.service';
import { WatchProgressService } from '../../core/watch-progress.service';
import { trailerEmbedUrl as buildTrailerEmbedUrl } from '../layout-style-3/trailer-embed-url';

type PageStatus = 'loading' | 'error' | 'ready';

@Component({
  selector: 'app-course-detail',
  imports: [RouterLink],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss'
})
export class CourseDetailPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coursesService = inject(CoursesService);
  private readonly accessService = inject(AccessService);
  private readonly authModal = inject(AuthModalService);
  private readonly transition = inject(TransitionService);
  private readonly visitor = inject(VisitorService);
  private readonly watchProgress = inject(WatchProgressService);
  private readonly injector = inject(Injector);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly status = signal<PageStatus>('loading');
  protected readonly course = signal<CourseDetail | null>(null);

  /** Captured once at construction time — the exact instant this page was created for. */
  protected readonly morph: MorphHandoff | null = this.transition.consume();
  /** Controls only the overlay's .morph--hidden class. */
  protected readonly overlayHidden = signal(false);
  /** Controls only the real page's .detail--visible class. */
  protected readonly contentVisible = signal(false);
  /** Becomes true when both the route handoff and course data can reveal the page. */
  protected readonly entryReady = signal(false);
  /** Drives only the border-radius CSS class — the box itself is morphRect below. */
  protected readonly grown = signal(false);
  protected readonly rowsRevealed = signal(false);
  protected readonly leaving = signal(false);
  protected readonly trailerOpen = signal(false);
  protected readonly trailerClosing = signal(false);
  protected readonly languageMenuOpen = signal(false);
  protected readonly levelMenuOpen = signal(false);
  protected readonly levelButtonMenuOpen = signal(false);
  protected readonly seasonMenuOpen = signal(false);
  protected readonly instructorOpen = signal(false);
  protected readonly selectedLanguage = signal('en');
  protected readonly selectedLevel = signal<CourseLevelSlug>('beginner');
  protected readonly selectedSeason = signal('season-1');
  protected readonly trailerEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const url = buildTrailerEmbedUrl(this.course()?.trailer_link);
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
  protected readonly trailerVideoUrl = computed(() => {
    const url = this.course()?.trailer_link?.trim();
    return url && !/vimeo\.com/i.test(url) ? url : null;
  });
  private readonly pendingLesson = signal<Lesson | null>(null);
  private backNavigationTimer?: ReturnType<typeof setTimeout>;
  private trailerCloseTimer?: ReturnType<typeof setTimeout>;

  /**
   * The morph overlay's current target box, in plain pixel numbers on both
   * ends (never a vw/dvh string) — mixing unit types on a CSS-transitioned
   * property is unreliable across browsers and was why the reverse
   * (shrink) animation was landing at the middle of the screen instead of
   * back at the original card's rect.
   */
  protected readonly morphRect = signal<MorphRect | null>(this.morph?.rect ?? null);

  private readonly backIconEl = viewChild<ElementRef<HTMLElement>>('backIconEl');
  private readonly lessonsTitleEl = viewChild<ElementRef<HTMLElement>>('lessonsTitleEl');
  private readonly onResize = (): void => this.alignLessonsWithBack();

  constructor() {
    effect(() => {
      if (!this.course() || !this.entryReady() || this.contentVisible()) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.contentVisible.set(true));
      });
    });

    effect(() => {
      const lesson = this.pendingLesson();
      const course = this.course();
      if (!lesson || !course || this.authModal.isOpen() || !this.visitor.isRegistered()) return;
      this.pendingLesson.set(null);
      this.router.navigate(['/courses', course.id, 'lessons', lesson.id]);
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.coursesService.getCourse(id).subscribe({
      next: (course) => {
        this.course.set(course);
        this.instructorOpen.set(false);
        this.status.set('ready');
        this.selectedLanguage.set(this.courseLanguages(course)[0]?.slug ?? 'en');
        const requestedLevel = this.route.snapshot.queryParamMap.get('level') as CourseLevelSlug | null;
        const availableLevels = this.courseLevelOptions(course);
        this.selectedLevel.set(availableLevels.find(option => option.slug === requestedLevel)?.slug ?? availableLevels[0]?.slug ?? 'beginner');
        const requestedSeason = this.route.snapshot.queryParamMap.get('season');
        const availableSeasons = this.showSeasonOptions(course);
        this.selectedSeason.set(availableSeasons.find(option => option.slug === requestedSeason)?.slug ?? availableSeasons.find(option => option.slug === 'season-1')?.slug ?? availableSeasons[0]?.slug ?? 'season-1');
        // Title/description length (and so the hero's height) varies per
        // course, so the gap to close is measured after render rather than
        // guessed as a fixed number. afterNextRender (not a manual rAF
        // guess) is what guarantees the DOM has actually been updated with
        // this course's content before we read positions from it.
        afterNextRender(() => this.alignLessonsWithBack(), { injector: this.injector });
      },
      error: () => this.status.set('error')
    });

    if (this.morph) {
      // Double rAF: the first lets the browser paint the small starting
      // rect, the second flips to the real fullscreen box so the CSS
      // transition has two distinct frames to animate between instead of
      // jumping straight there.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.morphRect.set(this.fullscreenRect());
          this.grown.set(true);
        });
      });
    } else {
      this.overlayHidden.set(true);
      // Keep the initial off-screen state in the DOM for one painted frame.
      // Setting this synchronously during construction makes direct loads
      // render the revealed state immediately, skipping the entrance motion.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.entryReady.set(true));
      });
    }

    // The lesson rows' slide-in only fires once BOTH the course data has
    // rendered and the entry morph has actually finished — whichever of
    // those two independent things happens to resolve second. Doing it as
    // an effect (instead of chaining off just one of them) avoids a race
    // where, if the mock API happened to respond before the morph
    // animation finished, the rows would already exist by the time
    // .detail--visible flipped on and never get a "before" frame to
    // transition from — which is why they weren't animating at all.
    effect(() => {
      if (this.course() && this.contentVisible() && !this.rowsRevealed()) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => this.rowsRevealed.set(true));
        });
      }
    });

    window.addEventListener('resize', this.onResize, { passive: true });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.backNavigationTimer !== undefined) {
      clearTimeout(this.backNavigationTimer);
    }
    if (this.trailerCloseTimer !== undefined) {
      clearTimeout(this.trailerCloseTimer);
    }
    document.body.style.overflow = '';
  }

  private fullscreenRect(): MorphRect {
    return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
  }

  /** Nudges .detail__body up/down so "Lessons" lines up exactly with the top of the back-arrow circle. */
  private alignLessonsWithBack(): void {
    const backIcon = this.backIconEl()?.nativeElement;
    const lessonsTitle = this.lessonsTitleEl()?.nativeElement;
    if (!backIcon || !lessonsTitle) {
      return;
    }

    const body = lessonsTitle.closest('.detail__body') as HTMLElement | null;
    if (!body) {
      return;
    }

    const diff = lessonsTitle.getBoundingClientRect().top - backIcon.getBoundingClientRect().top;
    const currentMarginTop = parseFloat(getComputedStyle(body).marginTop) || 0;
    body.style.marginTop = `${currentMarginTop - diff}px`;
  }

  protected onMorphTransitionEnd(event: TransitionEvent): void {
    // top/left/width/height/border-radius all transition together, so this
    // fires once per property — react to just one of them (width is always
    // part of every state change here) instead of running this multiple
    // times per animation.
    if (event.propertyName !== 'width') {
      return;
    }
    // Forward grow just finished: hand off from the overlay to the real page.
    this.overlayHidden.set(true);
    this.entryReady.set(true);
  }

  /**
   * Going back doesn't animate anything on THIS page — the shrink-back-down
   * needs to happen over the catalog page (which is already sitting there,
   * fully rendered), not over this one, or it looks like this page stays
   * open behind it instead of the catalog. So this just hands the course id
   * + image to the catalog via the TransitionService and navigates
   * immediately; CourseCatalog is what actually plays the shrink, once it
   * can measure where the real card ends up after scroll restoration.
   */
  protected goBack(event: Event): void {
    event.preventDefault();
    if (this.leaving()) return;
    const course = this.course();
    if (course) {
      this.transition.stageReturn(
        course.id,
        this.morph?.rowTitle ?? 'All Courses',
        this.backdropUrl(),
        this.morph?.style2State
      );
    }

    this.leaving.set(true);
    this.backNavigationTimer = setTimeout(() => {
      this.router.navigate(['/layout-style-3']);
    }, 240);

  }

  protected courseTypeLabel(course: CourseDetail): string {
    if (course.course_types.includes('Shows')) return 'Show';
    return course.course_types.includes('Platform') ? 'Platform Course' : 'Trading Course';
  }

  protected lessonListLabel(course: CourseDetail | null = this.course()): string {
    if (!course) return 'Lessons';
    return this.isShow(course) ? this.currentSeasonLabel(course) : this.selectedLevelLabel(course);
  }

  protected isShow(course: CourseDetail): boolean {
    return course.course_types.includes('Shows');
  }

  protected activeVariant(course: CourseDetail): CourseLevelVersion | ShowSeason | null {
    const language = course.languages?.[this.selectedLanguage()];
    return this.isShow(course)
      ? language?.seasons?.[this.selectedSeason()] ?? course.seasons?.[this.selectedSeason()] ?? null
      : language?.levels?.[this.selectedLevel()] ?? course.levels?.[this.selectedLevel()] ?? null;
  }

  protected activeLessons(course: CourseDetail): Lesson[] {
    return this.activeVariant(course)?.lessons ?? course.lessons;
  }

  protected activeTitle(course: CourseDetail): string {
    return this.activeVariant(course)?.title || course.title;
  }

  protected activeContent(course: CourseDetail): string {
    return this.activeVariant(course)?.content || course.content;
  }

  protected activeTitleImage(course: CourseDetail): string | null {
    return this.activeVariant(course)?.title_image || course.title_image || null;
  }

  protected courseLevelOptions(course: CourseDetail): Array<{ slug: CourseLevelSlug; label: string }> {
    const labels: Record<CourseLevelSlug, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
    const languageLevels = course.languages?.[this.selectedLanguage()]?.levels;
    const levels = languageLevels && Object.keys(languageLevels).length ? languageLevels : course.levels ?? {};
    const configured = course.configured_levels ?? [];
    return (Object.keys(labels) as CourseLevelSlug[]).filter(slug =>
      Boolean(levels[slug]?.enabled) && (!configured.length || configured.some(item => item === slug || item.endsWith(`-${slug}`)))
    ).map(slug => ({ slug, label: labels[slug] }));
  }

  protected alternateLevelOptions(course: CourseDetail): Array<{ slug: CourseLevelSlug; label: string }> {
    return this.courseLevelOptions(course).filter(option => option.slug !== this.selectedLevel());
  }

  protected showSeasonOptions(course: CourseDetail): Array<{ slug: string; label: string }> {
    const language = course.languages?.[this.selectedLanguage()];
    const seasons = language?.seasons ?? course.seasons ?? {};
    return Object.entries(seasons).filter(([, season]) => season.enabled).map(([key, season]) => ({
      slug: season.season_key || key,
      label: season.label || key.replace(/^season-(\d+)$/, 'Season $1'),
    }));
  }

  protected alternateSeasonOptions(course: CourseDetail): Array<{ slug: string; label: string }> {
    return this.showSeasonOptions(course).filter(option => option.slug !== this.selectedSeason());
  }

  protected currentSeasonLabel(course: CourseDetail): string {
    return this.showSeasonOptions(course).find(option => option.slug === this.selectedSeason())?.label ?? 'Season 1';
  }

  protected selectedLevelLabel(course: CourseDetail): string {
    return this.courseLevelOptions(course).find(option => option.slug === this.selectedLevel())?.label ?? 'Beginner';
  }

  protected toggleLevelMenu(): void { this.levelMenuOpen.update(open => !open); }
  protected toggleLevelButtonMenu(): void { this.levelButtonMenuOpen.update(open => !open); }
  protected toggleSeasonMenu(): void { this.seasonMenuOpen.update(open => !open); }
  protected closeLevelMenu(): void { this.levelMenuOpen.set(false); }
  protected closeLevelButtonMenu(): void { this.levelButtonMenuOpen.set(false); }
  protected closeSeasonMenu(): void { this.seasonMenuOpen.set(false); }

  protected chooseLevel(option: { slug: CourseLevelSlug; label: string }): void {
    this.selectedLevel.set(option.slug);
    this.levelMenuOpen.set(false);
    this.levelButtonMenuOpen.set(false);
    this.router.navigate([], { relativeTo: this.route, queryParams: { level: option.slug, season: null }, queryParamsHandling: 'merge' });
  }

  protected chooseSeason(option: { slug: string; label: string }): void {
    this.selectedSeason.set(option.slug);
    this.seasonMenuOpen.set(false);
    this.levelButtonMenuOpen.set(false);
    this.router.navigate([], { relativeTo: this.route, queryParams: { season: option.slug, level: null }, queryParamsHandling: 'merge' });
  }

  /** "Course Image" (Course Builder's Media tab) is the intended hero image; thumbnail (the catalog-card image) and a placeholder are just fallbacks for a course that hasn't set one. */
  protected backdropUrl(): string {
    const course = this.course();
    if (!course) {
      return '';
    }
    return this.activeVariant(course)?.image ?? course.image ?? course.thumbnail ?? `https://picsum.photos/seed/tcnexus-${course.id}/1600/900`;
  }

  protected openOverview(): void {
    const link = this.course()?.overview_link;
    if (link) {
      window.open(link, '_blank', 'noopener');
    }
  }

  protected startWatching(): void {
    const course = this.course();
    const firstLesson = course ? this.activeLessons(course)[0] : undefined;
    if (!course || !firstLesson) return;
    this.router.navigate(['/courses', course.id, 'lessons', firstLesson.id], { queryParams: { restart: '1' } });
  }

  protected openTrailer(): void {
    if (!this.course()?.trailer_link) return;
    if (this.trailerCloseTimer !== undefined) {
      clearTimeout(this.trailerCloseTimer);
      this.trailerCloseTimer = undefined;
    }
    this.trailerClosing.set(false);
    this.trailerOpen.set(false);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => this.trailerOpen.set(true)));
  }

  protected closeTrailer(): void {
    if (!this.trailerOpen()) return;
    this.trailerClosing.set(true);
    this.trailerOpen.set(false);
    this.trailerCloseTimer = setTimeout(() => {
      this.trailerClosing.set(false);
      this.trailerCloseTimer = undefined;
      document.body.style.overflow = '';
    }, 650);
  }

  protected courseLanguages(course: CourseDetail): Array<{ slug: string; label: string }> {
    const configured = Object.entries(course.languages ?? {}).map(([slug, language]) => ({ slug, label: language.label }));
    const defaults = [
      { slug: 'en', label: 'English' },
      { slug: 'es', label: 'Spanish' },
      { slug: 'pt', label: 'Portuguese' },
    ];
    const options = configured.length ? configured : defaults;
    return options.filter((language, index, all) => all.findIndex(item => item.slug === language.slug) === index);
  }

  protected selectedLanguageLabel(course: CourseDetail): string {
    return this.courseLanguages(course).find(language => language.slug === this.selectedLanguage())?.label
      ?? this.courseLanguages(course)[0]?.label
      ?? 'English';
  }

  protected toggleLanguageMenu(): void {
    this.languageMenuOpen.update(open => !open);
  }

  protected closeLanguageMenu(): void {
    this.languageMenuOpen.set(false);
  }

  protected chooseLanguage(language: { slug: string; label: string }): void {
    this.selectedLanguage.set(language.slug);
    this.languageMenuOpen.set(false);
    const course = this.course();
    if (!course) return;
    if (this.isShow(course)) {
      const seasons = this.showSeasonOptions(course);
      if (!seasons.some(option => option.slug === this.selectedSeason())) {
        this.selectedSeason.set(seasons.find(option => option.slug === 'season-1')?.slug ?? seasons[0]?.slug ?? 'season-1');
      }
      return;
    }
    const levels = this.courseLevelOptions(course);
    if (!levels.some(option => option.slug === this.selectedLevel())) {
      this.selectedLevel.set(levels[0]?.slug ?? 'beginner');
    }
  }

  protected personPhotoUrl(person: Person): string {
    return person.photo || profilePlaceholderUrl(person.id);
  }

  protected toggleInstructor(): void {
    this.instructorOpen.update(open => !open);
  }

  protected instructorLabel(detail: CourseDetail): string {
    const instructorCount = detail.instructor?.length ?? 0;
    const guestCount = detail.guest?.length ?? 0;
    const instructorLabel = instructorCount === 1 ? 'Instructor' : 'Instructors';
    const guestLabel = guestCount === 1 ? 'Guest' : 'Guests';
    if (instructorCount === 0) return guestLabel;
    if (guestCount === 0) return instructorLabel;
    return `${instructorLabel} and ${guestLabel}`;
  }

  protected people(value: Person | Person[]): Person[] {
    return Array.isArray(value) ? value : [value];
  }

  /** Locked (paid-tier) rows don't navigate yet — paywall gating is future work. */
  /**
   * Not gated on isLessonLocked() — that's a client-side heuristic for the
   * lock icon only (and can't know about the free-view limit at all). The
   * lesson player calls the real checkAccess() endpoint and is the actual
   * source of truth, showing its own blocked state with a register CTA when
   * access is genuinely denied — better than a dead-end click here that
   * might be wrong anyway (e.g. free-tier limit reached, which this can't see).
   */
  protected openLesson(lesson: Lesson): void {
    const course = this.course();
    if (!course) return;
    this.accessService.checkAccess(lesson.id).subscribe({
      next: (access) => {
        if (access.reason === 'requires_payment') {
          this.authModal.open('paid');
          return;
        }
        if (isAnonymousFreeLimitReached(access, this.visitor.isRegistered())) {
          this.pendingLesson.set(lesson);
          this.authModal.open('choice');
          return;
        }
        this.router.navigate(['/courses', course.id, 'lessons', lesson.id]);
      },
      error: () => this.router.navigate(['/courses', course.id, 'lessons', lesson.id]),
    });
  }

  /** Same destination as openLesson, but tells the player (via ?restart=1) to skip resuming saved progress. */
  protected restartLesson(lesson: Lesson, event: Event): void {
    event.stopPropagation();
    const course = this.course();
    if (!course) return;
    this.router.navigate(['/courses', course.id, 'lessons', lesson.id], { queryParams: { restart: '1' } });
  }

  /** Client-side heuristic for the lock icon only — see openLesson's comment. */
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

  /** Staggers the slide-in-from-right reveal, capped so a long lesson list doesn't drag it out. */
  protected lessonRowDelay(index: number): string {
    return (180 + Math.min(index * 40, 600)) + 'ms';
  }

}

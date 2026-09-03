import { Location } from '@angular/common';
import { Component, ElementRef, Injector, OnDestroy, afterNextRender, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CoursesService } from '../../core/courses.service';
import { AccessService } from '../../core/access.service';
import { AuthModalService } from '../../core/auth-modal.service';
import { CourseDetail, Lesson, Person } from '../../core/models';
import { isAnonymousFreeLimitReached } from '../../core/registration-settings';
import { MorphHandoff, MorphRect, TransitionService } from '../../core/transition.service';
import { VisitorService } from '../../core/visitor.service';
import { WatchProgressService } from '../../core/watch-progress.service';

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
  private readonly location = inject(Location);
  private readonly coursesService = inject(CoursesService);
  private readonly accessService = inject(AccessService);
  private readonly authModal = inject(AuthModalService);
  private readonly transition = inject(TransitionService);
  private readonly visitor = inject(VisitorService);
  private readonly watchProgress = inject(WatchProgressService);
  private readonly injector = inject(Injector);

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
  private readonly pendingLesson = signal<Lesson | null>(null);
  private backNavigationTimer?: ReturnType<typeof setTimeout>;

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
        this.status.set('ready');
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
      if (this.morph?.source === 'style-2' && this.morph.style2State) {
        this.router.navigate(['/animation-style-2'], {
          queryParams: {
            style2Scroll: this.morph.style2State.scrollLeft,
            style2Featured: this.morph.style2State.featuredId,
          }
        });
      } else if (this.morph) {
        this.location.back();
      } else {
        this.router.navigate(['/']);
      }
    }, 240);

  }

  protected courseTypeLabel(course: CourseDetail): string {
    return course.course_types.includes('Platform') ? 'Platform Course' : 'Trading Course';
  }

  /** "Course Image" (Course Builder's Media tab) is the intended hero image; thumbnail (the catalog-card image) and a placeholder are just fallbacks for a course that hasn't set one. */
  protected backdropUrl(): string {
    const course = this.course();
    if (!course) {
      return '';
    }
    return course.image ?? course.thumbnail ?? `https://picsum.photos/seed/tcnexus-${course.id}/1600/900`;
  }

  protected openOverview(): void {
    const link = this.course()?.overview_link;
    if (link) {
      window.open(link, '_blank', 'noopener');
    }
  }

  protected personPhotoUrl(person: Person): string {
    return person.photo ?? `https://i.pravatar.cc/80?u=${person.id}`;
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

import { AfterViewInit, Component, ElementRef, HostListener, Injector, OnDestroy, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Course, CourseDetail, Lesson, Person } from '../../core/models';
import { CoursesService } from '../../core/courses.service';
import { CatalogScrollService } from '../../core/catalog-scroll.service';
import { MorphRect, TransitionService } from '../../core/transition.service';
import { RowScrollDirective, ScrollEdges } from '../catalog/row-scroll.directive';

const EMPTY_EDGES: ScrollEdges = { atStart: true, atEnd: true };
type CarouselKind = 'trading' | 'platform';
const PAGE_EXIT_DURATION = 280;
const STYLE2_SCROLL_STORAGE_KEY = 'tcnexus-style2-trading-scroll';
const STYLE2_FEATURED_STORAGE_KEY = 'tcnexus-style2-featured-id';

interface ReturnOverlayState {
  thumbnailUrl: string;
}

@Component({
  selector: 'app-animation-style-2',
  imports: [RowScrollDirective],
  templateUrl: './animation-style-2.html',
  styleUrl: './animation-style-2.scss'
})
export class AnimationStyle2Page implements AfterViewInit, OnDestroy {
  private readonly coursesService = inject(CoursesService);
  private readonly catalogScroll = inject(CatalogScrollService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly transition = inject(TransitionService);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly carousel = viewChild<ElementRef<HTMLElement>>('carousel');
  private readonly platformTrack = viewChild<ElementRef<HTMLElement>>('platformTrack');
  private readonly platformCarousel = viewChild<ElementRef<HTMLElement>>('platformCarousel');
  private resizeObserver?: ResizeObserver;
  private expandedCardCheck?: ReturnType<typeof setTimeout>;
  private pageExitTimer?: ReturnType<typeof setTimeout>;
  private readonly onScroll = () => this.measureEdges();
  private readonly onPlatformScroll = () => this.measureEdges('platform');

  protected readonly courses = signal<Course[]>([]);
  protected readonly featured = signal<Course | null>(null);
  protected readonly descriptionExpanded = signal(false);
  protected readonly descriptionHovered = signal(false);
  protected readonly descriptionOpen = computed(() => this.descriptionExpanded() || this.descriptionHovered());
  protected readonly featuredDetail = signal<CourseDetail | null>(null);
  protected readonly lessonsOpen = signal(false);
  protected readonly lessonsRevealed = signal(false);
  protected readonly carouselCourses = computed(() => {
    const featuredId = this.featured()?.id;
    return this.courses().filter(course => course.id !== featuredId);
  });
  protected readonly edges = signal<ScrollEdges>(EMPTY_EDGES);
  protected readonly platformEdges = signal<ScrollEdges>(EMPTY_EDGES);
  protected readonly leaving = signal(false);
  protected readonly returning = signal(false);
  protected readonly returnRevealed = signal(false);
  protected readonly returnOverlay = signal<ReturnOverlayState | null>(null);
  protected readonly returnRect = signal<MorphRect | null>(null);
  protected readonly returnSettled = signal(false);
  private readonly pendingReturn = this.transition.consumeReturn();
  private returnAnimationStarted = false;
  protected readonly platformCourses: Course[] = Array.from({ length: 8 }, (_, index) => ({
    id: -(index + 1),
    title: ['Platform Foundations', 'Reading the Dashboard', 'Workspace Setup', 'Building Your Watchlist', 'Chart Tools Essentials', 'Alerts and Notifications', 'Using the Trade Journal', 'Platform Shortcuts'][index],
    excerpt: 'Learn the tools and workflows that make the TC Nexus platform easier to use.',
    thumbnail: `https://picsum.photos/seed/tcnexus-platform-${String(index + 1).padStart(2, '0')}/640/360`,
    image: null,
    course_types: ['Platform'],
    lesson_count: 4 + (index % 4),
    overview_link: null,
  }));

  constructor() {
    if (this.pendingReturn) {
      this.returning.set(true);
      this.returnRect.set({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight });
      this.returnOverlay.set({ thumbnailUrl: this.pendingReturn.thumbnailUrl });
    }

    this.coursesService.getCourses().subscribe({
      next: courses => {
        const available = courses.filter(course => !course.course_types.includes('Platform'));
        const queryFeaturedId = this.readQueryNumber('style2Featured');
        const savedFeaturedId = this.pendingReturn
          ? this.pendingReturn.style2State?.featuredId
            ?? queryFeaturedId
            ?? this.readSessionNumber(STYLE2_FEATURED_STORAGE_KEY)
            ?? this.catalogScroll.get('animation-style-2-featured')
          : this.catalogScroll.get('animation-style-2-featured');
        const featured = available.find(course => course.id === savedFeaturedId)
          ?? available[Math.floor(Math.random() * available.length)]
          ?? courses[0]
          ?? null;
        this.featured.set(featured);
        this.courses.set(courses.slice(0, 12));
        if (this.pendingReturn) {
          // Wait for Angular to commit the async course list to the DOM. The
          // track exists before the cards do, so restoring from rAF alone can
          // still run against an empty track and leave the row at slide one.
          afterNextRender(() => {
            this.restoreTradingCarouselPosition();
            this.startReturnAnimation(this.pendingReturn!.courseId);
          }, { injector: this.injector });
        }
        if (featured) {
          this.coursesService.getCourse(featured.id).subscribe({
            next: detail => {
              if (this.featured()?.id === detail.id) this.featuredDetail.set(detail);
            }
          });
        }
      },
    });
  }

  ngAfterViewInit(): void {
    const track = this.track()?.nativeElement;
    const platformTrack = this.platformTrack()?.nativeElement;
    if (!track && !platformTrack) return;
    track?.addEventListener('scroll', this.onScroll, { passive: true });
    platformTrack?.addEventListener('scroll', this.onPlatformScroll, { passive: true });
    this.resizeObserver = new ResizeObserver(() => {
      this.measureEdges('trading');
      this.measureEdges('platform');
    });
    if (track) this.resizeObserver.observe(track);
    if (platformTrack) this.resizeObserver.observe(platformTrack);
    this.updateArtworkHeight('trading');
    this.updateArtworkHeight('platform');
    this.measureEdges();
    this.measureEdges('platform');
  }

  ngOnDestroy(): void {
    const track = this.track()?.nativeElement;
    const platformTrack = this.platformTrack()?.nativeElement;
    track?.removeEventListener('scroll', this.onScroll);
    platformTrack?.removeEventListener('scroll', this.onPlatformScroll);
    this.resizeObserver?.disconnect();
    if (this.expandedCardCheck !== undefined) {
      clearTimeout(this.expandedCardCheck);
    }
    if (this.pageExitTimer !== undefined) {
      clearTimeout(this.pageExitTimer);
    }
  }

  protected scroll(direction: -1 | 1, kind: CarouselKind = 'trading'): void {
    const track = (kind === 'platform' ? this.platformTrack() : this.track())?.nativeElement;
    if (!track) return;

    // Calculate page positions from the actual cards. Browser snapping can
    // otherwise land between card groups, leaving too much of the previous
    // card visible beside the navigation arrow.
    const cards = Array.from(track.querySelectorAll<HTMLElement>('.style-card'));
    const cardsPerPage = Number.parseInt(getComputedStyle(track).getPropertyValue('--cards-per-page'), 10) || 1;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const pageTargets = cards
      .filter((_, index) => index % cardsPerPage === 0)
      .map(card => Math.min(maxScroll, Math.max(0, card.offsetLeft)));
    if (pageTargets.length < 2) return;

    let currentPage = 0;
    pageTargets.forEach((target, index) => {
      if (target <= track.scrollLeft + 2) currentPage = index;
    });
    const nextPage = Math.max(0, Math.min(pageTargets.length - 1, currentPage + direction));
    track.scrollTo({ left: pageTargets[nextPage], behavior: 'smooth' });
  }

  protected courseTypeLabel(course: Course): string {
    return course.course_types.includes('Platform') ? 'Platform Course' : 'Trading Course';
  }

  protected toggleDescription(): void {
    this.descriptionHovered.set(false);
    this.descriptionExpanded.update(open => !open);
  }

  protected openDescriptionOnHover(): void {
    this.descriptionHovered.set(true);
  }

  protected closeDescriptionOnHover(): void {
    this.descriptionHovered.set(false);
  }

  protected startWatching(course: Course): void {
    this.router.navigate(['/courses', course.id]);
  }

  protected openCourse(course: Course, event?: Event): void {
    const source = event?.currentTarget instanceof HTMLElement
      ? event.currentTarget.closest('.style-card') as HTMLElement | null
      : null;
    this.navigateToCourse(course, source?.getBoundingClientRect());
  }

  /** Starts playback at the course's first lesson instead of opening the detail page. */
  protected playCourse(course: Course, event: Event): void {
    event.stopPropagation();

    this.coursesService.getCourse(course.id).subscribe({
      next: detail => {
        const firstLesson = detail.lessons[0];
        if (firstLesson) {
          this.router.navigate(['/courses', course.id, 'lessons', firstLesson.id], {
            queryParams: { restart: '1' }
          });
        }
      }
    });
  }

  protected toggleLessons(course: Course): void {
    if (this.lessonsOpen()) {
      this.closeLessons();
      return;
    }

    this.lessonsOpen.set(true);
    this.lessonsRevealed.set(false);
    const existing = this.featuredDetail();
    if (existing?.id === course.id) {
      this.revealLessons();
      return;
    }

    this.coursesService.getCourse(course.id).subscribe({
      next: detail => {
        if (this.featured()?.id !== detail.id || !this.lessonsOpen()) return;
        this.featuredDetail.set(detail);
        this.revealLessons();
      }
    });
  }

  protected closeLessons(): void {
    this.lessonsOpen.set(false);
    this.lessonsRevealed.set(false);
  }

  protected openLesson(lesson: Lesson): void {
    const course = this.featuredDetail();
    if (!course) return;
    this.router.navigate(['/courses', course.id, 'lessons', lesson.id]);
  }

  protected lessonThumbnailUrl(lesson: Lesson): string {
    return lesson.thumbnail ?? `https://picsum.photos/seed/tcnexus-lesson-${lesson.id}/640/360`;
  }

  private revealLessons(): void {
    requestAnimationFrame(() => requestAnimationFrame(() => this.lessonsRevealed.set(true)));
  }

  protected openOverview(course: Course): void {
    if (course.overview_link) {
      window.open(course.overview_link, '_blank', 'noopener');
      return;
    }
    this.navigateToCourse(course);
  }

  private navigateToCourse(course: Course, rect?: DOMRect): void {
    const track = this.track()?.nativeElement;
    if (track) {
      this.catalogScroll.save('animation-style-2', track.scrollLeft);
      this.writeSessionNumber(STYLE2_SCROLL_STORAGE_KEY, track.scrollLeft);
    }
    const featuredId = this.featured()?.id;
    if (featuredId !== undefined) {
      this.catalogScroll.save('animation-style-2-featured', featuredId);
      this.writeSessionNumber(STYLE2_FEATURED_STORAGE_KEY, featuredId);
    }
    if (rect) {
      this.transition.stage(
        { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        course.thumbnail ?? course.image ?? `https://picsum.photos/seed/tcnexus-style2-${course.id}/640/360`,
        'Trading Courses',
        'style-2',
        { scrollLeft: track?.scrollLeft ?? 0, featuredId: this.featured()?.id ?? 0 }
      );
    }
    this.leaving.set(true);
    this.pageExitTimer = setTimeout(() => this.router.navigate(['/courses', course.id]), PAGE_EXIT_DURATION);
  }

  private restoreTradingCarouselPosition(): void {
    const track = this.track()?.nativeElement;
    const saved = this.pendingReturn?.style2State?.scrollLeft
      ?? this.readQueryNumber('style2Scroll')
      ?? this.readSessionNumber(STYLE2_SCROLL_STORAGE_KEY)
      ?? this.catalogScroll.get('animation-style-2');
    if (!track || saved === undefined) return;

    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    if (maxScroll > 0) {
      track.scrollLeft = Math.min(saved, maxScroll);
    }
  }

  private readSessionNumber(key: string): number | undefined {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored === null) return undefined;
      const value = Number(stored);
      return Number.isFinite(value) ? value : undefined;
    } catch {
      return undefined;
    }
  }

  private writeSessionNumber(key: string, value: number): void {
    try {
      sessionStorage.setItem(key, String(value));
    } catch {
      // Session storage can be unavailable in privacy-restricted browsers;
      // the in-memory CatalogScrollService remains the fallback.
    }
  }

  private readQueryNumber(key: string): number | undefined {
    const stored = this.route.snapshot.queryParamMap.get(key);
    if (stored === null) return undefined;
    const value = Number(stored);
    return Number.isFinite(value) ? value : undefined;
  }

  private startReturnAnimation(courseId: number): void {
    if (this.returnAnimationStarted) return;

    const background = document.querySelector<HTMLImageElement>('.style-featured__background img');
    if (background && !background.complete) {
      background.addEventListener('load', () => this.startReturnAnimation(courseId), { once: true });
      background.addEventListener('error', () => this.startReturnAnimation(courseId), { once: true });
      return;
    }

    this.returnAnimationStarted = true;
    const card = document.querySelector<HTMLElement>('.style-card[data-course-id="' + courseId + '"]');
    if (!card) {
      this.returnRevealed.set(true);
      this.returnOverlay.set(null);
      this.returning.set(false);
      return;
    }

    this.returnRect.set({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight });
    this.returnSettled.set(true);
    requestAnimationFrame(() => this.returnRect.set(this.rectFromElement(card)));
    setTimeout(() => this.returnRevealed.set(true), 260);
  }

  private rectFromElement(element: HTMLElement): MorphRect {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
  }

  protected onReturnTransitionEnd(event: TransitionEvent): void {
    if (event.propertyName !== 'width') return;
    this.returnOverlay.set(null);
    this.returning.set(false);
    this.returnSettled.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.lessonsOpen()) this.closeLessons();
  }

  protected thumbnailUrl(course: Course, index: number): string {
    return course.thumbnail
      ?? course.image
      ?? `https://picsum.photos/seed/tcnexus-showcase-${String(index + 1).padStart(2, '0')}/640/360`;
  }

  protected featuredImageUrl(course: Course): string {
    return course.image
      ?? course.thumbnail
      ?? `https://picsum.photos/seed/tcnexus-featured-${course.id}/1600/900`;
  }

  protected personPhotoUrl(person: Person): string {
    return person.photo ?? `https://i.pravatar.cc/120?u=tcnexus-${person.id}`;
  }

  protected onImageError(event: Event): void {
    (event.currentTarget as HTMLImageElement).style.display = 'none';
  }

  protected onFeaturedImageError(event: Event): void {
    const image = event.currentTarget as HTMLImageElement;
    if (image.dataset['fallbackApplied']) {
      image.style.display = 'none';
      return;
    }
    image.dataset['fallbackApplied'] = 'true';
    image.src = 'https://picsum.photos/seed/tcnexus-featured-fallback/1600/900';
  }

  protected onCardEnter(event: MouseEvent, kind: CarouselKind = 'trading'): void {
    const card = event.currentTarget as HTMLElement;
    const viewport = (kind === 'platform' ? this.platformTrack() : this.track())?.nativeElement.getBoundingClientRect();
    if (!viewport) return;
    card.classList.toggle('style-card--edge-left', card.getBoundingClientRect().left <= viewport.left + 64);
    card.classList.toggle('style-card--edge-right', card.getBoundingClientRect().right >= viewport.right - 64);

    // Measure after the card's 0.5s expansion has finished. Measuring in the
    // first animation frame only sees the collapsed card and misses the
    // overflow that needs the page to move.
    if (this.expandedCardCheck !== undefined) {
      clearTimeout(this.expandedCardCheck);
    }
    this.expandedCardCheck = setTimeout(() => {
      this.expandedCardCheck = undefined;
      if (!card.matches(':hover')) return;
      const expandedRect = card.getBoundingClientRect();
      const bottomPadding = 24;
      const amountBelowViewport = expandedRect.bottom - (window.innerHeight - bottomPadding);
      if (amountBelowViewport > 0) {
        window.scrollBy({ top: amountBelowViewport, behavior: 'smooth' });
      }
    }, 550);
  }

  protected onCardLeave(): void {
    if (this.expandedCardCheck !== undefined) {
      clearTimeout(this.expandedCardCheck);
      this.expandedCardCheck = undefined;
    }
    // Keep the edge origin on the card through its scale-down transition.
    // Removing it here makes the card jump back to center before it shrinks.
  }

  private measureEdges(kind: CarouselKind = 'trading'): void {
    const track = (kind === 'platform' ? this.platformTrack() : this.track())?.nativeElement;
    if (!track) return;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const edges = {
      atStart: track.scrollLeft <= 1,
      atEnd: maxScroll <= 1 || track.scrollLeft >= maxScroll - 1,
    };
    (kind === 'platform' ? this.platformEdges : this.edges).set(edges);
    this.updateArtworkHeight(kind);
  }

  private updateArtworkHeight(kind: CarouselKind = 'trading'): void {
    const carousel = (kind === 'platform' ? this.platformCarousel() : this.carousel())?.nativeElement;
    const track = (kind === 'platform' ? this.platformTrack() : this.track())?.nativeElement;
    const art = track?.querySelector<HTMLElement>('.style-card__art');
    if (carousel && art) {
      // Use layout height rather than the transformed visual bounds. The
      // first card scales from its left edge, and measuring its bounding box
      // while hovered would make the navigation column grow with the card.
      carousel.style.setProperty('--art-height', `${art.offsetHeight}px`);
    }
  }
}

import { AfterViewInit, Component, ElementRef, HostListener, Injector, OnDestroy, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { catchError, forkJoin, of } from 'rxjs';
import { Course, CourseDetail, CourseLevelSlug, Lesson, Person } from '../../core/models';
import { profilePlaceholderUrl } from '../../core/profile-placeholders';
import { CoursesService } from '../../core/courses.service';
import { CatalogScrollService } from '../../core/catalog-scroll.service';
import { MorphRect, TransitionService } from '../../core/transition.service';
import { RowScrollDirective, ScrollEdges } from '../catalog/row-scroll.directive';
import { trailerEmbedUrl } from './trailer-embed-url';

const EMPTY_EDGES: ScrollEdges = { atStart: true, atEnd: true };
type CarouselKind = 'shows' | 'trading' | 'platform';
const PAGE_EXIT_DURATION = 280;
const STYLE2_SCROLL_STORAGE_KEY = 'tcnexus-style2-trading-scroll';
const STYLE2_FEATURED_KIND_STORAGE_KEY = 'tcnexus-style2-featured-kind';
const COURSE_OVERVIEW_PDF_URL = '/course-overviews/Market-Mavericks.pdf';

interface ReturnOverlayState {
  thumbnailUrl: string;
}

const DEMO_SHOWS: Course[] = [
  {
    id: -101,
    title: 'Demo Show 01',
    excerpt: 'A sample show card for previewing the Shows carousel.',
    thumbnail: 'https://picsum.photos/seed/tcnexus-demo-show-01/640/360',
    image: null,
    course_types: ['Shows'],
    lesson_count: 6,
    overview_link: null,
    trailer_link: null,
    configured_levels: ['beginner'],
  },
  {
    id: -102,
    title: 'Demo Show 02',
    excerpt: 'A sample show card for previewing the Shows carousel.',
    thumbnail: 'https://picsum.photos/seed/tcnexus-demo-show-02/640/360',
    image: null,
    course_types: ['Shows'],
    lesson_count: 8,
    overview_link: null,
    trailer_link: null,
    configured_levels: ['beginner', 'intermediate'],
  },
  {
    id: -103,
    title: 'Demo Show 03',
    excerpt: 'A sample show card for previewing the Shows carousel.',
    thumbnail: 'https://picsum.photos/seed/tcnexus-demo-show-03/640/360',
    image: null,
    course_types: ['Shows'],
    lesson_count: 5,
    overview_link: null,
    trailer_link: null,
    configured_levels: ['beginner', 'intermediate', 'advanced'],
  },
  {
    id: -104,
    title: 'Demo Show 04',
    excerpt: 'A sample show card for previewing the Shows carousel.',
    thumbnail: 'https://picsum.photos/seed/tcnexus-demo-show-04/640/360',
    image: null,
    course_types: ['Shows'],
    lesson_count: 7,
    overview_link: null,
    trailer_link: null,
    configured_levels: ['beginner'],
  },
];

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
  private readonly sanitizer = inject(DomSanitizer);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly carousel = viewChild<ElementRef<HTMLElement>>('carousel');
  private readonly platformTrack = viewChild<ElementRef<HTMLElement>>('platformTrack');
  private readonly platformCarousel = viewChild<ElementRef<HTMLElement>>('platformCarousel');
  private readonly showsTrack = viewChild<ElementRef<HTMLElement>>('showsTrack');
  private readonly showsCarousel = viewChild<ElementRef<HTMLElement>>('showsCarousel');
  private readonly overviewViewer = viewChild<ElementRef<HTMLElement>>('overviewViewer');
  private resizeObserver?: ResizeObserver;
  private expandedCardCheck?: ReturnType<typeof setTimeout>;
  private pageExitTimer?: ReturnType<typeof setTimeout>;
  private descriptionCloseTimer?: ReturnType<typeof setTimeout>;
  private coursePreviewCloseTimer?: ReturnType<typeof setTimeout>;
  private overviewCloseTimer?: ReturnType<typeof setTimeout>;
  private trailerCloseTimer?: ReturnType<typeof setTimeout>;
  private readonly onScroll = () => this.measureEdges();
  private readonly onPlatformScroll = () => this.measureEdges('platform');
  private readonly onShowsScroll = () => this.measureEdges('shows');

  protected readonly courses = signal<Course[]>([]);
  protected readonly shows = signal<Course[]>([]);
  protected readonly featured = signal<Course | null>(null);
  protected readonly descriptionExpanded = signal(false);
  protected readonly descriptionMotion = signal<'closed' | 'opening' | 'open' | 'closing'>('closed');
  protected readonly descriptionOpen = computed(() => this.descriptionMotion() !== 'closed');
  protected readonly featuredDetail = signal<CourseDetail | null>(null);
  protected readonly lessonsOpen = signal(false);
  protected readonly lessonsRevealed = signal(false);
  protected readonly coursePreviewDetail = signal<CourseDetail | null>(null);
  protected readonly coursePreviewOpen = signal(false);
  protected readonly coursePreviewClosing = signal(false);
  protected readonly overviewUrl = signal<string | null>(null);
  protected readonly overviewOpen = signal(false);
  protected readonly overviewClosing = signal(false);
  protected readonly overviewPdfLoading = signal(true);
  protected readonly trailerOpen = signal(false);
  protected readonly trailerClosing = signal(false);
  protected readonly trailerCourse = signal<Course | null>(null);
  protected readonly trailerEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const url = trailerEmbedUrl(this.trailerCourse()?.trailer_link);
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
  protected readonly trailerVideoUrl = computed(() => {
    const url = this.trailerCourse()?.trailer_link?.trim();
    return url && !/vimeo\.com/i.test(url) ? url : null;
  });
  protected readonly languageMenuOpen = signal(false);
  protected readonly selectedLanguage = signal('en');
  private overviewLoadingTask?: PDFDocumentLoadingTask;
  private overviewPdf?: PDFDocumentProxy;
  private overviewRenderToken = 0;
  protected readonly carouselCourses = computed(() => {
    const featuredId = this.featured()?.id;
    return this.courses().filter(course => course.id !== featuredId);
  });
  protected readonly carouselShows = computed(() => {
    const featuredId = this.featured()?.id;
    return this.shows().filter(show => show.id !== featuredId);
  });
  protected readonly edges = signal<ScrollEdges>(EMPTY_EDGES);
  protected readonly platformEdges = signal<ScrollEdges>(EMPTY_EDGES);
  protected readonly showsEdges = signal<ScrollEdges>(EMPTY_EDGES);
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
    configured_levels: index % 3 === 0
      ? ['beginner', 'intermediate', 'advanced']
      : index % 2 === 0
        ? ['beginner', 'intermediate']
        : ['beginner'],
  }));

  protected courseLanguages(course: Course): Array<{ slug: string; label: string }> {
    const configured = Object.entries(course.languages ?? {}).map(([slug, language]) => ({ slug, label: language.label }));
    const defaults = [
      { slug: 'en', label: 'English' },
      { slug: 'es', label: 'Spanish' },
      { slug: 'ko', label: 'Korean' },
    ];
    const options = [...configured, ...defaults];
    return options.filter((language, index, all) => all.findIndex(item => item.slug === language.slug) === index);
  }

  protected selectedLanguageLabel(course: Course): string {
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
  }

  constructor() {
    if (this.pendingReturn) {
      this.returning.set(true);
      this.returnRect.set({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight });
      this.returnOverlay.set({ thumbnailUrl: this.pendingReturn.thumbnailUrl });
    }

    forkJoin({
      courses: this.coursesService.getCourses(),
      shows: this.coursesService.getShows().pipe(catchError(() => of([] as Course[]))),
    }).subscribe({
      next: ({ courses, shows }) => {
        this.shows.set([...shows, ...DEMO_SHOWS].slice(0, 12));
        const courseCandidates = courses.filter(course => !course.course_types.includes('Platform'));
        const showCandidates = shows;
        const available = [...courseCandidates, ...showCandidates];
        const queryFeaturedId = this.readQueryNumber('style2Featured');
        // A return transition or an explicit query parameter may pin the
        // hero, but normal refreshes must use the alternating type rotation.
        const savedFeaturedId = this.pendingReturn?.style2State?.featuredId ?? queryFeaturedId;
        const savedFeatured = available.find(course => course.id === savedFeaturedId);
        const previousKind = this.readSessionValue(STYLE2_FEATURED_KIND_STORAGE_KEY);
        const alternatingCandidates = previousKind === 'show'
          ? courseCandidates
          : previousKind === 'course'
            ? showCandidates
            : available;
        const featured = savedFeatured
          ?? alternatingCandidates[Math.floor(Math.random() * alternatingCandidates.length)]
          ?? available[0]
          ?? null;
        this.featured.set(featured);
        this.writeSessionValue(STYLE2_FEATURED_KIND_STORAGE_KEY, featured && showCandidates.some(show => show.id === featured.id) ? 'show' : 'course');
        this.selectedLanguage.set(this.courseLanguages(featured)[0]?.slug ?? 'en');
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
    const showsTrack = this.showsTrack()?.nativeElement;
    if (!track && !platformTrack && !showsTrack) return;
    track?.addEventListener('scroll', this.onScroll, { passive: true });
    platformTrack?.addEventListener('scroll', this.onPlatformScroll, { passive: true });
    showsTrack?.addEventListener('scroll', this.onShowsScroll, { passive: true });
    this.resizeObserver = new ResizeObserver(() => {
      this.measureEdges('trading');
      this.measureEdges('platform');
    });
    if (track) this.resizeObserver.observe(track);
    if (platformTrack) this.resizeObserver.observe(platformTrack);
    if (showsTrack) this.resizeObserver.observe(showsTrack);
    this.updateArtworkHeight('shows');
    this.updateArtworkHeight('trading');
    this.updateArtworkHeight('platform');
    this.measureEdges('shows');
    this.measureEdges();
    this.measureEdges('platform');
  }

  ngOnDestroy(): void {
    const track = this.track()?.nativeElement;
    const platformTrack = this.platformTrack()?.nativeElement;
    const showsTrack = this.showsTrack()?.nativeElement;
    track?.removeEventListener('scroll', this.onScroll);
    platformTrack?.removeEventListener('scroll', this.onPlatformScroll);
    showsTrack?.removeEventListener('scroll', this.onShowsScroll);
    this.resizeObserver?.disconnect();
    if (this.expandedCardCheck !== undefined) {
      clearTimeout(this.expandedCardCheck);
    }
    if (this.pageExitTimer !== undefined) {
      clearTimeout(this.pageExitTimer);
    }
    if (this.descriptionCloseTimer !== undefined) {
      clearTimeout(this.descriptionCloseTimer);
    }
    if (this.coursePreviewCloseTimer !== undefined) {
      clearTimeout(this.coursePreviewCloseTimer);
    }
    if (this.overviewCloseTimer !== undefined) {
      clearTimeout(this.overviewCloseTimer);
    }
    if (this.trailerCloseTimer !== undefined) {
      clearTimeout(this.trailerCloseTimer);
    }
    this.clearOverviewPdf();
    document.body.style.overflow = '';
  }

  protected scroll(direction: -1 | 1, kind: CarouselKind = 'trading'): void {
    const track = (kind === 'shows' ? this.showsTrack() : kind === 'platform' ? this.platformTrack() : this.track())?.nativeElement;
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
    if (this.isShow(course)) return 'Show';
    return course.course_types.includes('Platform') ? 'Platform Course' : 'Trading Course';
  }

  protected featuredLabel(course: Course): string {
    return this.isShow(course) ? 'Shows' : 'Featured Course';
  }

  protected isShow(course: Course): boolean {
    return course.course_types.includes('Shows') || this.shows().some(show => show.id === course.id);
  }

  protected courseLevelBadges(course: Course | CourseDetail): string[] {
    const labels: Record<CourseLevelSlug, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    const configured = course.configured_levels?.length
      ? course.configured_levels
      : course.course_types
        .map(type => type.toLowerCase())
        .filter((level): level is CourseLevelSlug => level in labels);
    return configured
      .filter((level): level is CourseLevelSlug => level in labels)
      .map(level => course.levels?.[level]?.label ?? labels[level]);
  }

  protected toggleDescription(): void {
    this.descriptionExpanded.update(open => !open);
    this.syncDescriptionMotion();
  }

  private syncDescriptionMotion(): void {
    const requested = this.descriptionExpanded();
    if (requested) {
      if (this.descriptionCloseTimer !== undefined) {
        clearTimeout(this.descriptionCloseTimer);
        this.descriptionCloseTimer = undefined;
      }
      if (this.descriptionMotion() === 'closed' || this.descriptionMotion() === 'closing') {
        this.descriptionMotion.set('opening');
        requestAnimationFrame(() => {
          if (this.descriptionExpanded()) {
            this.descriptionMotion.set('open');
          }
        });
      }
      return;
    }

    if (this.descriptionMotion() === 'closed' || this.descriptionMotion() === 'closing') return;
    this.descriptionMotion.set('closing');
    this.descriptionCloseTimer = setTimeout(() => {
      this.descriptionCloseTimer = undefined;
      if (!this.descriptionExpanded()) {
        this.descriptionMotion.set('closed');
      }
    }, 600);
  }

  protected startWatching(course: Course): void {
    this.router.navigate(['/courses', course.id]);
  }

  protected openTrailer(course: Course | null = this.featured(), event?: Event): void {
    event?.stopPropagation();
    if (!course?.trailer_link) return;
    if (this.trailerCloseTimer !== undefined) {
      clearTimeout(this.trailerCloseTimer);
      this.trailerCloseTimer = undefined;
    }
    this.trailerClosing.set(false);
    this.trailerCourse.set(course);
    document.body.style.overflow = 'hidden';
    this.trailerOpen.set(false);
    requestAnimationFrame(() => requestAnimationFrame(() => this.trailerOpen.set(true)));
  }

  protected closeTrailer(): void {
    if (!this.trailerOpen()) return;
    this.trailerClosing.set(true);
    this.trailerOpen.set(false);
    this.trailerCloseTimer = setTimeout(() => {
      this.trailerClosing.set(false);
      this.trailerCourse.set(null);
      this.trailerCloseTimer = undefined;
      document.body.style.overflow = '';
    }, 650);
  }

  protected openCourse(course: Course, event?: Event): void {
    const source = event?.currentTarget instanceof HTMLElement
      ? event.currentTarget.closest('.style-card') as HTMLElement | null
      : null;
    this.navigateToCourse(course, source?.getBoundingClientRect());
  }

  protected openCoursePreview(course: Course, event: Event): void {
    event.stopPropagation();
    if (this.coursePreviewCloseTimer !== undefined) {
      clearTimeout(this.coursePreviewCloseTimer);
      this.coursePreviewCloseTimer = undefined;
    }
    this.coursePreviewClosing.set(false);

    if (course.id < 0) {
      this.presentCoursePreview(this.syntheticCourseDetail(course));
      return;
    }

    this.coursesService.getCourse(course.id).subscribe({
      next: detail => this.presentCoursePreview(detail)
    });
  }

  private presentCoursePreview(detail: CourseDetail): void {
    this.coursePreviewDetail.set(detail);
    this.coursePreviewOpen.set(false);
    document.body.style.overflow = 'hidden';

    // Let the browser paint the mounted sheet in its closed position first.
    // Activating the open state in the next frame makes the transform animate
    // instead of appearing at its final position on insertion.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.coursePreviewDetail() === detail) {
        this.coursePreviewOpen.set(true);
      }
    }));
  }

  protected closeCoursePreview(): void {
    if (!this.coursePreviewDetail()) return;
    this.coursePreviewClosing.set(true);
    this.coursePreviewOpen.set(false);
    this.coursePreviewCloseTimer = setTimeout(() => {
      this.coursePreviewDetail.set(null);
      this.coursePreviewClosing.set(false);
      this.coursePreviewCloseTimer = undefined;
      document.body.style.overflow = '';
    }, 650);
  }

  protected openPreviewLesson(course: CourseDetail, lesson: Lesson, event: Event): void {
    event.stopPropagation();
    this.closeCoursePreview();
    this.router.navigate(['/courses', course.id, 'lessons', lesson.id]);
  }

  protected coursePreviewImageUrl(detail: CourseDetail): string {
    return detail.image
      ?? detail.thumbnail
      ?? `https://picsum.photos/seed/tcnexus-preview-${detail.id}/1200/675`;
  }

  protected courseTypeLabelForDetail(detail: CourseDetail): string {
    return detail.course_types.includes('Platform') ? 'Platform Course' : 'Trading Course';
  }

  private syntheticCourseDetail(course: Course): CourseDetail {
    const lessons: Lesson[] = Array.from({ length: 4 }, (_, index) => ({
      id: course.id * 100 - index,
      title: `${course.title} · Lesson ${index + 1}`,
      order: index + 1,
      tier: index === 0 ? 'free' : 'registered',
      course_id: course.id,
      thumbnail: this.thumbnailUrl(course, index),
      locked: false,
      excerpt: 'A guided platform lesson for this course.',
      video_url: null,
      tc_lens_message: '',
    }));

    return {
      id: course.id,
      title: course.title,
      content: course.excerpt,
      thumbnail: course.thumbnail,
      image: course.image,
      course_types: course.course_types,
      overview_link: course.overview_link,
      instructor: null,
      guest: null,
      lessons,
    };
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

  protected openOverview(_course: Course): void {
    const overviewUrl = COURSE_OVERVIEW_PDF_URL;
    this.overviewUrl.set(overviewUrl);
    this.overviewOpen.set(false);
    this.overviewClosing.set(false);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.overviewUrl() === overviewUrl) {
        this.overviewOpen.set(true);
        void this.renderOverviewPdf();
      }
    }));
  }

  protected closeOverview(): void {
    if (!this.overviewUrl()) return;
    this.overviewClosing.set(true);
    this.overviewOpen.set(false);
    this.overviewCloseTimer = setTimeout(() => {
      this.clearOverviewPdf();
      this.overviewUrl.set(null);
      this.overviewClosing.set(false);
      this.overviewCloseTimer = undefined;
      document.body.style.overflow = '';
    }, 650);
  }

  private async renderOverviewPdf(): Promise<void> {
    const viewer = this.overviewViewer()?.nativeElement;
    if (!viewer) return;

    const token = ++this.overviewRenderToken;
    this.overviewPdfLoading.set(true);
    viewer.replaceChildren();

    try {
      const { getDocument, GlobalWorkerOptions, TextLayer } = await import('pdfjs-dist');
      GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const loadingTask = getDocument({ url: COURSE_OVERVIEW_PDF_URL });
      this.overviewLoadingTask = loadingTask;
      const pdf = await loadingTask.promise;
      if (token !== this.overviewRenderToken) {
        await loadingTask.destroy();
        return;
      }
      this.overviewPdf = pdf;

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        if (token !== this.overviewRenderToken) return;
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const innerWidth = Math.max(320, (viewer.clientWidth || 900) - 28);
        const scale = Math.min(1.45, Math.max(0.75, innerWidth / baseViewport.width));
        const viewport = page.getViewport({ scale });
        const deviceScale = Math.min(window.devicePixelRatio || 1, 2);

        const pageElement = document.createElement('article');
        pageElement.className = 'style-overview-pdf-page';
        pageElement.style.width = `${viewport.width}px`;
        pageElement.style.height = `${viewport.height}px`;
        pageElement.setAttribute('aria-label', `Course overview page ${pageNumber}`);

        const canvas = document.createElement('canvas');
        canvas.className = 'style-overview-pdf-canvas';
        canvas.width = Math.ceil(viewport.width * deviceScale);
        canvas.height = Math.ceil(viewport.height * deviceScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const context = canvas.getContext('2d');
        if (!context) continue;
        pageElement.append(canvas);

        const textLayerElement = document.createElement('div');
        textLayerElement.className = 'style-overview-pdf-text-layer textLayer';
        textLayerElement.style.setProperty('--total-scale-factor', String(scale));
        pageElement.append(textLayerElement);

        const linkLayerElement = document.createElement('div');
        linkLayerElement.className = 'style-overview-pdf-link-layer annotationLayer';
        pageElement.append(linkLayerElement);
        viewer.append(pageElement);

        await page.render({
          canvasContext: context,
          canvas,
          viewport,
          transform: [deviceScale, 0, 0, deviceScale, 0, 0],
        }).promise;

        const textContent = await page.getTextContent();
        const textLayer = new TextLayer({
          textContentSource: textContent,
          container: textLayerElement,
          viewport,
        });
        await textLayer.render();

        const annotations = await page.getAnnotations({ intent: 'display' });
        for (const annotation of annotations) {
          const url = annotation.url ?? annotation.unsafeUrl;
          if (!url || !annotation.rect) continue;
          const [x1, y1] = viewport.convertToViewportPoint(annotation.rect[0], annotation.rect[1]);
          const [x2, y2] = viewport.convertToViewportPoint(annotation.rect[2], annotation.rect[3]);
          const link = document.createElement('a');
          link.className = 'style-overview-pdf-link';
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.setAttribute('aria-label', 'Open linked resource');
          link.style.left = `${Math.min(x1, x2)}px`;
          link.style.top = `${Math.min(y1, y2)}px`;
          link.style.width = `${Math.abs(x2 - x1)}px`;
          link.style.height = `${Math.abs(y2 - y1)}px`;
          linkLayerElement.append(link);
        }
      }
      this.overviewPdfLoading.set(false);
    } catch (error) {
      console.error('Unable to render course overview PDF', error);
      this.overviewPdfLoading.set(false);
    }
  }

  private clearOverviewPdf(): void {
    this.overviewRenderToken += 1;
    void this.overviewLoadingTask?.destroy();
    this.overviewLoadingTask = undefined;
    void this.overviewPdf?.cleanup();
    this.overviewPdf = undefined;
    this.overviewViewer()?.nativeElement.replaceChildren();
    this.overviewPdfLoading.set(true);
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

  private readSessionValue(key: string): string | undefined {
    try {
      return sessionStorage.getItem(key) ?? undefined;
    } catch {
      return undefined;
    }
  }

  private writeSessionValue(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Session storage can be unavailable in privacy-restricted browsers.
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
    if (this.trailerOpen()) {
      this.closeTrailer();
      return;
    }
    if (this.overviewUrl()) {
      this.closeOverview();
      return;
    }
    if (this.coursePreviewDetail()) {
      this.closeCoursePreview();
      return;
    }
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
    return person.photo || profilePlaceholderUrl(person.id);
  }

  /** Legacy Style 2 is no longer routed, but it must still compile with the
   * shared model that now permits multiple instructors and guests. */
  protected firstPerson(value: Person | Person[]): Person {
    return Array.isArray(value) ? value[0] : value;
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
    const viewport = (kind === 'shows' ? this.showsTrack() : kind === 'platform' ? this.platformTrack() : this.track())?.nativeElement.getBoundingClientRect();
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
    const track = (kind === 'shows' ? this.showsTrack() : kind === 'platform' ? this.platformTrack() : this.track())?.nativeElement;
    if (!track) return;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const edges = {
      atStart: track.scrollLeft <= 1,
      atEnd: maxScroll <= 1 || track.scrollLeft >= maxScroll - 1,
    };
    (kind === 'shows' ? this.showsEdges : kind === 'platform' ? this.platformEdges : this.edges).set(edges);
    this.updateArtworkHeight(kind);
  }

  private updateArtworkHeight(kind: CarouselKind = 'trading'): void {
    const carousel = (kind === 'shows' ? this.showsCarousel() : kind === 'platform' ? this.platformCarousel() : this.carousel())?.nativeElement;
    const track = (kind === 'shows' ? this.showsTrack() : kind === 'platform' ? this.platformTrack() : this.track())?.nativeElement;
    const art = track?.querySelector<HTMLElement>('.style-card__art');
    if (carousel && art) {
      // Use layout height rather than the transformed visual bounds. The
      // first card scales from its left edge, and measuring its bounding box
      // while hovered would make the navigation column grow with the card.
      carousel.style.setProperty('--art-height', `${art.offsetHeight}px`);
    }
  }
}

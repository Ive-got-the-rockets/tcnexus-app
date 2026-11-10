import { Component, inject, signal, computed, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CoursesService } from '../../core/courses.service';
import { CourseDetail, Lesson } from '../../core/models';
import { trailerEmbedUrl } from '../layout-style-3/trailer-embed-url';
import { CourseOverview } from '../../core/course-overview';

@Component({ selector: 'app-mobile-course-detail', imports: [RouterLink, CourseOverview], templateUrl: './mobile-course-detail.html', styleUrl: './mobile-course-detail.scss' })
export class MobileCourseDetailPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private readonly courses = inject(CoursesService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly overviewDialog = viewChild(CourseOverview);
  protected readonly course = signal<CourseDetail | null>(null);
  protected readonly levelOpen = signal(false);
  protected readonly levelButtonOpen = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly languageOpen = signal(false);
  protected readonly trailerOpen = signal(false);
  protected readonly selectedLevel = signal('beginner');
  protected readonly selectedLevelLabel = computed(() =>
    this.levels().find(level => level.slug === this.selectedLevel())?.label ?? 'Beginner'
  );
  protected readonly lessons = computed(() => {
    const c = this.course(); const level = c?.levels?.[this.selectedLevel() as 'beginner'];
    return level?.lessons ?? c?.lessons ?? [];
  });
  protected readonly levels = computed(() => Object.entries(this.course()?.levels ?? {})
    .filter(([, level]) => level?.enabled)
    .map(([slug, level]) => ({ ...level, slug })));
  protected readonly trailerEmbed = computed<SafeResourceUrl | null>(() => {
    const url = trailerEmbedUrl(this.course()?.trailer_link);
    return url && /vimeo\.com/i.test(url) ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
  protected readonly trailerVideo = computed(() => {
    const url = this.course()?.trailer_link?.trim();
    return url && !/vimeo\.com/i.test(url) ? url : null;
  });
  constructor() {
    this.courses.getCourse(Number(this.route.snapshot.paramMap.get('id'))).subscribe(c => {
      this.course.set(c);
      this.selectedLevel.set(this.levels()[0]?.slug ?? 'beginner');
    });
  }
  protected hero(c: CourseDetail) {
    const primaryMobileHero = Object.values(c.levels ?? {})
      .find(level => level?.enabled)?.mobile_landing_background;
    return c.mobile_landing_background ?? primaryMobileHero ?? c.image ?? c.thumbnail ?? '';
  }
  protected description(value: string) { return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
  protected lessonThumbnail(lesson: Lesson, course: CourseDetail) { return lesson.thumbnail ?? course.thumbnail ?? course.image ?? ''; }
  protected chooseLevel(slug: string) {
    this.selectedLevel.set(slug);
    this.levelOpen.set(false);
    this.levelButtonOpen.set(false);
  }
  protected play() { const lesson = this.lessons()[0]; const c = this.course(); if (lesson && c) this.router.navigate(['/courses', c.id, 'lessons', lesson.id]); }
  protected trailer() { if (this.course()?.trailer_link) this.trailerOpen.set(true); }
  protected closeTrailer() { this.trailerOpen.set(false); }
  protected overview() { this.overviewDialog()?.show(this.course()?.overview_link); }
}

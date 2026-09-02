import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';

import { Course } from '../../core/models';
import { CoursesService } from '../../core/courses.service';
import { RowScrollDirective, ScrollEdges } from '../catalog/row-scroll.directive';

const EMPTY_EDGES: ScrollEdges = { atStart: true, atEnd: true };

@Component({
  selector: 'app-animation-style-2',
  imports: [RowScrollDirective],
  templateUrl: './animation-style-2.html',
  styleUrl: './animation-style-2.scss'
})
export class AnimationStyle2Page implements AfterViewInit, OnDestroy {
  private readonly coursesService = inject(CoursesService);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private readonly carousel = viewChild<ElementRef<HTMLElement>>('carousel');
  private resizeObserver?: ResizeObserver;
  private readonly onScroll = () => this.measureEdges();

  protected readonly courses = signal<Course[]>([]);
  protected readonly edges = signal<ScrollEdges>(EMPTY_EDGES);

  constructor() {
    this.coursesService.getCourses().subscribe({
      next: courses => this.courses.set(courses.slice(0, 12)),
    });
  }

  ngAfterViewInit(): void {
    const track = this.track()?.nativeElement;
    if (!track) return;
    track.addEventListener('scroll', this.onScroll, { passive: true });
    this.resizeObserver = new ResizeObserver(() => this.measureEdges());
    this.resizeObserver.observe(track);
    this.updateArtworkHeight();
    this.measureEdges();
  }

  ngOnDestroy(): void {
    const track = this.track()?.nativeElement;
    track?.removeEventListener('scroll', this.onScroll);
    this.resizeObserver?.disconnect();
  }

  protected scroll(direction: -1 | 1): void {
    const track = this.track()?.nativeElement;
    if (!track) return;
    // Move one viewport plus the 40px boundary correction. This keeps the
    // previous slide's small peek under the normal-width navigation zone and
    // intentionally leaves the remaining space on the far side empty.
    track.scrollBy({ left: direction * (track.clientWidth - 5), behavior: 'smooth' });
  }

  protected thumbnailUrl(course: Course, index: number): string {
    return course.thumbnail
      ?? course.image
      ?? `https://picsum.photos/seed/tcnexus-showcase-${String(index + 1).padStart(2, '0')}/640/360`;
  }

  protected onImageError(event: Event): void {
    (event.currentTarget as HTMLImageElement).style.display = 'none';
  }

  protected onCardEnter(event: MouseEvent): void {
    const card = event.currentTarget as HTMLElement;
    const viewport = this.track()?.nativeElement.getBoundingClientRect();
    if (!viewport) return;
    card.classList.toggle('style-card--edge-left', card.getBoundingClientRect().left <= viewport.left + 64);
    card.classList.toggle('style-card--edge-right', card.getBoundingClientRect().right >= viewport.right - 64);
  }

  protected onCardLeave(): void {
    // Keep the edge origin on the card through its scale-down transition.
    // Removing it here makes the card jump back to center before it shrinks.
  }

  private measureEdges(): void {
    const track = this.track()?.nativeElement;
    if (!track) return;
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    this.edges.set({
      atStart: track.scrollLeft <= 1,
      atEnd: maxScroll <= 1 || track.scrollLeft >= maxScroll - 1,
    });
    this.updateArtworkHeight();
  }

  private updateArtworkHeight(): void {
    const carousel = this.carousel()?.nativeElement;
    const art = this.track()?.nativeElement.querySelector<HTMLElement>('.style-card__art');
    if (carousel && art) {
      carousel.style.setProperty('--art-height', `${art.getBoundingClientRect().height}px`);
    }
  }
}

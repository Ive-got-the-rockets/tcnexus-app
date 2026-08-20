import { AfterViewInit, Directive, ElementRef, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';

import { CatalogScrollService } from '../../core/catalog-scroll.service';

export interface ScrollEdges {
  atStart: boolean;
  atEnd: boolean;
}

@Directive({
  selector: '[appRowScroll]'
})
export class RowScrollDirective implements AfterViewInit, OnDestroy {
  @Input({ required: true }) appRowScroll!: string;
  @Output() edgesChange = new EventEmitter<ScrollEdges>();

  private readonly catalogScroll = inject(CatalogScrollService);
  private resizeObserver?: ResizeObserver;
  private readonly onScroll = () => this.measure();

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const track = this.el.nativeElement;

    // Restore before the first measure() so the reported start/end state
    // reflects where the row actually resumes, not its reset-to-0 default.
    const saved = this.catalogScroll.get(this.appRowScroll);
    if (saved !== undefined) {
      track.scrollLeft = saved;
    }

    track.addEventListener('scroll', this.onScroll, { passive: true });
    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(track);
    this.measure();
  }

  ngOnDestroy(): void {
    this.catalogScroll.save(this.appRowScroll, this.el.nativeElement.scrollLeft);
    this.el.nativeElement.removeEventListener('scroll', this.onScroll);
    this.resizeObserver?.disconnect();
  }

  private measure(): void {
    const track = this.el.nativeElement;
    const maxScroll = track.scrollWidth - track.clientWidth;
    this.edgesChange.emit({
      atStart: track.scrollLeft <= 1,
      atEnd: maxScroll <= 1 || track.scrollLeft >= maxScroll - 1
    });
  }
}

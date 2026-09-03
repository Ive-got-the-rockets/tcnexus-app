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
  private mutationObserver?: MutationObserver;
  private savedPosition?: number;
  private readonly onScroll = () => this.measure();

  constructor(private readonly el: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const track = this.el.nativeElement;

    // Restore before the first measure() so the reported start/end state
    // reflects where the row actually resumes, not its reset-to-0 default.
    this.savedPosition = this.catalogScroll.get(this.appRowScroll);
    this.restoreSavedPosition();

    track.addEventListener('scroll', this.onScroll, { passive: true });
    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(track);
    // The track exists before async course data is rendered. Watch for the
    // cards to be inserted so a saved second-slide position is not lost when
    // the initial restore runs against an empty track.
    this.mutationObserver = new MutationObserver(() => this.restoreSavedPosition());
    this.mutationObserver.observe(track, { childList: true, subtree: true });
    this.measure();
  }

  ngOnDestroy(): void {
    this.catalogScroll.save(this.appRowScroll, this.el.nativeElement.scrollLeft);
    this.el.nativeElement.removeEventListener('scroll', this.onScroll);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
  }

  private restoreSavedPosition(): void {
    const track = this.el.nativeElement;
    if (this.savedPosition === undefined) return;

    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    if (maxScroll <= 0) return;

    track.scrollLeft = Math.min(this.savedPosition, maxScroll);
    this.savedPosition = undefined;
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

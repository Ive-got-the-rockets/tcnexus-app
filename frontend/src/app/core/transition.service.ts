import { Injectable } from '@angular/core';

export interface MorphRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface MorphHandoff {
  rect: MorphRect;
  thumbnailUrl: string;
  /** Which row the click came from — a course can appear in more than one row, and they scroll independently. */
  rowTitle: string;
  source?: 'catalog' | 'style-2';
  style2State?: {
    scrollLeft: number;
    featuredId: number;
  };
}

export interface ReturnHandoff {
  courseId: number;
  rowTitle: string;
  thumbnailUrl: string;
  style2State?: MorphHandoff['style2State'];
}

/**
 * Carries the clicked card's bounding rect + image across a route
 * navigation so the destination page can grow it into place instead of
 * just cutting to the new screen. Staged right before navigate(), consumed
 * once by the destination component so a later refresh/back-nav doesn't
 * replay it.
 *
 * The return trip (course detail -> catalog) is the mirror of this, but it
 * can't carry a target rect the same way — the catalog hasn't rendered its
 * (scroll-restored) cards yet at the moment we navigate away, so there's
 * nothing to measure yet. It stages just the course id + row + image; the
 * catalog finds and measures the real card itself once it's actually on
 * screen (in that same row specifically, since the same course can appear
 * in multiple rows sitting at different scroll positions).
 */
@Injectable({ providedIn: 'root' })
export class TransitionService {
  private pending: MorphHandoff | null = null;
  private pendingReturn: ReturnHandoff | null = null;

  stage(
    rect: MorphRect,
    thumbnailUrl: string,
    rowTitle: string,
    source: MorphHandoff['source'] = 'catalog',
    style2State?: MorphHandoff['style2State']
  ): void {
    this.pending = { rect, thumbnailUrl, rowTitle, source, style2State };
  }

  consume(): MorphHandoff | null {
    const value = this.pending;
    this.pending = null;
    return value;
  }

  stageReturn(courseId: number, rowTitle: string, thumbnailUrl: string, style2State?: MorphHandoff['style2State']): void {
    this.pendingReturn = { courseId, rowTitle, thumbnailUrl, style2State };
  }

  consumeReturn(): ReturnHandoff | null {
    const value = this.pendingReturn;
    this.pendingReturn = null;
    return value;
  }
}

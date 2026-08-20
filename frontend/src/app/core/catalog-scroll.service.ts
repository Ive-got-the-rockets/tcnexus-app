import { Injectable } from '@angular/core';

/**
 * Remembers each row's horizontal scroll position across a navigation away
 * from and back to the catalog. Angular's router scroll restoration only
 * covers the window's own scroll position — it has no idea these rows are
 * independently scrollable, so without this, going "back" would restore the
 * page scroll correctly but every row would still reset to its start,
 * putting whatever card you'd scrolled to out of view.
 */
@Injectable({ providedIn: 'root' })
export class CatalogScrollService {
  private readonly positions = new Map<string, number>();

  save(rowTitle: string, scrollLeft: number): void {
    this.positions.set(rowTitle, scrollLeft);
  }

  get(rowTitle: string): number | undefined {
    return this.positions.get(rowTitle);
  }
}

import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'tcnexus_my_list';

function readStoredIds(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

@Injectable({ providedIn: 'root' })
export class MyListService {
  private readonly ids = signal<ReadonlySet<number>>(readStoredIds());
  readonly courseIds = this.ids.asReadonly();

  has(courseId: number): boolean {
    return this.ids().has(courseId);
  }

  toggle(courseId: number): void {
    const next = new Set(this.ids());
    if (next.has(courseId)) {
      next.delete(courseId);
    } else {
      next.add(courseId);
    }
    this.ids.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }
}

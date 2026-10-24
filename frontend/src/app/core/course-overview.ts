import { courseOverviewUrl } from './course-overview-url';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
@Component({
 selector: 'app-course-overview',
 template: `<dialog #dialog aria-label="Course overview" (click)="backdrop($event)" (close)="closed()">
 <div class="overview-controls">
   <a [href]="sourceUrl()" target="_blank" rel="noopener noreferrer" aria-label="Open overview in a new tab" title="Open overview in a new tab"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6M21 3l-9 9M15 3h6v6" /></svg></a>
   <button type="button" autofocus aria-label="Close course overview" title="Close course overview" (click)="close()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
 </div>
 @if (loaded()) { <iframe [src]="embedUrl()" allow="fullscreen" allowfullscreen title="Course overview presentation"></iframe> }
 </dialog>`,
 styles: `
 dialog {width:min(1400px,calc(100vw - 32px));max-width:none;max-height:calc(100dvh - 32px);padding:0;border:1px solid #ffffff30;border-radius:12px;background:#141414;color:#fff;box-sizing:border-box;overflow:hidden}
 dialog::backdrop {background:#000b}
 .overview-controls {position:absolute;top:8px;right:18px;z-index:1;display:flex;align-items:center;gap:6px;padding:4px;border-radius:6px;background:transparent}
 button,a {display:grid;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--button-radius,4.8px);background:transparent;color:var(--paper,#f4f1e9);cursor:pointer;transition:background .2s ease,color .2s ease}
 button:hover,a:hover,button:focus-visible,a:focus-visible {background:#fff;color:#33373d}
 button:focus-visible,a:focus-visible {outline:2px solid #fff;outline-offset:2px}
 button:active,a:active {background:#e5e5e5;color:#33373d}
 svg {width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
 iframe {display:block;width:100%;height:min(70dvh,720px);border:0;background:#fff}
 @media(max-width:600px){iframe{height:65dvh}}
 `
})
export class CourseOverview implements OnDestroy {
 private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
 protected readonly loaded = signal(false);
 private readonly sanitizer = inject(DomSanitizer);
 protected readonly embedUrl = signal<SafeResourceUrl | null>(null);
 protected readonly sourceUrl = signal('');
 private previousOverflow: string | undefined;
 show(link: string | null | undefined): void {
  const embedUrl = courseOverviewUrl(link);
  if (!embedUrl) return;
  this.sourceUrl.set(link!);
  this.embedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
  if (this.dialog().nativeElement.open) return;
  this.previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  this.loaded.set(true);
  this.dialog().nativeElement.showModal();
 }
 close(): void { this.dialog().nativeElement.close(); }
 protected backdrop(event: MouseEvent): void {
  if(event.target !== this.dialog().nativeElement) return;
  const r = this.dialog().nativeElement.getBoundingClientRect();
  if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) this.close();
 }
 protected closed(): void {
  this.loaded.set(false);
  if(this.previousOverflow !== undefined) { document.body.style.overflow = this.previousOverflow; this.previousOverflow = undefined; }
 }
 ngOnDestroy(): void { this.closed(); }
}

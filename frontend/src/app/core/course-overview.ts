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
 @if (loaded()) { <div class="overview-viewport"><iframe [src]="embedUrl()" allow="fullscreen" allowfullscreen title="Course overview presentation"></iframe></div>
   <div class="overview-scroll-cue" role="img" aria-label="Scroll down to explore the presentation">
     <span class="overview-scroll-mouse"><span class="overview-scroll-wheel"></span></span>
     <span class="overview-scroll-chevron"></span>
   </div>
 }
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
 .overview-viewport {width:100%;overflow:hidden}
 /* Extend the right edge beyond the viewport to clip the embedded scrollbar. */
 iframe {display:block;width:calc(100% + 16px);max-width:none;height:min(70dvh,720px);border:0;background:#fff}
 .overview-scroll-cue {position:absolute;left:50%;bottom:20px;transform:translateX(-50%);z-index:1;display:flex;flex-direction:column;align-items:center;color:var(--paper,#f4f1e9);pointer-events:none;filter:drop-shadow(0 1px 3px #0009);animation:overview-cue-fade .6s ease-out 5s forwards}
 .overview-scroll-mouse {position:relative;display:block;width:25px;height:39px;border:1.5px solid currentColor;border-radius:14px;box-sizing:content-box}
 .overview-scroll-wheel {position:absolute;left:10px;top:7px;width:3px;height:7px;background:currentColor;border-radius:3px;animation:overview-wheel-drop 2.25s cubic-bezier(.77,0,.175,1) infinite}
 .overview-scroll-chevron {display:block;width:8px;height:8px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;margin-top:7px;transform:rotate(45deg);animation:overview-chevron-down 2.25s cubic-bezier(.77,0,.175,1) infinite}
 @keyframes overview-cue-fade {to{opacity:0;visibility:hidden}}
 @keyframes overview-wheel-drop {0%,15%{transform:translateY(0);opacity:0}25%{opacity:1}65%,100%{transform:translateY(12px);opacity:0}}
 @keyframes overview-chevron-down {0%,10%{transform:translateY(0) rotate(45deg);opacity:.2}45%{opacity:1}75%,100%{transform:translateY(6px) rotate(45deg);opacity:0}}
 @media(prefers-reduced-motion:reduce){.overview-scroll-wheel,.overview-scroll-chevron{animation:none;opacity:1}}
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

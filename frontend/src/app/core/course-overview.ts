import { courseOverviewUrl } from './course-overview-url';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
@Component({
 selector: 'app-course-overview',
 template: `<dialog #dialog aria-label="Course overview" (click)="backdrop($event)" (close)="closed()">
 <header><span>Course Overview</span><button type="button" autofocus aria-label="Close course overview" (click)="close()">&#215;</button></header>
 @if (loaded()) { <iframe [src]="embedUrl()" allow="fullscreen" allowfullscreen title="Course overview presentation"></iframe> }
 <footer><a [href]="sourceUrl()" target="_blank" rel="noopener noreferrer">Open overview in a new tab</a></footer></dialog>`,
 styles: `dialog {width:min(1400px,calc(100vw - 32px));max-width:none;max-height:calc(100dvh - 32px);padding:0;border:1px solid #ffffff30;border-radius:12px;background:#141414;color:#fff;box-sizing:border-box} dialog::backdrop {background:#000b} header,footer {display:flex;align-items:center;justify-content:space-between;padding:12px 18px;font-family:var(--font-ui,sans-serif)} button {width:44px;height:44px;border:0;background:transparent;color:inherit;font-size:30px;cursor:pointer} button:hover {background:#ffffff15} button:focus-visible,a:focus-visible {outline:2px solid #fff;outline-offset:2px} iframe {display:block;width:100%;height:min(70dvh,720px);border:0;background:#fff} a {color:inherit;font-size:13px} @media(max-width:600px){iframe{height:65dvh} header,footer{padding:8px 12px}}`
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

import { Component, HostListener, signal } from '@angular/core';
import { LayoutStyle3Page } from '../layout-style-3/layout-style-3';
import { MobileLayout1Page } from '../mobile-layout-1/mobile-layout-1';

const MOBILE_BREAKPOINT = 700;

@Component({
  selector: 'app-responsive-landing',
  imports: [LayoutStyle3Page, MobileLayout1Page],
  template: `@if (mobile()) { <app-mobile-layout-1 /> } @else { <app-layout-style-3 /> }`,
})
export class ResponsiveLandingPage {
  protected readonly mobile = signal(window.innerWidth <= MOBILE_BREAKPOINT);

  @HostListener('window:resize')
  protected updateLayout(): void { this.mobile.set(window.innerWidth <= MOBILE_BREAKPOINT); }
}

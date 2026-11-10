import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LayoutStyle3Page } from '../layout-style-3/layout-style-3';

@Component({
  selector: 'app-mobile-layout-1',
  imports: [RouterLink, LayoutStyle3Page],
  templateUrl: './mobile-layout-1.html',
  styleUrl: './mobile-layout-1.scss'
})
export class MobileLayout1Page {
  protected readonly menuOpen = signal(false);
  protected readonly mobileFeaturedImageOverrides: Readonly<Record<string, string>> = {
    'From Market 0 to top gun': '/mobile-layout-1/from-market-0-to-top-gun-mobile-hero-langing.jpg'
  };
  protected readonly mobileFeaturedTitleImageOverrides: Readonly<Record<string, string>> = {
    'From Market 0 to top gun': '/mobile-layout-1/from-market-0-to-top-gun-mobile-tittle.png'
  };

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}

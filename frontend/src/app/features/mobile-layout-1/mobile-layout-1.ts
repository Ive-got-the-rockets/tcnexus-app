import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { LayoutStyle3Page } from '../layout-style-3/layout-style-3';

@Component({
  selector: 'app-mobile-layout-1',
  imports: [RouterLink, LayoutStyle3Page],
  templateUrl: './mobile-layout-1.html',
  styleUrl: './mobile-layout-1.scss'
})
export class MobileLayout1Page {
  private readonly route = inject(ActivatedRoute);
  protected readonly menuOpen = signal(false);
  protected readonly landingMode = this.route.snapshot.data['landingMode'] ?? 'home';
  protected readonly mobileFeaturedImageOverrides: Readonly<Record<string, string>> = {
    'From Market 0 to top gun': '/mobile-layout-1/from-market-0-to-top-gun-mobile-hero-langing.jpg'
  };
  protected readonly mobileFeaturedTitleImageOverrides: Readonly<Record<string, string>> = {
    'From Market 0 to top gun': '/mobile-layout-1/from-market-0-to-top-gun-mobile-tittle.png'
  };

  protected toggleMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}

import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthModalService } from './core/auth-modal.service';
import { AccessService } from './core/access.service';
import { VisitorService } from './core/visitor.service';
import { RegisterModal } from './features/auth/register-modal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RegisterModal],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly authModal = inject(AuthModalService);
  protected readonly visitor = inject(VisitorService);
  private readonly accessService = inject(AccessService);

  protected readonly year = new Date().getFullYear();
  protected readonly headerHidden = signal(false);
  /** The lesson player opts out of the site chrome entirely via route data. */
  protected readonly chromeHidden = signal(false);

  private lastScrollY = 0;

  private readonly onScroll = (): void => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > this.lastScrollY && currentScrollY > 90) {
      this.headerHidden.set(true);
    } else if (currentScrollY < this.lastScrollY) {
      this.headerHidden.set(false);
    }

    this.lastScrollY = currentScrollY;
  };

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      // A route change should always bring the chrome back into view. Without
      // this reset, navigating after scrolling leaves the header hidden and
      // makes its active neon cue appear to have disappeared.
      this.headerHidden.set(false);
      this.lastScrollY = window.scrollY;
      let deepest = this.route;
      while (deepest.firstChild) {
        deepest = deepest.firstChild;
      }
      this.chromeHidden.set(!!deepest.snapshot.data['hideChrome']);
    });
  }

  protected activeNav(): 'home' | 'trading' | 'platform' | 'shows' {
    const url = this.router.url.split('?')[0].split('#')[0];

    if (url === '/trading-courses') return 'trading';
    if (url === '/platform-courses') return 'platform';
    if (url === '/shows') return 'shows';

    // Single content pages, the profile page, and the home variants all keep
    // the Home cue visible because they do not belong to another header tab.
    return 'home';
  }

  protected openCreateProfile(): void {
    this.authModal.open('register');
  }

  protected openLogin(): void {
    this.authModal.open('login');
  }

  protected editProfile(): void {
    this.router.navigate(['/profile']);
  }

  protected logout(): void {
    this.visitor.logout();
    if (this.router.url.startsWith('/profile')) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    const params = new URLSearchParams(window.location.search);
    if (params.get('tcnexus_reset') === '1') {
      this.visitor.resetTestSession();
      params.delete('tcnexus_reset');
      const cleanQuery = params.toString();
      window.history.replaceState({}, document.title, `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${window.location.hash}`);
    }
    if (this.visitor.isRegistered()) {
      this.accessService.validateSession().subscribe();
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
  }
}

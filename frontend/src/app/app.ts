import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthModalService } from './core/auth-modal.service';
import { VisitorService } from './core/visitor.service';
import { RegisterModal } from './features/auth/register-modal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RegisterModal],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly authModal = inject(AuthModalService);
  protected readonly visitor = inject(VisitorService);

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
      let deepest = this.route;
      while (deepest.firstChild) {
        deepest = deepest.firstChild;
      }
      this.chromeHidden.set(!!deepest.snapshot.data['hideChrome']);
    });
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
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
  }
}

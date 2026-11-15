import { Component, OnDestroy, OnInit, inject, isDevMode, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthModalService } from './core/auth-modal.service';
import { AccessService } from './core/access.service';
import { VisitorService } from './core/visitor.service';
import { CoursesService } from './core/courses.service';
import { Course } from './core/models';
import { profilePlaceholderUrl } from './core/profile-placeholders';
import { RegisterModal } from './features/auth/register-modal';

interface CalendarIconOption { key: string; label: string; svg: string; }

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
  private readonly coursesService = inject(CoursesService);

  protected readonly year = new Date().getFullYear();
  protected readonly headerHidden = signal(false);
  /** The lesson player opts out of the site chrome entirely via route data. */
  protected readonly chromeHidden = signal(false);
  protected readonly coverLayout = signal(false);
  protected readonly calendarMenuOpen = signal(false);
  protected readonly calendarView = signal<'month' | 'week'>('month');
  protected readonly calendarAnchor = signal(new Date());
  protected readonly liveShows = signal<Course[]>([]);
  protected readonly selectedCalendarEvent = signal<Course | null>(null);
  protected readonly selectedCalendarIcon = signal('play');
  protected readonly calendarIcons: readonly CalendarIconOption[] = [
    { key: 'play', label: 'Calendar play', svg: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16M10 13l4 2.5-4 2.5z"/>' },
    { key: 'outline', label: 'Minimal outline', svg: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/>' },
    { key: 'filled', label: 'Filled date', svg: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 9.5h16"/><path fill="currentColor" stroke="none" d="M8 13h2v2H8zM12 13h2v2h-2zM16 13h1v2h-1z"/>' },
    { key: 'rounded', label: 'Rounded calendar', svg: '<rect x="3.5" y="5" width="17" height="15" rx="4"/><path d="M8 3v4M16 3v4M3.5 9.5h17"/>' },
    { key: 'plus', label: 'Calendar plus', svg: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16M12 13v5M9.5 15.5h5"/>' },
    { key: 'check', label: 'Calendar check', svg: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16l-7 6-2-2"/>' },
    { key: 'flap', label: 'Split flap date', svg: '<path d="M5 4h14v16H5zM5 10h14M12 4v6"/><path d="M8 14h2M14 14h2M8 17h2"/>' },
    { key: 'rings', label: 'Ring bound', svg: '<rect x="4" y="5.5" width="16" height="14" rx="1"/><path d="M8 3v5M12 3v5M16 3v5M4 10h16"/>' },
    { key: 'tabs', label: 'Tabbed calendar', svg: '<path d="M4 7h16v13H4zM7 4v5M17 4v5M4 11h16"/><path d="M7 4h3M14 4h3"/>' },
    { key: 'compact', label: 'Compact glyph', svg: '<path d="M6 4h12v16H6zM6 9h12M9 2v5M15 2v5"/><path d="M9 13h6M9 16h4"/>' },
    { key: 'signal', label: 'Signal dot', svg: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/><circle cx="12" cy="15" r="2" fill="currentColor" stroke="none"/>' },
  ];

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
      this.coverLayout.set(this.router.url.split(/[?#]/)[0] === '/layout-style-4');
    });
  }

  protected activeNav(): 'home' | 'trading' | 'platform' | 'shows' | 'live' {
    const url = this.router.url.split('?')[0].split('#')[0];

    if (url === '/trading-courses') return 'trading';
    if (url === '/platform-courses') return 'platform';
    if (url === '/shows') return 'shows';
    if (url === '/live' || url.startsWith('/live/')) return 'live';

    // Single content pages, the profile page, and the home variants all keep
    // the Home cue visible because they do not belong to another header tab.
    return 'home';
  }

  protected toggleCalendarMenu(): void { this.calendarMenuOpen.update(open => !open); }
  protected closeCalendarMenu(): void { this.calendarMenuOpen.set(false); this.selectedCalendarEvent.set(null); }
  protected openCalendarEvent(show: Course): void { this.selectedCalendarEvent.set(show); }
  protected closeCalendarEvent(): void { this.selectedCalendarEvent.set(null); }
  protected calendarEventHost(show: Course): string { return show.hosts?.[0]?.name || 'TC Nexus'; }
  protected calendarEventHostPhoto(show: Course): string { return show.hosts?.[0]?.photo || profilePlaceholderUrl(show.hosts?.[0]?.id || 0); }
  protected calendarEventDuration(show: Course): string { const minutes = Number(show.live_duration || 0); if (!minutes) return 'Approximate duration unavailable'; return minutes >= 60 ? `${Math.floor(minutes / 60)}${minutes % 60 ? ` hr ${minutes % 60} min` : ' hr'}` : `${minutes} min`; }
  protected profilePlaceholderUrl(id: number): string { return profilePlaceholderUrl(id); }
  protected setCalendarView(view: 'month' | 'week'): void { this.calendarView.set(view); }
  protected shiftCalendar(offset: number): void { this.calendarAnchor.update(date => new Date(date.getFullYear(), date.getMonth() + offset, 1)); }
  protected goToToday(): void { this.calendarAnchor.set(new Date()); }
  protected todayNumber(): number { return new Date().getDate(); }
  protected calendarMonthLabel(): string { return this.calendarAnchor().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase(); }
  protected calendarDays(): Date[] { const anchor = this.calendarAnchor(); const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1); const start = new Date(first); start.setDate(first.getDate() - first.getDay()); return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)); }
  protected weekDays(): Date[] { const anchor = this.calendarAnchor(); const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()); start.setDate(start.getDate() - start.getDay()); return Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)); }
  protected eventsForDay(day: Date): Course[] { return this.liveShows().filter(show => show.live_start_date === this.dateKey(day)); }
  protected eventTime(show: Course): string { return show.live_start_time || 'LIVE'; }
  protected weekDayLabel(day: Date): string { return day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(); }
  protected weekDateLabel(day: Date): string { return day.toLocaleDateString('en-US', { day: '2-digit' }); }
  protected isToday(day: Date): boolean { return this.dateKey(day) === this.dateKey(new Date()); }
  private dateKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  protected chooseCalendarIcon(key: string): void { this.selectedCalendarIcon.set(key); this.calendarMenuOpen.set(false); }
  protected calendarIconSvg(): string { return this.calendarIcons.find(icon => icon.key === this.selectedCalendarIcon())?.svg ?? this.calendarIcons[0].svg; }

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
    this.coursesService.getLiveShows().subscribe({ next: shows => this.liveShows.set(shows), error: () => this.liveShows.set([]) });
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.routeToMobileLayoutOnSmallScreens();
    const params = new URLSearchParams(window.location.search);
    // Keep the actual registration popup available for local design work on reload.
    if (isDevMode() && params.get('popup-preview') === 'register') {
      this.authModal.open('register');
    }
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

  private routeToMobileLayoutOnSmallScreens(): void {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const mobileWidth = 600;
    const explicitDesktopRoute = path === '/layout-style-3' || path === '/layout-style-4';
    const mobileRoute = path === '/mobile-layout-1' || path.startsWith('/mobile-layout-1/');
    const chromeFreeRoute = path.startsWith('/tc-lens') || path.startsWith('/courses/');

    if (window.matchMedia(`(max-width: ${mobileWidth - 1}px)`).matches && !explicitDesktopRoute && !mobileRoute && !chromeFreeRoute) {
      void this.router.navigateByUrl('/mobile-layout-1', { replaceUrl: true });
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
  }
}

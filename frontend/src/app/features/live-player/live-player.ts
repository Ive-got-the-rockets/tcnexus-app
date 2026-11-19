import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, interval } from 'rxjs';
import { CoursesService } from '../../core/courses.service';
import { LiveShow, liveShowById } from '../../core/live-shows';
import { Course } from '../../core/models';
import { liveShowScheduleLabel, liveShowStart } from '../../core/live-show-schedule';

@Component({
  selector: 'app-live-player',
  imports: [RouterLink],
  templateUrl: './live-player.html',
  styleUrl: './live-player.scss',
})
export class LivePlayerPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly coursesService = inject(CoursesService);
  private readonly liveShowId = this.route.snapshot.paramMap.get('id');
  private readonly now = signal(Date.now());
  private readonly schedule = signal<{ start: number; duration: number } | null>(null);
  protected readonly show = signal<LiveShow | undefined>(liveShowById(this.liveShowId));
  protected readonly loading = signal(!this.show());
  protected readonly workspaceMode = this.route.snapshot.queryParamMap.get('mode') === 'workspace';
  protected readonly clock = computed(() => {
    const schedule = this.schedule();
    if (!schedule) return { label: 'Schedule to be announced', units: [], isLive: false };

    const remaining = schedule.start - this.now();
    if (remaining <= 0) {
      const isLive = remaining > -schedule.duration * 60_000;
      return { label: isLive ? 'Live now' : 'Scheduled time has passed', units: [], isLive };
    }

    const seconds = Math.ceil(remaining / 1_000);
    const units = [
      { label: 'Days', value: Math.floor(seconds / 86_400) },
      { label: 'Hours', value: Math.floor(seconds / 3_600) % 24 },
      { label: 'Minutes', value: Math.floor(seconds / 60) % 60 },
    ];
    if (remaining <= 10 * 60_000) units.push({ label: 'Seconds', value: seconds % 60 });
    return {
      label: 'Live in',
      units: units.map(({ label, value }) => ({ label, digits: String(value).padStart(2, '0').split('') })),
      isLive: false,
    };
  });
  protected readonly embedUrl = computed(() => {
    const url = this.show()?.embedUrl;
    if (!url) return null;
    const embed = new URL(url, window.location.origin);
    const title = this.show()?.title;
    if (title) embed.searchParams.set('liveTitle', title);
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${embed.pathname}${embed.search}`);
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    if (!this.workspaceMode) {
      interval(1_000).pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.now.set(Date.now()));
    }
    if (this.show()) return;

    this.coursesService.getLiveShows().pipe(
      takeUntilDestroyed(destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: shows => {
        const catalogShow = shows.find(show => String(show.id) === this.liveShowId);
        if (!catalogShow) return;

        const start = liveShowStart(catalogShow);
        if (start) this.schedule.set({ start: start.getTime(), duration: Number(catalogShow.live_duration) || 0 });
        this.show.set(this.catalogLiveShow(catalogShow));
      },
    });
  }

  protected openWorkspace(): void {
    const title = this.show()?.title;
    const vimeoLiveEventId = this.show()?.vimeoLiveEventId;
    const liveShowId = this.show()?.id ?? this.liveShowId;
    if (title && liveShowId) this.router.navigate(['/live-stream-layout'], { queryParams: { liveTitle: title, vimeoLiveEventId, liveShowId } });
  }

  private catalogLiveShow(catalogShow: Course): LiveShow {
    return {
      id: String(catalogShow.id),
      title: catalogShow.title,
      status: 'LIVE SOON',
      scheduleLabel: liveShowScheduleLabel(catalogShow),
      description: catalogShow.excerpt || 'Join us live on TC Nexus.',
      host: catalogShow.hosts?.[0]?.name || 'TC Nexus',
      hostPhotoUrl: catalogShow.hosts?.[0]?.photo || null,
      guests: catalogShow.guests || [],
      thumbnailUrl: catalogShow.image || catalogShow.thumbnail || '/shows/the-primer-BG-ratio-8by3.jpg',
      embedUrl: '/live-stream-layout',
      vimeoLiveEventId: catalogShow.vimeo_live_event_id || undefined,
    };
  }
}

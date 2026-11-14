import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CoursesService } from '../../core/courses.service';
import { LiveShow, liveShowById } from '../../core/live-shows';
import { Course } from '../../core/models';

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
  protected readonly show = signal<LiveShow | undefined>(liveShowById(this.liveShowId));
  protected readonly workspaceMode = this.route.snapshot.queryParamMap.get('mode') === 'workspace';
  protected readonly embedUrl = computed(() => {
    const url = this.show()?.embedUrl;
    if (!url) return null;
    const embed = new URL(url, window.location.origin);
    const title = this.show()?.title;
    if (title) embed.searchParams.set('liveTitle', title);
    return this.sanitizer.bypassSecurityTrustResourceUrl(`${embed.pathname}${embed.search}`);
  });

  constructor() {
    if (this.show()) return;

    this.coursesService.getLiveShows().subscribe({
      next: shows => {
        const catalogShow = shows.find(show => String(show.id) === this.liveShowId);
        if (catalogShow) this.show.set(this.catalogLiveShow(catalogShow));
      },
    });
  }

  protected openWorkspace(): void {
    const title = this.show()?.title;
    const vimeoLiveEventId = this.show()?.vimeoLiveEventId;
    if (title) this.router.navigate(['/live-stream-layout'], { queryParams: { liveTitle: title, vimeoLiveEventId } });
  }

  private catalogLiveShow(catalogShow: Course): LiveShow {
    return {
      id: String(catalogShow.id),
      title: catalogShow.title,
      status: 'LIVE SOON',
      scheduleLabel: 'Live show',
      description: catalogShow.excerpt || 'Join us live on TC Nexus.',
      host: catalogShow.hosts?.[0]?.name || 'TC Nexus',
      hostPhotoUrl: catalogShow.hosts?.[0]?.photo || null,
      guests: [],
      thumbnailUrl: catalogShow.image || catalogShow.thumbnail || '/shows/the-primer-BG-ratio-8by3.jpg',
      embedUrl: '/live-stream-layout',
      vimeoLiveEventId: catalogShow.vimeo_live_event_id || undefined,
    };
  }
}

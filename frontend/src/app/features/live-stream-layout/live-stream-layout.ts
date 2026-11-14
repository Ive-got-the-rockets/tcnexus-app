import { AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, OnDestroy, ViewChild, afterNextRender, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthModalService } from '../../core/auth-modal.service';
import { VisitorService } from '../../core/visitor.service';
import { buildTcLensUrl } from '../lesson-player/tc-lens-url';
import { TC_APP_ORIGIN } from '../lesson-player/tc-lens-pane-session';

@Component({
  selector: 'app-live-stream-layout',
  templateUrl: './live-stream-layout.html',
  styleUrl: './live-stream-layout.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class LiveStreamLayoutPage implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authModal = inject(AuthModalService);
  protected readonly visitor = inject(VisitorService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly title = this.route.snapshot.queryParamMap.get('liveTitle') || 'Live Show';
  protected readonly vimeoLiveEventId = (this.route.snapshot.queryParamMap.get('vimeoLiveEventId') || '').replace(/\D/g, '');
  @ViewChild('playerFrame') private playerFrame?: ElementRef<HTMLIFrameElement>;
  protected playing = false;
  protected muted = false;
  private readonly onMessage = (event: MessageEvent) => {
    if (event.source !== this.playerFrame?.nativeElement.contentWindow) return;
    if (typeof event.data !== 'string') return;
    try {
      const message = JSON.parse(event.data);
      if (message.event === 'play') this.playing = true;
      if (message.event === 'pause' || message.event === 'ended') this.playing = false;
      if (message.event === 'volumechange') this.muted = Number(message.data?.volume ?? 1) === 0;
    } catch { /* Vimeo also sends non-JSON messages. */ }
  };
  protected readonly playerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.vimeoLiveEventId
    ? `https://vimeo.com/event/${this.vimeoLiveEventId}/embed?controls=0&title=0&byline=0&portrait=0`
    : 'about:blank');
  protected readonly chatUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.vimeoLiveEventId
    ? `https://vimeo.com/live/interaction_tools/live_event/${this.vimeoLiveEventId}?theme=dark`
    : 'about:blank');
  protected readonly tcAppUrl = this.sanitizer.bypassSecurityTrustResourceUrl(buildTcLensUrl(TC_APP_ORIGIN, 66));
  protected showChat = false;
  protected showTcApp = false;
  protected showTcLensAi = false;

  constructor() {
    afterNextRender(() => {
      if (document.querySelector('script[data-tc-tutor-loader]')) return;
      const script = document.createElement('script');
      script.type = 'module'; script.src = `${TC_APP_ORIGIN}/lens/v1/tutor.js`;
      script.dataset['tcTutorLoader'] = ''; document.head.appendChild(script);
    });
  }

  ngAfterViewInit(): void { window.addEventListener('message', this.onMessage); }
  ngOnDestroy(): void { window.removeEventListener('message', this.onMessage); }

  protected command(method: string, value?: unknown): void {
    const frame = this.playerFrame?.nativeElement;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(JSON.stringify({ method, ...(value === undefined ? {} : { value }) }), '*');
    if (method === 'play') this.playing = true;
    if (method === 'pause') this.playing = false;
    if (method === 'setVolume') this.muted = value === 0;
  }

  protected togglePlay(): void { this.command(this.playing ? 'pause' : 'play'); }
  protected toggleMute(): void { this.command('setVolume', this.muted ? 1 : 0); }
  protected fullscreen(): void { this.playerFrame?.nativeElement.requestFullscreen?.(); }
  protected toggleChat(): void { this.showChat = !this.showChat; }
  protected toggleTcApp(): void {
    this.showTcApp = !this.showTcApp;
    if (!this.showTcApp) this.showTcLensAi = false;
  }
  protected toggleTcLensAi(): void {
    this.showTcLensAi = !this.showTcLensAi;
    this.showTcApp = true;
  }
  protected login(): void { this.authModal.open('login'); }
  protected exit(): void { this.router.navigate(['/live', 'market-open-live']); }
}

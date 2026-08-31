import { Component, ElementRef, Injector, OnDestroy, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Plyr from 'plyr';

import { AccessService } from '../../core/access.service';
import { AuthModalService } from '../../core/auth-modal.service';
import { CoursesService } from '../../core/courses.service';
import { AccessCheckResult, CourseDetail, Lesson } from '../../core/models';
import { isAnonymousFreeLimitReached, isFinalFreeLesson } from '../../core/registration-settings';
import { VisitorService } from '../../core/visitor.service';
import { WatchProgressService } from '../../core/watch-progress.service';

type PageStatus = 'loading' | 'error' | 'blocked' | 'ready';
type PromptPhase = 'initial' | 'final_free';

/**
 * Should match whatever's baked into the scrub-forward/backward icon art
 * below. The icons currently supplied show "10" — this is set to 15 to
 * match the reference site's spec, so the glyph and the actual seek amount
 * are mismatched until a "15" icon variant is supplied.
 */
const SEEK_TIME = 15;
/** How far from the end the "up next" card appears, and how long its countdown runs. */
const UP_NEXT_WINDOW_SECONDS = 10;
const UP_NEXT_COUNTDOWN_SECONDS = 10;

// X-Ray: ported from the reference theme's functions.php (tcnexus_course_page_inline_player).
// Mirrors Amazon's X-Ray — shrinks the video into the top-left of the screen
// while a panel slides in from the right and a bar slides up from the
// bottom, so the video scales down proportionally on both axes instead of
// just getting squeezed narrower. The reference itself leaves the panel/bar
// content undecided ("still being decided") — the panel just lazy-loads
// XRAY_PANEL_URL in an iframe, and the bottom bar is an empty placeholder.
// iPhone 16 Pro Max CSS viewport width.
const XRAY_PANEL_WIDTH = 440;
const XRAY_PANEL_URL = 'https://app.tradecheetah.com';

interface FillRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function computeFillRect(reserveRight: number, reserveBottom: number, constrainHeight = true): FillRect {
  const vw = window.innerWidth - reserveRight;
  const vh = window.innerHeight - reserveBottom;
  const width = Math.max(0, constrainHeight ? Math.min(vw, (vh * 16) / 9) : vw);
  const height = (width * 9) / 16;
  return { left: (vw - width) / 2, top: (vh - height) / 2, width, height };
}

interface VimeoRef {
  id: string;
  hash: string | null;
}

/**
 * Lessons store a Vimeo URL, or just the bare id (optionally "id/hash" for an
 * unlisted share link), in `video_url`. Split apart rather than kept as one
 * string because the two places that need it want different shapes:
 * the *first* load has to go through `data-plyr-embed-id`/`-embed-hash`
 * attributes on the target element (Plyr's constructor only recognizes a
 * plain `<div>` as a vimeo embed if those are already present — hand it a
 * blank div and it bails out with "Setup failed: Invalid provider" before
 * doing anything, which is why the player was rendering solid black), while
 * a later lesson-to-lesson swap goes through Plyr's `source` setter instead,
 * which wants id/hash recombined into one `src` string (see vimeoSrcForSwap).
 */
function parseVimeoRef(raw: string): VimeoRef {
  const match = raw.match(/(?:vimeo\.com\/(?:video\/)?)?(\d+)(?:\/([0-9a-z]+))?/i);
  return match ? { id: match[1], hash: match[2] ?? null } : { id: raw, hash: null };
}

function vimeoSrcForSwap(ref: VimeoRef): string {
  return ref.hash ? `video/${ref.id}/${ref.hash}` : ref.id;
}

/**
 * Swapped in for a few of Plyr's default sprite icons after the controls
 * render — custom art supplied for this project (scrub 10s back/forward with
 * the seek time baked into the glyph, and a sharper fullscreen
 * expand/minimize pair, plus outline volume/settings icons picked from the
 * icon-picker artifact). Only the viewBox + inner shapes are set here —
 * fill/stroke live in styles.scss instead of as attributes here, since
 * Plyr's own `.plyr__control svg { fill: currentColor }` CSS rule always
 * wins over a plain `fill`/`stroke` attribute regardless of specificity
 * (that mismatch is what made the outline icons render solid at first).
 */
interface CustomIcon {
  selector: string;
  viewBox: string;
  markup: string;
}

const CUSTOM_ICONS: Record<string, CustomIcon> = {
  rewind: {
    selector: '[data-plyr="rewind"] svg',
    viewBox: '0 0 49.59 53.12',
    markup: `
      <path d="M0,28.32c0,13.67,11.13,24.8,24.8,24.8s24.79-11.13,24.79-24.8c0-12.51-9.32-22.9-21.38-24.56V0s-8.26,5.02-8.26,5.02l8.26,4.65v-3.9c10.96,1.65,19.38,11.14,19.38,22.55,0,12.57-10.22,22.8-22.79,22.8S2,40.89,2,28.32c0-7.72,3.86-14.56,9.75-18.67l-1.44-1.44C4.07,12.72,0,20.06,0,28.32Z"/>
      <path d="M21.53,22.76v13.1h-1.64v-11.55h-.09l-3.16,2.35v-1.79l2.85-2.1h2.05Z"/>
      <path d="M28.35,36.03c-.77,0-1.46-.15-2.07-.45s-1.1-.71-1.46-1.24c-.36-.53-.56-1.12-.59-1.79h1.62c.04.39.17.73.4,1.04s.53.54.89.72c.37.17.77.26,1.21.26.53,0,1-.12,1.41-.37.41-.25.74-.59.97-1.02s.35-.93.35-1.48-.12-1.07-.37-1.51-.58-.79-1.01-1.05-.91-.38-1.46-.38c-.4,0-.81.06-1.23.19s-.75.29-1.01.49l-1.56-.19.77-6.49h6.89v1.47h-5.48l-.45,3.82h.07c.27-.22.61-.41,1.02-.55s.84-.22,1.29-.22c.6,0,1.15.11,1.66.33.51.22.95.52,1.32.92s.67.86.88,1.39c.21.53.31,1.12.31,1.75,0,.84-.19,1.58-.57,2.24-.38.66-.89,1.17-1.55,1.55-.66.38-1.41.57-2.25.57Z"/>
    `
  },
  fastForward: {
    selector: '[data-plyr="fast-forward"] svg',
    viewBox: '0 0 49.59 53.12',
    markup: `
      <path d="M49.59,28.32c0,13.67-11.13,24.8-24.8,24.8S0,41.99,0,28.32C0,15.81,9.32,5.42,21.38,3.76V0l8.26,5.02-8.26,4.65v-3.9C10.42,7.42,2,16.91,2,28.32c0,12.57,10.22,22.8,22.79,22.8s22.8-10.23,22.8-22.8c0-7.72-3.86-14.56-9.75-18.67l1.44-1.44c6.24,4.51,10.31,11.85,10.31,20.11Z"/>
      <path d="M20.6,22.76v13.1h-1.64v-11.55h-.09l-3.16,2.35v-1.79l2.85-2.1h2.05Z"/>
      <path d="M27.42,36.03c-.77,0-1.46-.15-2.07-.45s-1.1-.71-1.46-1.24c-.36-.53-.56-1.12-.59-1.79h1.62c.04.39.17.73.4,1.04s.53.54.89.72c.37.17.77.26,1.21.26.53,0,1-.12,1.41-.37.41-.25.74-.59.97-1.02s.35-.93.35-1.48-.12-1.07-.37-1.51-.58-.79-1.01-1.05-.91-.38-1.46-.38c-.4,0-.81.06-1.23.19s-.75.29-1.01.49l-1.56-.19.77-6.49h6.89v1.47h-5.48l-.45,3.82h.07c.27-.22.61-.41,1.02-.55s.84-.22,1.29-.22c.6,0,1.15.11,1.66.33.51.22.95.52,1.32.92s.67.86.88,1.39c.21.53.31,1.12.31,1.75,0,.84-.19,1.58-.57,2.24-.38.66-.89,1.17-1.55,1.55-.66.38-1.41.57-2.25.57Z"/>
    `
  },
  fullscreenEnter: {
    selector: '[data-plyr="fullscreen"] svg.icon--not-pressed',
    viewBox: '0 0 15.59 15.79',
    markup: `
      <polygon points="3.43 13.79 5.74 13.79 5.74 15.79 0 15.79 0 10.05 2 10.05 2 12.38 6.65 7.73 8.07 9.15 3.43 13.79"/>
      <polygon points="15.59 0 15.59 5.74 13.59 5.74 13.59 3.41 9.48 7.52 8.07 6.1 12.17 2 9.85 2 9.85 0 15.59 0"/>
    `
  },
  fullscreenExit: {
    selector: '[data-plyr="fullscreen"] svg.icon--pressed',
    viewBox: '0 0 17.14 17.14',
    markup: `
      <polygon points="12.5 6.06 14.81 6.06 14.81 8.06 9.07 8.06 9.07 2.32 11.07 2.32 11.07 4.65 15.72 0 17.14 1.42 12.5 6.06"/>
      <polygon points="7.52 9.62 7.52 15.36 5.52 15.36 5.52 13.03 1.41 17.14 0 15.72 4.1 11.62 1.78 11.62 1.78 9.62 7.52 9.62"/>
    `
  },
  // Picked from the icon-picker artifact: Volume #1, Settings #3.
  volumeUnmuted: {
    selector: '[data-plyr="mute"] svg.icon--not-pressed',
    viewBox: '0 0 24 24',
    markup: `
      <path d="M4 9v6h4l5 4V5L8 9H4z"/>
      <path d="M16.5 8.5a5 5 0 0 1 0 7"/>
      <path d="M19 6a8.5 8.5 0 0 1 0 12"/>
    `
  },
  // Picked from the icon-picker artifact: Volume #4 (muted counterpart to #1).
  volumeMuted: {
    selector: '[data-plyr="mute"] svg.icon--pressed',
    viewBox: '0 0 24 24',
    markup: `
      <path d="M4 9v6h4l5 4V5L8 9H4z"/>
      <path d="M16 10l4.5 4.5M20.5 10 16 14.5"/>
    `
  },
  // The dot classes (tcn-dot--1/2/3) are targeted in styles.scss to shift
  // sideways instead of the icon rotating 90deg — Plyr's default active-state
  // treatment for [aria-expanded="true"], which doesn't suit a sliders icon.
  settings: {
    selector: '[data-plyr="settings"] svg',
    viewBox: '0 0 24 24',
    markup: `
      <path d="M4 6h16M4 12h16M4 18h16"/>
      <circle class="tcn-dot tcn-dot--1" cx="8" cy="6" r="1.8" fill="currentColor" stroke="none"/>
      <circle class="tcn-dot tcn-dot--2" cx="16" cy="12" r="1.8" fill="currentColor" stroke="none"/>
      <circle class="tcn-dot tcn-dot--3" cx="10" cy="18" r="1.8" fill="currentColor" stroke="none"/>
    `
  }
};

@Component({
  selector: 'app-lesson-player',
  imports: [RouterLink],
  templateUrl: './lesson-player.html',
  styleUrl: './lesson-player.scss'
})
export class LessonPlayerPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly coursesService = inject(CoursesService);
  private readonly accessService = inject(AccessService);
  protected readonly authModal = inject(AuthModalService);
  private readonly watchProgress = inject(WatchProgressService);
  private readonly injector = inject(Injector);
  private readonly visitor = inject(VisitorService);

  protected readonly status = signal<PageStatus>('loading');
  protected readonly course = signal<CourseDetail | null>(null);
  protected readonly lesson = signal<Lesson | null>(null);
  protected readonly nextLesson = signal<Lesson | null>(null);
  /** Set only when status() === 'blocked' — drives which message/action shows. */
  protected readonly accessResult = signal<AccessCheckResult | null>(null);

  /** Content inside the panel/bottom bar is still undefined in the reference too — see the XRAY_* constants' comment. */
  protected readonly xrayOpen = signal(false);
  private xrayPanel: HTMLElement | null = null;
  private xrayFrame: HTMLIFrameElement | null = null;
  private xrayBottomBar: HTMLElement | null = null;
  private readonly onResize = (): void => {
    if (this.xrayOpen()) {
      this.placeXray();
      this.scheduleXrayPlacement();
    }
  };

  protected readonly upNextVisible = signal(false);
  protected readonly upNextFillPercent = signal(0);
  protected readonly upNextSecondsLeft = signal(UP_NEXT_COUNTDOWN_SECONDS);

  /**
   * Bound onto the embed div's data-plyr-embed-id/-hash attributes so
   * Plyr's constructor recognizes it as a vimeo embed the very first time
   * it renders — see the comment on parseVimeoRef above for why this can't
   * just go through the source setter like every later lesson does.
   */
  private readonly currentVimeoRef = computed<VimeoRef | null>(() => {
    const url = this.lesson()?.video_url;
    return url ? parseVimeoRef(url) : null;
  });
  protected readonly embedId = computed(() => this.currentVimeoRef()?.id ?? null);
  protected readonly embedHash = computed(() => this.currentVimeoRef()?.hash ?? null);

  private readonly playerWrap = viewChild<ElementRef<HTMLDivElement>>('playerWrap');
  private readonly embedEl = viewChild<ElementRef<HTMLDivElement>>('embedEl');

  private player: Plyr | null = null;
  private upNextTriggered = false;
  private upNextDismissed = false;
  private countdownFrame: number | null = null;
  private readonly promptPhase = signal<PromptPhase | null>(null);
  private readonly pendingStart = signal<{ lesson: Lesson; restart: boolean } | null>(null);
  private readonly pendingChoice = signal<{ course: CourseDetail; lesson: Lesson; restart: boolean } | null>(null);

  constructor() {
    // Subscribed (not just read once from the snapshot): navigating from one
    // lesson to the next re-uses this same route config, just with a new
    // :lessonId, so Angular reuses this component instance instead of
    // recreating it — paramMap is what actually notifies us that happened.
    this.route.paramMap.subscribe((params) => {
      const courseId = Number(params.get('id'));
      const lessonId = Number(params.get('lessonId'));
      // ?restart=1 (set by the course-detail page's restart-from-beginning
      // button) skips resuming from saved progress for this one navigation.
      const restart = this.route.snapshot.queryParamMap.get('restart') === '1';
      this.loadLesson(courseId, lessonId, restart);
    });

    effect(() => {
      if (!this.authModal.isOpen() && this.promptPhase()) {
        const phase = this.promptPhase();
        if (phase === 'initial' && !this.visitor.isRegistered()) {
          this.promptPhase.set('final_free');
          this.authModal.open('final_free');
          return;
        }
        const pending = this.pendingStart();
        this.promptPhase.set(null);
        if (pending) this.startDeferredLesson(pending.lesson, pending.restart);
      } else if (!this.authModal.isOpen() && this.pendingChoice()) {
        // Keep the existing page mounted while the choice popup is dismissed.
        // Once registration changes the modal back to its normal mode, retry
        // the lesson that originally triggered the choice.
        if (this.authModal.mode() === 'choice') return;
        const pending = this.pendingChoice();
        this.pendingChoice.set(null);
        if (pending) this.checkAccessAndProceed(pending.course, pending.lesson, pending.restart);
      } else if (!this.authModal.isOpen() && this.status() === 'blocked') {
        // A dismissed choice modal should leave the viewer on the blocked state
        // instead of immediately reopening the same modal in a loop.
        if (this.authModal.mode() === 'choice') return;
        const course = this.course();
        const lesson = this.lesson();
        if (course && lesson) this.checkAccessAndProceed(course, lesson, false);
      }
    });

    window.addEventListener('resize', this.onResize, { passive: true });
  }

  ngOnDestroy(): void {
    this.cancelCountdown();
    window.removeEventListener('resize', this.onResize);
    this.player?.destroy();
  }

  private loadLesson(courseId: number, lessonId: number, restart: boolean): void {
    const isFirstLoad = this.player === null;
    if (isFirstLoad) {
      this.status.set('loading');
    }
    this.resetUpNext();

    this.coursesService.getCourse(courseId).subscribe({
      next: (course) => {
        const lesson = course.lessons.find((l) => l.id === lessonId) ?? null;
        if (!lesson) {
          this.status.set('error');
          return;
        }
        this.checkAccessAndProceed(course, lesson, restart);
      },
      error: () => this.status.set('error')
    });
  }

  /**
   * The client-side `locked` flag on a Lesson is just a UI hint for the
   * lesson list — this is the actual gate, checked the same way the real
   * backend enforces it server-side (tier, free-view limit). Shared between
   * the initial navigation and the post-registration retry above.
   */
  private checkAccessAndProceed(course: CourseDetail, lesson: Lesson, restart: boolean): void {
    this.accessService.checkAccess(lesson.id).subscribe({
      next: (access) => {
        this.accessResult.set(access);

        if (!access.granted) {
          if (isAnonymousFreeLimitReached(access, this.visitor.isRegistered())) {
            this.pendingChoice.set({ course, lesson, restart });
            if (!this.player) this.status.set('blocked');
            this.authModal.open('choice');
            return;
          }
          this.course.set(course);
          this.lesson.set(lesson);
          this.status.set('blocked');
          return;
        }

        this.course.set(course);
        this.lesson.set(lesson);

        const next = course.lessons.find((l) => l.order === lesson.order + 1) ?? null;
        this.nextLesson.set(next);

        if (isFinalFreeLesson(access, this.visitor.isRegistered())) {
          this.pendingStart.set({ lesson, restart });
          this.promptPhase.set('initial');
          this.status.set('loading');
          this.authModal.open('register');
          return;
        }

        this.status.set('ready');

        if (this.player) {
          this.swapSource(lesson, restart);
        } else {
          afterNextRender(() => this.initPlayer(lesson, restart), { injector: this.injector });
        }
      },
      error: () => this.status.set('error')
    });
  }

  protected openRegister(): void {
    this.authModal.open('register');
  }

  private startDeferredLesson(lesson: Lesson, restart: boolean): void {
    this.pendingStart.set(null);
    this.status.set('ready');
    if (this.player) {
      this.swapSource(lesson, restart);
    } else {
      afterNextRender(() => this.initPlayer(lesson, restart), { injector: this.injector });
    }
  }

  private initPlayer(lesson: Lesson, restart: boolean): void {
    const embedElRef = this.embedEl();
    if (!embedElRef || !lesson.video_url) return;

    this.player = new Plyr(embedElRef.nativeElement, {
      controls: ['rewind', 'play', 'fast-forward', 'progress', 'current-time', 'duration', 'mute', 'settings', 'fullscreen'],
      // 'loop' is deliberately omitted — Plyr 3.8.4 has its loop-menu builder
      // commented out in the library source itself, so it can never render
      // anything regardless of what's listed here.
      settings: ['speed'],
      seekTime: SEEK_TIME,
      tooltips: { controls: false, seek: true },
      fullscreen: { enabled: true, fallback: true },
      keyboard: { focused: true, global: true },
      storage: { enabled: false },
      // Plyr's own click-to-play (on by default) listens on .plyr itself —
      // a closer ancestor than addClickToggleOverlay()'s listener on
      // .player-wrap — and fires for any click landing inside
      // .plyr__video-wrapper. Once the iframe pointer-events:none fix let
      // clicks fall through to .plyr__video-embed (inside that wrapper),
      // both handlers started firing for the same click and toggling twice
      // — net no change, which looked exactly like clicking did nothing.
      // Disabled here since addClickToggleOverlay() already handles this
      // correctly for a cross-origin embed; having both active is what
      // caused the cancel-out, not a coincidence.
      clickToPlay: false,
      // Turns off Vimeo's own chrome (byline/portrait/title/native controls)
      // so only Plyr's UI shows — same block the reference theme used.
      vimeo: {
        byline: false,
        portrait: false,
        title: false,
        controls: false
      },
      i18n: {
        rewind: `Rewind ${SEEK_TIME}s`,
        play: 'Play',
        pause: 'Pause',
        fastForward: `Forward ${SEEK_TIME}s`,
        seek: 'Seek',
        played: 'Played',
        buffered: 'Buffered',
        currentTime: 'Current time',
        duration: 'Duration',
        volume: 'Volume',
        mute: 'Mute',
        unmute: 'Unmute',
        enterFullscreen: 'Enter fullscreen',
        exitFullscreen: 'Exit fullscreen',
        settings: 'Settings',
        speed: 'Speed',
        normal: 'Normal'
      }
    });

    this.player.on('ready', () => {
      this.applyCustomIcons();
      this.restructureControls();
      this.buildXrayPanel();
      this.addClickToggleOverlay();
    });
    this.player.on('timeupdate', () => this.handleTimeUpdate());
    this.player.on('ended', () => this.handleEnded());
    // Native fullscreen re-parents rendering to .plyr itself, so the fill
    // rect (and which element it applies to) has to be recomputed on every
    // transition in or out of it — see placeXray().
    this.player.on('enterfullscreen', () => this.scheduleXrayPlacement());
    this.player.on('exitfullscreen', () => this.scheduleXrayPlacement());

    // No initial setSource() call here — the div's data-plyr-embed-id/-hash
    // attributes (bound to embedId()/embedHash() in the template) already
    // told the constructor above which video to load.
    // No play() call here — see applyResumeTime's comment for why it has to
    // happen there instead of immediately after construction.
    this.player.once('timeupdate', () => this.applyResumeTime(lesson, restart));
  }

  /** Only used for lesson-to-lesson swaps on an already-initialized player — see parseVimeoRef's comment. */
  private swapSource(lesson: Lesson, restart: boolean): void {
    if (!this.player || !lesson.video_url) return;
    this.player.source = {
      type: 'video',
      title: lesson.title,
      sources: [{ src: vimeoSrcForSwap(parseVimeoRef(lesson.video_url)), provider: 'vimeo' }]
    };
    // No play() call here either, for the same reason as initPlayer() — see
    // applyResumeTime.
    this.player.once('timeupdate', () => this.applyResumeTime(lesson, restart));
  }

  /**
   * Fires off Plyr's 'timeupdate' event (the *first* one, via .once() —
   * see initPlayer/swapSource), not 'loadedmetadata' or 'durationchange'.
   * Both of those were tried and both were wrong, for opposite reasons —
   * confirmed by instrumenting with real console logging rather than
   * reasoning from source alone (see plyr's actual source below for why):
   *
   * - 'loadedmetadata': never fires for the vimeo provider at all
   *   (node_modules/plyr/src/js/plugins/vimeo.js never triggers it — that
   *   name doesn't appear anywhere in the file).
   * - 'durationchange': vimeo.js DOES trigger it (once embed.getDuration()
   *   resolves), but player.on()/.once() only ever receive events that get
   *   proxied from the media element up to the player's container element
   *   — and that proxying (node_modules/plyr/src/js/listeners.js, "Proxy
   *   events to container") only forwards an explicit whitelist,
   *   config.events (config/defaults.js). 'durationchange' isn't in that
   *   list, so it's dispatched but nothing forwards it — .once() never
   *   fires. ('loadedmetadata' IS in that whitelist, which is exactly
   *   backwards from what's actually needed: the one event vimeo.js will
   *   proxy, it never sends.)
   *
   * 'timeupdate' is both actually triggered by vimeo.js (right after
   * embed.getCurrentTime() resolves) AND in the config.events whitelist,
   * so it's the one combination that's genuinely observable from here. It
   * fires only after a real round-trip through the Vimeo iframe's
   * postMessage API has already succeeded — the same channel currentTime's
   * setter uses via embed.setCurrentTime() — so by then a seek is safe to
   * issue. It also re-fires on every swapSource() lesson change, since
   * vimeo.js's whole ready() (including the getCurrentTime() call) reruns
   * on each source swap, not just on first construction.
   */
  private applyResumeTime(lesson: Lesson, restart: boolean): void {
    if (!this.player) return;

    // Starting playback here — the first point it's actually safe to, since
    // this only runs once the first timeupdate has fired, i.e. once
    // embed.getCurrentTime() has genuinely resolved — isn't just "autoplay
    // on open." It's load-bearing for the seek below, for two stacked
    // reasons confirmed by instrumenting with real console logging (see the
    // class doc comment's history of wrong guesses above):
    //
    // 1. Plyr's vimeo currentTime setter special-cases a paused,
    //    never-yet-played video by pausing again right after seeking it, to
    //    restore that exact state (node_modules/plyr/src/js/plugins/vimeo.js
    //    — "Vimeo will automatically play on seek if the video hasn't been
    //    played before"). Calling play() first flips the player out of
    //    "never played" state, so that branch never triggers.
    // 2. play() and the seek used to fire in the same synchronous tick —
    //    two concurrent calls racing into Vimeo's postMessage API. play()'s
    //    own promise doesn't actually settle until real playback has
    //    started (confirmed: it took over a second under a throttled
    //    connection), so issuing the seek only once that promise resolves
    //    sequences the two instead of racing them.
    //
    // (Vimeo may still naturally pause a moment later to rebuffer under a
    // slow connection — that's normal player behavior, not this code.)
    const playResult = this.player.play();
    const played = playResult && typeof playResult.then === 'function' ? playResult : Promise.resolve();

    played.catch(() => {}).then(() => {
      if (restart || !this.player) return;
      const saved = this.watchProgress.timeFor(lesson.id);
      if (saved > 5) {
        this.player.currentTime = saved;
      }
    });
  }

  private applyCustomIcons(): void {
    const root = this.playerWrap()?.nativeElement;
    if (!root) return;

    Object.values(CUSTOM_ICONS).forEach(({ selector, viewBox, markup }) => {
      const target = root.querySelector(selector);
      if (!target) return;
      target.setAttribute('viewBox', viewBox);
      target.innerHTML = markup;
    });
  }

  /**
   * Regroups Plyr's own control buttons into the custom layout — a corner
   * cluster (settings/mute/fullscreen/close) and a center transport cluster
   * (rewind/play/forward), plus repositioned progress and time — since Plyr
   * has no built-in way to arrange controls outside its single bottom bar.
   * Moves the *existing* elements (appendChild on an already-mounted node
   * relocates it) rather than cloning, so every click handler Plyr already
   * wired up keeps working; replaceChildren at the end drops whatever empty
   * wrapper divs Plyr leaves behind once their contents have been moved out.
   */
  private restructureControls(): void {
    const root = this.playerWrap()?.nativeElement;
    const controlsRoot = root?.querySelector('.plyr__controls');
    if (!root || !controlsRoot) return;

    // Settings moves as its whole .plyr__menu wrapper (button + popup
    // together) if Plyr nested it that way, so the popup doesn't get left
    // behind wherever the button used to sit.
    const settingsButton = controlsRoot.querySelector('[data-plyr="settings"]');
    const settingsEl = settingsButton?.closest('.plyr__menu') ?? settingsButton;

    const corner = document.createElement('div');
    corner.className = 'tcn-corner-controls';
    [settingsEl, controlsRoot.querySelector('[data-plyr="mute"]'), controlsRoot.querySelector('[data-plyr="fullscreen"]'), this.createCloseButton()].forEach(
      (el) => el && corner.appendChild(el)
    );

    const center = document.createElement('div');
    center.className = 'tcn-center-controls';
    [controlsRoot.querySelector('[data-plyr="rewind"]'), controlsRoot.querySelector('[data-plyr="play"]'), controlsRoot.querySelector('[data-plyr="fast-forward"]')].forEach(
      (el) => el && center.appendChild(el)
    );

    const progress = document.createElement('div');
    progress.className = 'tcn-progress';
    const progressEl = controlsRoot.querySelector('.plyr__progress');
    if (progressEl) progress.appendChild(progressEl);

    const time = document.createElement('div');
    time.className = 'tcn-time';
    [controlsRoot.querySelector('.plyr__time--current'), controlsRoot.querySelector('.plyr__time--duration')].forEach((el) => el && time.appendChild(el));

    controlsRoot.replaceChildren(corner, center, progress, time, this.createXrayButton());
  }

  private createCloseButton(): HTMLElement {
    const link = document.createElement('a');
    link.className = 'tcn-corner-btn tcn-corner-btn--close';
    link.setAttribute('aria-label', 'Close');
    link.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const course = this.course();
      if (course) this.router.navigate(['/courses', course.id]);
    });
    return link;
  }

  /** Text label standing in for the reference's 110x14 wordmark icon — no such asset exists yet. */
  private createXrayButton(): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tcn-ctrl-xray';
    button.innerHTML = '<span class="tcn-ctrl-xray__trade">TRADE</span><span class="tcn-ctrl-xray__cheetah">CHEETAH</span>';
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      this.setXrayOpen(!this.xrayOpen());
      button.setAttribute('aria-pressed', String(this.xrayOpen()));
    });
    return button;
  }

  /**
   * Builds the slide-in panel (close button + a lazy-loaded iframe) and the
   * empty bottom bar, mounted inside .plyr itself rather than .player-wrap —
   * same reasoning as restructureControls's corner/center groups: only
   * .plyr's own descendants keep rendering once the browser's native
   * fullscreen takes over.
   */
  private buildXrayPanel(): void {
    const root = this.playerWrap()?.nativeElement;
    const plyrEl = root?.querySelector('.plyr');
    if (!root || !plyrEl) return;

    const panel = document.createElement('div');
    panel.className = 'tcn-xray-panel';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'tcn-xray-panel-close';
    closeButton.setAttribute('aria-label', 'Close details');
    closeButton.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    closeButton.addEventListener('click', () => this.setXrayOpen(false));

    const frame = document.createElement('iframe');
    frame.className = 'tcn-xray-frame';
    frame.setAttribute('frameborder', '0');

    panel.append(closeButton, frame);
    const bottomBar = document.createElement('div');
    bottomBar.className = 'tcn-xray-bottombar';

    plyrEl.append(panel, bottomBar);

    this.xrayPanel = panel;
    this.xrayFrame = frame;
    this.xrayBottomBar = bottomBar;
  }

  /**
   * Click-anywhere-to-pause/unpause. Plyr's own clickToPlay option (on by
   * default) never fires for this player: it listens on .plyr's container,
   * but a click that lands on the actual video picture happens inside the
   * Vimeo iframe's own document — a different browsing context whose clicks
   * don't bubble out to the parent page at all. styles.scss makes that
   * iframe pointer-events:none so the click falls through to
   * .plyr__video-embed instead; the listener goes there rather than on the
   * iframe itself because Plyr replaces the iframe on every lesson-to-lesson
   * swapSource() call, while .plyr__video-embed is created once and stays
   * put — attaching here means this only has to run once, in 'ready',
   * instead of being re-wired after every swap.
   */
  private addClickToggleOverlay(): void {
    const root = this.playerWrap()?.nativeElement;
    if (!root) return;

    // Attached to .player-wrap itself (our own template element, present
    // from the very first render) rather than something Plyr creates
    // internally like .plyr__video-embed — that's a DOM node built by a
    // third-party library on its own async timeline, and querying for it
    // right when this runs risks a race if it doesn't exist yet. Checking
    // the click target at click time, once everything definitely exists,
    // sidesteps that entirely: ignore anything inside the controls bar
    // (that already has its own buttons), toggle for everything else.
    root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      // X-Ray controls live inside .plyr, but their clicks must not be
      // mistaken for video clicks. In particular, closing the panel would
      // otherwise bubble here and start playback again.
      if (target.closest('.plyr__controls, .tcn-xray-panel, .tcn-xray-bottombar')) return;
      this.player?.togglePlay();
    });
  }

  protected setXrayOpen(open: boolean): void {
    this.xrayOpen.set(open);
    this.playerWrap()?.nativeElement.classList.toggle('tcn-xray-open', open);

    if (open && this.xrayFrame && !this.xrayFrame.getAttribute('src')) {
      this.xrayFrame.setAttribute('src', XRAY_PANEL_URL);
    }

    this.placeXray();
  }

  /**
   * Sizes/positions the video for the current xrayOpen state, ported from
   * the reference's place(). Non-fullscreen: .player-wrap itself is pinned
   * (position:fixed, inline left/top/width/height) to the computed rect —
   * cleared entirely when X-Ray is closed, reverting to the normal
   * flex-centered CSS layout. Fullscreen: the browser has already put .plyr
   * itself in control of the whole screen, so .player-wrap's own box no
   * longer constrains anything — the video's own .plyr__video-embed is
   * resized instead, using the same rect math.
   */
  private placeXray(): void {
    const wrap = this.playerWrap()?.nativeElement;
    if (!wrap) return;

    const open = this.xrayOpen();
    const plyrElement = wrap.querySelector<HTMLElement>('.plyr');
    const isFullscreen =
      !!this.player?.fullscreen?.active ||
      !!plyrElement?.classList.contains('plyr--fullscreen-active') ||
      document.fullscreenElement === plyrElement;
    const rect = computeFillRect(open ? XRAY_PANEL_WIDTH : 0, 0, !open);

    if (open) {
      // X-Ray keeps the player flush with the viewport's top-left corner.
      // Its width uses all space beside the fixed-width phone panel, while
      // the height is derived from that width to preserve a true 16:9 ratio.
      rect.left = 0;
      rect.top = 0;
    }

    const videoWrapper = wrap.querySelector<HTMLElement>('.plyr__video-wrapper');
    const videoEmbed = wrap.querySelector<HTMLElement>('.plyr__video-embed');
    const controlsRoot = wrap.querySelector<HTMLElement>('.plyr__controls');

    if (isFullscreen) {
      wrap.style.position = '';
      wrap.style.left = '';
      wrap.style.top = '';
      wrap.style.width = '';
      wrap.style.height = '';

      if (open && videoWrapper) {
        // Native fullscreen keeps .plyr at the viewport size. Resize its
        // video wrapper instead so the X-Ray panel occupies the right side
        // rather than sitting on top of the video.
        videoWrapper.style.position = 'absolute';
        videoWrapper.style.left = '0';
        videoWrapper.style.top = '0';
        videoWrapper.style.width = `${rect.width}px`;
        videoWrapper.style.height = `${rect.height}px`;
      } else if (videoWrapper) {
        videoWrapper.style.position = '';
        videoWrapper.style.left = '';
        videoWrapper.style.top = '';
        videoWrapper.style.width = '';
        videoWrapper.style.height = '';
      }

      if (open && controlsRoot) {
        // The custom controls are a full-area overlay. Keep that overlay
        // aligned with the shrunken video column instead of the full native
        // fullscreen shell, so center/top/bottom controls stay on the video.
        controlsRoot.style.inset = '0 auto auto 0';
        controlsRoot.style.width = `${rect.width}px`;
        controlsRoot.style.height = `${rect.height}px`;
      } else if (controlsRoot) {
        controlsRoot.style.inset = '';
        controlsRoot.style.width = '';
        controlsRoot.style.height = '';
      }

      // The wrapper now owns the rectangle. Remove stale child sizing left by
      // a previous non-fullscreen placement and let the fill CSS apply.
      if (videoEmbed) {
        videoEmbed.style.position = '';
        videoEmbed.style.left = '';
        videoEmbed.style.top = '';
        videoEmbed.style.width = '';
        videoEmbed.style.height = '';
      }
    } else {
      if (controlsRoot) {
        controlsRoot.style.inset = '';
        controlsRoot.style.width = '';
        controlsRoot.style.height = '';
      }
      if (videoEmbed) {
        if (open) {
          // Explicitly size the embed too. Plyr/Vimeo can otherwise retain
          // its own centered aspect-ratio box while the outer shell is
          // resizing, which creates the apparent top gap.
          videoEmbed.style.position = 'absolute';
          videoEmbed.style.left = '0';
          videoEmbed.style.top = '0';
          videoEmbed.style.width = `${rect.width}px`;
          videoEmbed.style.height = `${rect.height}px`;
        } else {
          videoEmbed.style.position = '';
          videoEmbed.style.left = '';
          videoEmbed.style.top = '';
          videoEmbed.style.width = '';
          videoEmbed.style.height = '';
        }
      }
      if (open) {
        wrap.style.position = 'fixed';
        wrap.style.left = `${rect.left}px`;
        wrap.style.top = `${rect.top}px`;
        wrap.style.width = `${rect.width}px`;
        wrap.style.height = `${rect.height}px`;
      } else {
        wrap.style.position = '';
        wrap.style.left = '';
        wrap.style.top = '';
        wrap.style.width = '';
        wrap.style.height = '';
      }
    }

    if (open) {
      const panelWidth = Math.min(XRAY_PANEL_WIDTH, window.innerWidth);
      if (this.xrayPanel) this.xrayPanel.style.width = `${panelWidth}px`;
      if (this.xrayBottomBar) this.xrayBottomBar.style.right = `${panelWidth}px`;
      if (this.xrayBottomBar) {
        this.xrayBottomBar.style.height = `${Math.max(0, window.innerHeight - rect.height)}px`;
      }
    } else {
      if (this.xrayPanel) this.xrayPanel.style.width = '';
      if (this.xrayBottomBar) this.xrayBottomBar.style.right = '';
      if (this.xrayBottomBar) this.xrayBottomBar.style.height = '';
    }
  }

  /** Fullscreen state settles after Plyr emits its transition event. */
  private scheduleXrayPlacement(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.placeXray());
    });
  }

  private handleTimeUpdate(): void {
    if (!this.player) return;
    const { currentTime, duration } = this.player;

    const lesson = this.lesson();
    const course = this.course();
    if (lesson && course) {
      this.watchProgress.update(lesson.id, course.id, currentTime, duration);
    }

    if (this.upNextTriggered || this.upNextDismissed || !this.nextLesson()) return;
    if (!duration || duration - currentTime > UP_NEXT_WINDOW_SECONDS) return;

    this.upNextTriggered = true;
    this.upNextVisible.set(true);
    this.startCountdown();
  }

  private handleEnded(): void {
    if (this.nextLesson() && !this.upNextDismissed) {
      this.goToNext();
    }
  }

  private startCountdown(): void {
    const start = performance.now();
    const end = start + UP_NEXT_COUNTDOWN_SECONDS * 1000;

    const tick = (now: number): void => {
      const remaining = Math.max(0, end - now);
      this.upNextSecondsLeft.set(Math.ceil(remaining / 1000));
      this.upNextFillPercent.set(100 - (remaining / (UP_NEXT_COUNTDOWN_SECONDS * 1000)) * 100);

      if (remaining <= 0) {
        this.goToNext();
        return;
      }
      this.countdownFrame = requestAnimationFrame(tick);
    };

    this.countdownFrame = requestAnimationFrame(tick);
  }

  private cancelCountdown(): void {
    if (this.countdownFrame !== null) {
      cancelAnimationFrame(this.countdownFrame);
      this.countdownFrame = null;
    }
  }

  private resetUpNext(): void {
    this.cancelCountdown();
    this.upNextTriggered = false;
    this.upNextDismissed = false;
    this.upNextVisible.set(false);
    this.upNextFillPercent.set(0);
    this.upNextSecondsLeft.set(UP_NEXT_COUNTDOWN_SECONDS);
  }

  protected dismissUpNext(event: Event): void {
    event.stopPropagation();
    this.upNextDismissed = true;
    this.cancelCountdown();
    this.upNextVisible.set(false);
  }

  protected playNextNow(event: Event): void {
    event.stopPropagation();
    this.cancelCountdown();
    this.goToNext();
  }

  private goToNext(): void {
    const next = this.nextLesson();
    const course = this.course();
    if (!next || !course) return;
    this.router.navigate(['/courses', course.id, 'lessons', next.id]);
  }

  protected lessonThumbnailUrl(lesson: Lesson): string {
    return lesson.thumbnail ?? `https://picsum.photos/seed/tcnexus-lesson-${lesson.id}/320/180`;
  }
}

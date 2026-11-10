import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import type { Subscription } from 'rxjs';
import { CoursesService } from '../../core/courses.service';
import { VisitorService } from '../../core/visitor.service';
import { AuthModalService } from '../../core/auth-modal.service';
import type { Lesson } from '../../core/models';
import { buildTcLensUrl } from '../lesson-player/tc-lens-url';
import { TcLensConnection } from '../lesson-player/tc-lens-connection';
import { TcLensHostBridge } from '../lesson-player/tc-lens-host-bridge';
import { buildTcLessonContext, currentTcChapter } from '../lesson-player/tc-lens-lesson-context';
import { readWorkspaceClose, readWorkspacePlayback } from '../lesson-player/tc-lens-workspace-playback';
import { TC_APP_ORIGIN } from '../lesson-player/tc-lens-pane-session';
import { courseForLesson } from '../lesson-player/course-lesson-selection';
import { workspaceExitUrl } from '../lesson-player/local-layout-one';

interface TcTutorElement extends HTMLElement {
  ask?: (text: string) => void;
}

@Component({
  selector: 'app-tc-lens-layout-01', templateUrl: './tc-lens-layout-01.html',
  styleUrl: './tc-lens-layout-01.scss', schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TcLensLayout01Page implements OnDestroy {
  protected readonly visitor = inject(VisitorService);
  private readonly authModal = inject(AuthModalService);
  private readonly courses = inject(CoursesService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly videoFrame = viewChild<ElementRef<HTMLIFrameElement>>('videoFrame');
  private readonly appFrame = viewChild<ElementRef<HTMLIFrameElement>>('appFrame');
  private readonly contextHost = viewChild<ElementRef<HTMLElement>>('contextHost');
  protected readonly lessonId = this.positiveId('lessonId', 66);
  private readonly courseId = this.positiveId('courseId', 55);
  protected readonly tcLensUrl = this.sanitizer.bypassSecurityTrustResourceUrl(buildTcLensUrl(TC_APP_ORIGIN, this.lessonId));
  protected readonly videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.embeddedVideoUrl());
  protected readonly chapter = signal('intro');
  protected readonly lessonTitle = signal('Lesson video');
  protected readonly status = signal('');
  protected readonly tutorError = signal(false);
  protected readonly contextReady = signal(false);
  protected readonly appReady = signal(false);
  protected readonly exiting = signal(false);
  private lesson: Lesson | null = null;
  private bridge: TcLensHostBridge | null = null;
  private connection: TcLensConnection | null = null;
  private subscription?: Subscription;
  private currentTime = 0;
  private startTime = -1;
  private receivedPlayback = false;
  private opened = false;
  private frameLoaded = false;
  private readonly knownLessonIds = new Set<number>();

  constructor() {
    afterNextRender(() => {
      this.connection = new TcLensConnection(() => this.appFrame()?.nativeElement ?? null, () => this.visitor.getLearnerId(), () => this.bridge);
      window.addEventListener('message', this.onPlayback);
      this.subscription = this.courses.getCourse(this.courseId).subscribe({
        next: course => {
          course = courseForLesson(course, this.lessonId, this.route.snapshot.queryParamMap.get('level'));
          for (const lesson of [...course.lessons, ...Object.values(course.levels ?? {}).flatMap(level => level.lessons ?? [])]) this.knownLessonIds.add(lesson.id);
          this.lesson = course.lessons.find(lesson => lesson.id === this.lessonId) ??
            Object.values(course.levels ?? {}).flatMap(level => level.lessons ?? []).find(lesson => lesson.id === this.lessonId) ?? null;
          if (!this.lesson) { this.status.set('This lesson could not be found.'); return; }
          this.lessonTitle.set(this.lesson.title);
          const json = document.createElement('script');
          json.type = 'application/json'; json.id = 'tc-lesson';
          // DOM text assignment does not parse author content as HTML.
          json.textContent = JSON.stringify(buildTcLessonContext(this.lesson));
          this.contextHost()?.nativeElement.replaceChildren(json);
          this.contextReady.set(true);
          this.chapter.set(currentTcChapter(this.lesson.tc_lens_timeline ?? [], this.currentTime));
          this.bridge = new TcLensHostBridge(this.lessonId, this.lesson.tc_lens_timeline ?? [],
            message => this.appFrame()?.nativeElement.contentWindow?.postMessage(message, TC_APP_ORIGIN),
            message => this.status.set(message), text => this.askTutor(text));
          if (this.frameLoaded) this.bridge.markReady();
          this.connection?.sync();
          if (this.receivedPlayback) { this.bridge.open(this.currentTime, this.startTime); this.opened = true; }
          this.loadTutor();
        },
        error: () => this.status.set('The lesson data could not be loaded. Reload the page to retry.'),
      });
    });
  }
  private positiveId(key: string, fallback: number): number {
    const value = Number(this.route.snapshot.queryParamMap.get(key));
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  }
  private embeddedVideoUrl(): string {
    const query = new URLSearchParams();
    for (const key of this.route.snapshot.queryParamMap.keys) {
      if (!['courseId', 'lessonId', 'layout', 'tcLensHost'].includes(key)) query.set(key, this.route.snapshot.queryParamMap.get(key)!);
    }
    if (!query.has('level')) query.set('level', 'beginner');
    query.set('tcLensHost', 'workspace');
    return `/courses/${this.courseId}/lessons/${this.lessonId}?${query}`;
  }
  protected appLoaded(): void { this.frameLoaded = true; this.appReady.set(true); this.connection?.loaded(); }
  protected openLogin(): void { this.authModal.open('login'); }
  protected logout(): void { this.visitor.logout(); }
  protected exitWorkspace(): void {
    if (this.exiting()) return;
    this.exiting.set(true);
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300;
    window.setTimeout(() => {
      window.location.assign(workspaceExitUrl(this.courseId, this.lessonId, this.currentTime, this.route.snapshot.queryParams));
    }, delay);
  }
  protected loadTutor(): void {
    this.tutorError.set(false);
    const old = document.querySelector<HTMLScriptElement>('script[data-tc-tutor-loader]');
    if (old && old.dataset['state'] !== 'error') {
      if (old.dataset['state'] === 'loaded') queueMicrotask(() => this.bridge?.markTutorReady());
      return;
    }
    old?.remove();
    const script = document.createElement('script');
    script.type = 'module'; script.src = `${TC_APP_ORIGIN}/lens/v1/tutor.js`;
    script.dataset['tcTutorLoader'] = ''; script.dataset['state'] = 'loading';
    script.onload = () => { script.dataset['state'] = 'loaded'; this.bridge?.markTutorReady(); };
    script.onerror = () => { script.dataset['state'] = 'error'; this.tutorError.set(true); };
    document.head.appendChild(script);
  }
  private askTutor(text: string): boolean {
    const tutor = document.querySelector<TcTutorElement>('tc-tutor');
    if (!tutor || typeof tutor.ask !== 'function') return false;
    tutor.ask(text);
    return true;
  }
  private readonly onPlayback = (event: MessageEvent): void => {
    if (readWorkspaceClose(event, window.location.origin, this.videoFrame()?.nativeElement.contentWindow ?? null, this.lessonId)) {
      window.location.assign(`/courses/${this.courseId}`);
      return;
    }
    const candidate = Number(event.data?.videoId);
    if (candidate !== this.lessonId && this.knownLessonIds.has(candidate) &&
        readWorkspacePlayback(event, window.location.origin, this.videoFrame()?.nativeElement.contentWindow ?? null, candidate)) {
      // A user advanced the embedded player to another known lesson. Remount all panes together.
      const query = new URLSearchParams(window.location.search);
      query.set('courseId', String(this.courseId)); query.set('lessonId', String(candidate));
      query.delete('restart');
      window.location.assign(`/tc-lens-layout-01?${query}`);
      return;
    }
    const playback = readWorkspacePlayback(event, window.location.origin, this.videoFrame()?.nativeElement.contentWindow ?? null, this.lessonId);
    if (!playback) return;
    const previous = this.currentTime;
    if (!this.receivedPlayback || playback.state !== 'time') this.startTime = playback.currentTime === 0 && playback.state === 'ready' ? -1 : playback.currentTime;
    this.receivedPlayback = true;
    this.currentTime = playback.currentTime;
    this.chapter.set(currentTcChapter(this.lesson?.tc_lens_timeline ?? [], this.currentTime));
    if (!this.bridge) return;
    if (!this.opened) { this.bridge.open(this.currentTime, this.startTime); this.opened = true; }
    else if (playback.state !== 'time' || this.currentTime < previous) this.bridge.seek(this.currentTime);
    else this.bridge.advance(previous, this.currentTime);
  };
  ngOnDestroy(): void {
    window.removeEventListener('message', this.onPlayback);
    this.subscription?.unsubscribe(); this.connection?.dispose(); this.bridge?.dispose();
  }
}

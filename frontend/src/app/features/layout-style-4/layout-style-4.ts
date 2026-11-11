import { CourseOverview } from '../../core/course-overview';
import { ChangeDetectorRef, Component, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { LayoutStyle3Page } from '../layout-style-3/layout-style-3';
import { Course } from '../../core/models';

/** Alternate presentation with the existing catalog and course actions. */
@Component({
  selector: 'app-layout-style-4',
  imports: [CourseOverview],
  templateUrl: './layout-style-4.html',
  styleUrl: './layout-style-4.scss'
})
export class LayoutStyle4Page extends LayoutStyle3Page {
  protected override readonly featuredItems = computed(() => this.courses()
    .filter(course => course.title.toLowerCase().includes('top gun') || course.title.toLowerCase() === 'mastering the greeks')
    .filter((course, index, all) => all.findIndex(candidate => candidate.id === course.id) === index)
    .sort((a, b) => Number(b.title.toLowerCase().includes('top gun')) - Number(a.title.toLowerCase().includes('top gun'))));

  constructor() {
    super();
    effect(() => {
      const items = this.featuredItems();
      if (!items.length) return;
      const index = items.findIndex(item => item.id === this.featured()?.id);
      if (index < 0) {
        this.featuredIndex.set(items.length - 1);
        super.selectFeatured(1);
      } else if (this.featuredIndex() !== index) {
        this.featuredIndex.set(index);
      }
    });
  }

  protected titleArtwork(course: Course): string | null {
    return course.title_image || this.previewArtwork(course, 'title.png');
  }

  protected override featuredImageUrl(course: Course): string {
    return course.landing_background || this.previewArtwork(course, 'background.jpg') || super.featuredImageUrl(course);
  }

  private previewArtwork(course: Course, suffix: string): string | null {
    const name = course.title.toLowerCase();
    const key = name.includes('top gun') ? 'top-gun'
      : name === 'mastering the greeks' ? 'mastering-the-greeks' : null;
    return key ? `/layout-style-4/${key}-${suffix}` : null;
  }

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly coverTransitioning = signal(false);
  private motion: Animation[] = [];
  private layers: HTMLElement[] = [];
  private motionGeneration = 0;
  protected readonly coverItems = computed(() => {
    const items = this.featuredItems();
    return Array.from({ length: Math.max(0, items.length - 1) }, (_, offset) => {
      const index = (this.featuredIndex() + offset + 1) % items.length;
      return { item: items[index], index };
    });
  });

  protected chooseCover(index: number): void {
    if (this.coverTransitioning() || index === this.featuredIndex()) return;
    this.transitionToCover(index);
  }

  protected override selectFeatured(direction: number): void {
    const count = this.featuredItems().length;
    if (count < 2 || this.coverTransitioning()) return;
    this.transitionToCover((this.featuredIndex() + (direction > 0 ? 1 : -1) + count) % count);
  }

  private transitionToCover(index: number): void {
    const root = this.host.nativeElement;
    const course = this.featuredItems()[index];
    if (!course) return;
    const selectedCard = root.querySelector<HTMLElement>(`[data-cover-id="${course.id}"]`);
    const selectedRect = selectedCard?.getBoundingClientRect();
    // Previous wraps to the end of the list; use the visible cover slot as
    // its origin rather than sending an offscreen card across the entire list.
    const card = selectedRect && selectedRect.left < window.innerWidth && selectedRect.right > 0
      ? selectedCard : root.querySelector<HTMLElement>('[data-cover-id]');
    const sourceTitle = card?.querySelector<HTMLElement>('.cover-slider__title-layer');
    const cardRect = card?.getBoundingClientRect();
    const sourceTitleRect = sourceTitle?.getBoundingClientRect();
    const previousRects = new Map(Array.from(root.querySelectorAll<HTMLElement>('[data-cover-id]'))
      .map(element => [element.dataset['coverId'], element.getBoundingClientRect()]));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduced) {
      const oldBackground = root.querySelector<HTMLElement>('.style-featured__background');
      if (oldBackground) {
        const rect = oldBackground.getBoundingClientRect();
        const oldLayer = oldBackground.cloneNode(true) as HTMLElement;
        oldLayer.querySelector('button')?.remove();
        oldLayer.setAttribute('aria-hidden', 'true');
        Object.assign(oldLayer.style, {
          position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`,
          width: `${rect.width}px`, height: `${rect.height}px`,
          zIndex: '1', pointerEvents: 'none'
        });
        root.append(oldLayer);
        this.layers.push(oldLayer);
      }
    }

    // Keep the existing selector responsible for detail loading and language state.
    this.featuredIndex.set((index - 1 + this.featuredItems().length) % this.featuredItems().length);
    super.selectFeatured(1);
    this.coverTransitioning.set(!reduced);
    this.changeDetector.detectChanges();
    if (reduced) return;

    const generation = ++this.motionGeneration;
    const background = root.querySelector<HTMLElement>('.style-featured__background');
    const title = root.querySelector<HTMLElement>('#style-featured-title');
    const easing = 'cubic-bezier(0.23, 1, 0.32, 1)';
    const expansionDuration = 1100;
    const entranceDuration = 500;
    const contentRevealDuration = 1900;
    const contentRevealEasing = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const buttonStagger = 100;
    const startTime = document.timeline.currentTime;
    const animate = (element: HTMLElement, frames: Keyframe[], duration: number, delay = 0, curve = easing) => {
      const animation = element.animate(frames, { duration, delay, easing: curve, fill: 'both' });
      // All tracks share one clock; only individual buttons have a delay.
      animation.startTime = startTime;
      this.motion.push(animation);
      return animation;
    };

    if (cardRect && background) {
      const target = background.getBoundingClientRect();
      const layer = document.createElement('div');
      Object.assign(layer.style, {
        position: 'fixed', left: `${target.left}px`, top: `${target.top}px`,
        width: `${target.width}px`, height: `${target.height}px`,
        overflow: 'hidden', pointerEvents: 'none', zIndex: '2',
        background: '#0c0d0d'
      });
      const image = document.createElement('img');
      image.src = this.featuredImageUrl(course);
      image.alt = '';
      const heroImage = background.querySelector('img');
      const heroImageStyle = heroImage ? getComputedStyle(heroImage) : null;
      Object.assign(image.style, {
        width: '100%', height: '100%', objectFit: 'cover',
        objectPosition: heroImageStyle?.objectPosition ?? 'center top',
        filter: heroImageStyle?.filter ?? 'none'
      });
      layer.append(image);
      const shade = document.createElement('div');
      Object.assign(shade.style, {
        position: 'absolute', inset: '0',
        background: getComputedStyle(background, '::after').background
      });
      layer.append(shade);
      root.append(layer);
      this.layers.push(layer);
      animate(layer, [
        { left: `${cardRect.left}px`, top: `${cardRect.top}px`, width: `${cardRect.width}px`, height: `${cardRect.height}px`, borderRadius: '9.5px' },
        { left: `${target.left}px`, top: `${target.top}px`, width: `${target.width}px`, height: `${target.height}px`, borderRadius: '0' }
      ], expansionDuration);
      animate(shade, [{ opacity: 0 }, { opacity: 1 }], expansionDuration);
    }

    if (title && sourceTitleRect) {
      const target = title.getBoundingClientRect();
      const layer = title.cloneNode(true) as HTMLElement;
      layer.removeAttribute('id');
      layer.setAttribute('aria-hidden', 'true');
      Object.assign(layer.style, {
        position: 'fixed', left: `${target.left}px`, top: `${target.top}px`,
        width: `${target.width}px`, height: `${target.height}px`, margin: '0',
        transformOrigin: 'top left', pointerEvents: 'none', zIndex: '5', visibility: 'visible'
      });
      root.append(layer);
      this.layers.push(layer);
      const scale = sourceTitleRect.width / target.width;
      animate(layer, [
        { transform: `translate(${sourceTitleRect.left - target.left}px, ${sourceTitleRect.top - target.top}px) scale(${scale})` },
        { transform: 'none' }
      ], expansionDuration);
    }

    for (const element of root.querySelectorAll<HTMLElement>('[data-cover-id]')) {
      const previous = previousRects.get(element.dataset['coverId']);
      const current = element.getBoundingClientRect();
      const step = current.width + 32;
      const delta = previous ? Math.max(-step, Math.min(step, previous.left - current.left)) : step;
      animate(element, [{ transform: `translateX(${delta}px)`, opacity: previous ? 1 : 0 }, { transform: 'none', opacity: 1 }], expansionDuration);
    }
    // Fixed masks reveal the badges and description as their contents rise.
    // These begin with the FIRST button, not after the button sequence.
    for (const element of root.querySelectorAll<HTMLElement>(
      '.style-featured__meta-primary, .style-featured__details > *'
    )) {
      animate(element, [
        { transform: 'translateY(48px)', clipPath: 'inset(100% 0 0 0)', opacity: 0 },
        { transform: 'none', clipPath: 'inset(0% 0 0 0)', opacity: 1 }
      ], contentRevealDuration, 0, contentRevealEasing);
    }
    Array.from(root.querySelectorAll<HTMLElement>('.style-featured__actions > *')).forEach((element, order) => {
      const distance = Math.max(48, window.innerHeight - element.getBoundingClientRect().top + 24);
      animate(element, [
        { transform: `translateY(${distance}px)`, opacity: 0 },
        { transform: 'none', opacity: 1 }
      ], entranceDuration, order * buttonStagger);
    });
    void Promise.all(this.motion.map(animation => animation.finished.catch(() => undefined))).then(() => {
      if (generation === this.motionGeneration) {
        // Reveal the real heading in the DOM before removing its flying copy.
        // A signal update alone can leave a paint with neither title visible.
        this.coverTransitioning.set(false);
        this.changeDetector.detectChanges();
        this.clearCoverMotion();
      }
    });
  }

  private clearCoverMotion(): void {
    this.motionGeneration++;
    this.motion.forEach(animation => animation.cancel());
    this.layers.forEach(layer => layer.remove());
    this.motion = [];
    this.layers = [];
    this.coverTransitioning.set(false);
  }

  override ngOnDestroy(): void {
    this.clearCoverMotion();
    super.ngOnDestroy();
  }
}

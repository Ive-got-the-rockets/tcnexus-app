/** Adds touch reveal behavior without replacing Plyr's volume/mute bindings. */
export function enhanceVolumeControl(group: HTMLElement): () => void {
  group.classList.add('tcn-volume-control');
  const doc = group.ownerDocument;
  const slider = group.querySelector<HTMLInputElement>('input[data-plyr="volume"]');
  const mask = slider ? doc.createElement('div') : null;
  if (mask && slider) {
    mask.className = 'tcn-volume-mask';
    slider.replaceWith(mask);
    mask.appendChild(slider);
  }
  const onClick = (event: MouseEvent): void => {
    const target = event.target as Element;
    if ((event as PointerEvent).pointerType !== 'touch' || !target.closest('[data-plyr="mute"]') || !group.querySelector('[data-plyr="volume"]')) return;
    if (!group.classList.contains('is-expanded')) {
      group.classList.add('is-expanded');
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const onOutside = (event: Event): void => {
    if (!group.contains(event.target as Node)) {
      group.classList.remove('is-expanded');
      // Touch can leave focus on the button after tapping elsewhere.
      if (group.contains(doc.activeElement)) (doc.activeElement as HTMLElement).blur();
    }
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    group.classList.remove('is-expanded');
    (doc.activeElement as HTMLElement | null)?.blur();
  };
  group.addEventListener('click', onClick, true);
  group.addEventListener('keydown', onKeyDown);
  doc.addEventListener('pointerdown', onOutside);
  return () => {
    group.removeEventListener('click', onClick, true);
    group.removeEventListener('keydown', onKeyDown);
    doc.removeEventListener('pointerdown', onOutside);
    group.classList.remove('is-expanded');
    if (mask && slider) mask.replaceWith(slider);
  };
}

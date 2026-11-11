// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { enhanceVolumeControl } from './volume-control';

describe('expandable volume control', () => {
  it('reveals the slider on first touch without muting, then allows mute on the next tap', () => {
    const group = document.createElement('div');
    group.innerHTML = '<button data-plyr="mute">Mute</button><input type="range" data-plyr="volume">';
    document.body.append(group);
    const button = group.querySelector('button')!;
    const mute = vi.fn();
    button.addEventListener('click', mute);
    const cleanup = enhanceVolumeControl(group);
    const tap = () => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      button.dispatchEvent(event);
    };
    tap();
    expect(group.classList.contains('is-expanded')).toBe(true);
    expect(mute).not.toHaveBeenCalled();
    tap();
    expect(mute).toHaveBeenCalledOnce();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(group.classList.contains('is-expanded')).toBe(false);
    cleanup();
    group.remove();
  });

  it('leaves desktop mute working and removes handlers during cleanup', () => {
    const group = document.createElement('div');
    group.innerHTML = '<button data-plyr="mute">Mute</button><input type="range" data-plyr="volume">';
    const mute = vi.fn();
    group.querySelector('button')!.addEventListener('click', mute);
    const cleanup = enhanceVolumeControl(group);
    group.querySelector('button')!.click();
    expect(mute).toHaveBeenCalledOnce();
    cleanup();
    expect(group.classList.contains('is-expanded')).toBe(false);
  });
});

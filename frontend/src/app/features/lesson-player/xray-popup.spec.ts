// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { launchXrayPopup } from './xray-popup';

describe('launchXrayPopup', () => {
  it('opens a resizable host window with the app embedded below a dock-back header', () => {
    const popup = { opener: window, document: document.implementation.createHTMLDocument(), close: vi.fn() } as unknown as Window;
    const openWindow = vi.fn(() => popup);

    const result = launchXrayPopup('https://app.tradecheetah.com', openWindow);

    expect(openWindow).toHaveBeenCalledWith(
      '',
      '_blank',
      'popup=yes,width=1100,height=800,resizable=yes,scrollbars=yes'
    );
    expect(popup.opener).toBeNull();
    expect(result).toBe(popup);
    expect(popup.document.title).toBe('TC Lens');
    expect(popup.document.querySelector('iframe')?.src).toBe('https://app.tradecheetah.com/');
    expect(popup.document.querySelector('header button')?.getAttribute('aria-label')).toBe('Dock back');
  });

  it('restores the docked panel before closing the separate window', () => {
    const order: string[] = [];
    const popup = {
      opener: window,
      document: document.implementation.createHTMLDocument(),
      close: vi.fn(() => order.push('close')),
    } as unknown as Window;
    launchXrayPopup('https://app.tradecheetah.com?videoId=42', () => popup, () => order.push('dock'));

    popup.document.querySelector<HTMLButtonElement>('button')!.click();

    expect(order).toEqual(['dock', 'close']);
    expect(popup.document.querySelector('iframe')?.src).toContain('videoId=42');
  });

  it('returns null when the browser blocks the popup', () => {
    const openWindow = vi.fn(() => null);

    expect(launchXrayPopup('https://app.tradecheetah.com', openWindow)).toBeNull();
  });
});

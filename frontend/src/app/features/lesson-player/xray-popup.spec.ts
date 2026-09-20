import { describe, expect, it, vi } from 'vitest';

import { launchXrayPopup } from './xray-popup';

describe('launchXrayPopup', () => {
  it('opens the TC app in a separate resizable popup and clears its opener reference', () => {
    const popup = { opener: window } as Window;
    const openWindow = vi.fn(() => popup);

    const result = launchXrayPopup('https://app.tradecheetah.com', openWindow);

    expect(openWindow).toHaveBeenCalledWith(
      'https://app.tradecheetah.com',
      '_blank',
      'popup=yes,width=1100,height=800,resizable=yes,scrollbars=yes'
    );
    expect(popup.opener).toBeNull();
    expect(result).toBe(popup);
  });

  it('returns null when the browser blocks the popup', () => {
    const openWindow = vi.fn(() => null);

    expect(launchXrayPopup('https://app.tradecheetah.com', openWindow)).toBeNull();
  });
});

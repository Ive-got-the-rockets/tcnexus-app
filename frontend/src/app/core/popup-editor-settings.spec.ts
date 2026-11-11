import { describe, it, expect } from 'vitest';
import { DEFAULT_POPUP_EDITOR, normalizePopupEditor } from './popup-editor-settings';
import { normalizeRegistrationSettings } from './registration-settings';

describe('saved popup editor settings', () => {
  it('uses the approved two-stage design before settings have been saved', () => {
    expect(normalizePopupEditor(undefined)).toEqual(DEFAULT_POPUP_EDITOR);
  });
  it('keeps saved copy, image, discounts and timings in the API settings', () => {
    const editor = { heading: 'A new heading', image: 'https://example.com/background.png', annual: 55, episodes: 23, creatingMs: 600 };
    expect(normalizeRegistrationSettings({ editor }).editor).toMatchObject(editor);
  });
  it('rejects invalid image protocols and colors while bounding numeric settings', () => {
    const result = normalizePopupEditor({ image: 'javascript:alert(1)', shine: 'red; background:url(x)', width: 9000, offerOpacity: 500, bodySize: 1, creatingMs: -1, episodes: 2.5 });
    expect(result).toMatchObject({ image: DEFAULT_POPUP_EDITOR.image, shine: DEFAULT_POPUP_EDITOR.shine, width: 1200, offerOpacity: 100, bodySize: 10, creatingMs: 100, episodes: 2 });
  });
  it('does not accept an invalid runtime field type or non-finite number', () => {
    expect(normalizePopupEditor({ annual: NaN, episodes: '30' } as never).episodes).toBe(15);
    expect(normalizePopupEditor({ annual: NaN }).annual).toBe(60);
  });
});

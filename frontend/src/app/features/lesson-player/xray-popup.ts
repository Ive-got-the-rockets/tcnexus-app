export type PopupOpener = (url?: string | URL, target?: string, features?: string) => Window | null;

/** Opens a host-controlled popup; call directly from a user click. */
export function launchXrayPopup(url: string, openWindow: PopupOpener, onDockBack: () => void = () => {}): Window | null {
  // Keep the outer document on our origin so it can own the return control.
  // The external app stays isolated inside its own iframe.
  const popup = openWindow('', '_blank', 'popup=yes,width=1100,height=800,resizable=yes,scrollbars=yes');
  if (!popup) return null;
  popup.opener = null;
  const doc = popup.document;
  doc.title = 'TC Lens';
  doc.documentElement.lang = 'en';
  const viewport = doc.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1';
  const style = doc.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body { display: flex; flex-direction: column; background: #0b0d0c; color: #f4f1e9; font: 13px system-ui, sans-serif; color-scheme: dark; }
    header { display: flex; align-items: center; justify-content: space-between; flex: 0 0 28px; padding: 0 10px 0 14px; background: #141715; border-bottom: 1px solid #f4f1e91f; }
    header span { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
    button { display: grid; place-items: center; width: 26px; height: 26px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: inherit; cursor: pointer; }
    button:hover { background: #f4f1e91f; color: #c7ff5c; }
    button:focus-visible { outline: 2px solid #c7ff5c; outline-offset: 2px; }
    button svg { width: 18px; height: 18px; }
    iframe { display: block; width: 100%; flex: 1; min-height: 0; border: 0; background: #0b0d0c; }
  `;
  doc.head.append(viewport, style);
  const header = doc.createElement('header');
  const title = doc.createElement('span');
  title.textContent = 'TC Lens';
  const dock = doc.createElement('button');
  dock.type = 'button';
  dock.title = 'Dock back';
  dock.setAttribute('aria-label', 'Dock back');
  dock.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/><path d="M21 3l-9 9M12 6v6h6"/></svg>';
  dock.addEventListener('click', () => {
    onDockBack();
    popup.close();
  });
  const frame = doc.createElement('iframe');
  frame.title = 'TC Lens app';
  frame.src = url;
  header.append(title, dock);
  doc.body.replaceChildren(header, frame);
  return popup;
}

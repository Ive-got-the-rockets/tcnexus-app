export type PopupOpener = (url?: string | URL, target?: string, features?: string) => Window | null;

/** Opens the TC app in a browser-managed popup; call directly from a user click. */
export function launchXrayPopup(url: string, openWindow: PopupOpener): Window | null {
  const popup = openWindow(url, '_blank', 'popup=yes,width=1100,height=800,resizable=yes,scrollbars=yes');
  if (popup) popup.opener = null;
  return popup;
}

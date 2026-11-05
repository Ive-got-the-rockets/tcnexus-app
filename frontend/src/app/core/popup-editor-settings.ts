// Shared field names with the WordPress popup editor schema.
export const DEFAULT_POPUP_EDITOR = {
  "image": "/auth/neon-cheetah.png",
  "fit": "contain",
  "width": 800,
  "firstOpacity": 70,
  "coverage": 65,
  "offerOpacity": 85,
  "heading": "The best is yet to play",
  "reassurance": "No credit card required. Your company is quite enough.",
  "intro": "Your next {episodes} episodes are on us. Just add your name and email.",
  "episodes": 15,
  "name": "Your name",
  "email": "you@example.com",
  "curious": "Stay curious. We insist.",
  "freeButton": "Keep Watching Free",
  "privacy": "We will only email when new freebie episodes are out. Your inbox has suffered enough.",
  "creating": "Creating profile…",
  "created": "Profile created",
  "transition": "Have you got somewhere better to be, or shall we keep going?",
  "creatingMs": 1200,
  "successMs": 900,
  "transitionMs": 2300,
  "offerHeading": "Your curiosity has negotiated a better price!",
  "savings": "Save {annual}% when you pay for the year, or {monthly}% when you pay monthly.",
  "annual": 60,
  "monthly": 40,
  "perks": "Plus perks that stay with you:",
  "perk1": "{membership}% off a TradeCheetah membership",
  "membership": 20,
  "perk2": "{store}% off the TradeCheetah Store",
  "store": 30,
  "duration": "Yours for as long as you're a TCNexus.tv member.",
  "reward": "Reward My Curiosity",
  "dismiss": "No thanks, keep watching free",
  "restraint": "Restraint is admirable. Only occasionally.",
  "bodySize": 18,
  "discountSize": 22,
  "footerSize": 12,
  "textColor": "#ffffff",
  "cyan": "#00cce6",
  "shine": "#ff00ff",
  "shimmer": true
};
export type PopupEditorSettings = typeof DEFAULT_POPUP_EDITOR;

export function normalizePopupEditor(input: Partial<PopupEditorSettings> | null | undefined): PopupEditorSettings {
  const result = { ...DEFAULT_POPUP_EDITOR };
  if (!input || typeof input !== 'object') return result;
  for (const key of Object.keys(result) as (keyof PopupEditorSettings)[]) {
    const value = input[key];
    const fallback = result[key];
    if (typeof value === typeof fallback && (typeof value !== 'number' || Number.isFinite(value))) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  result.width = Math.min(1200, Math.max(320, result.width));
  for (const key of ['firstOpacity', 'coverage', 'offerOpacity', 'annual', 'monthly', 'membership', 'store'] as const) result[key] = Math.min(100, Math.max(0, result[key]));
  for (const key of ['bodySize', 'discountSize', 'footerSize'] as const) result[key] = Math.min(48, Math.max(10, result[key]));
  for (const key of ['creatingMs', 'successMs', 'transitionMs'] as const) result[key] = Math.min(10000, Math.max(100, result[key]));
  result.episodes = Math.max(0, Math.floor(result.episodes));
  result.fit = result.fit === 'cover' ? 'cover' : 'contain';
  for (const key of ['textColor', 'cyan', 'shine'] as const) if (!/^#[0-9a-f]{6}$/i.test(result[key])) result[key] = DEFAULT_POPUP_EDITOR[key];
  if (!/^(https?:\/\/|\/(?!\/))/i.test(result.image)) result.image = DEFAULT_POPUP_EDITOR.image;
  return result;
}

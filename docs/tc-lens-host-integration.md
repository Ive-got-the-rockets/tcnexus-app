# TC Lens host integration

The active player follows `TC Lens Stuff/tradecheetah-embed-guide.md` using direct iframe postMessage. No SDK is required for AI prompts. The app URL is https://app.tradecheetah.com with the WordPress lesson ID in videoId.

## Outgoing prompt

```json
{
  "type": "tc-lens-time-update",
  "videoId": "35",
  "chapter": "cue-1",
  "message": "Explain this trade and its risks.\n\nTrade context: ...",
  "workflow": "ask"
}
```

The host resolves CMS timestamps; the app does not track the video clock. Both LLM and trade cues use read-only ask. Structured scene, learning-level and trade fields become text in message. Existing free-text prompts are preserved. No unsupported session, seek, state-sync or trade-data messages are sent. The optional operate mode and navigation SDK are not enabled by this integration.

## Trade editor handoff note for Arun (2026-10-22)

Diego requested that we retain this explanation for a later handoff to Arun. The approved trade editor has a manual ticker, shares, Stock/Crypto (Stock default), underlying price, and repeatable Call/Put option rows with action, contracts, strike, expiry and premium. Styling, chevrons and the custom calendar do not change delivery or date storage.

- Ticker maps to `data.underlying`; Stock/Crypto to `data.assetType` (`stock` or `crypto`).
- Shares map to `data.quantity`; underlying price maps to `data.entryPrice`.
- Options map to `data.legs[]`: `side` (`call`/`put`), `action` (`buy_to_open`, `sell_to_open`, `buy_to_close`, `sell_to_close`), `quantity` (contracts), `strike`, `expiration` (`YYYY-MM-DD`), and `entryPrice` (premium).
- Lesson assumptions map to `data.assumptions`. Older strategy, strikes and top-level expiration context is retained for existing lessons.
- These are the editor's structured trade fields. On the active wire path they are JSON-stringified inside the **text `message`**, after `Trade context:`. They are **not** new top-level postMessage fields or a separate structured trade event.
- The envelope remains `{ type: 'tc-lens-time-update', videoId: '<lesson ID>', chapter: '<unique cue label>', message: '<prompt and trade context>', workflow: 'ask' }`, sent directly to the TradeCheetah iframe with `postMessage`.
- Local row behavior and PHP form round-trip checks pass. Live interpretation of asset type, explicit open/close actions and premiums by Arun's app still needs an end-to-end check; do not claim it is confirmed.

## Replies and delivery details

Only trust messages with the exact app origin and the embedded frame as source. Replies have type tc-lens-ack, echoed videoId/chapter and state running, finished, rejected or error. The host sends one prompt, waits through running, and releases the next only after finished. Rejected/error replies clear queued work, stop further automatic delivery and show reason in the panel. Close and reopen the panel after resolving a failure to resume future cues.

The unique chapter identifies each request; it is not a timestamp. Invalid or unrelated replies are ignored. A 90-second missing reply shows a connection/sign-in message and leaves the queue blocked, because the remote request could still be running. A subsequent matching completion can resume it. Never retry an action based only on elapsed time.

## Player lifecycle

Iframe load is the available readiness signal; Arun's guide specifies no ready handshake. Opening at a timestamp sends cues at exactly that timestamp and active trade cues. Ordinary forward playback sends newly crossed cues in timestamp order, once per panel session. Seeking clears unsent queued work and does not replay old LLM answers; an unsent active trade cue at the destination can be sent. Closing drops queued work but does not cancel the remote request. Reopening waits for any in-flight request before sending new work. Switching lessons disposes the bridge and loads the new iframe URL.

## Live prerequisites

The viewer must sign in inside the frame according to the supplied guide. Arun's email confirms that only https://dev.tcnexus.tv is allowlisted; localhost and other domains require him to add their origins. His email says the app integration will go live with his next deploy, so wait for his deployment confirmation before expecting live replies. The guide does not specify a listener-ready event, an authentication-ready event or cancellation. The local fixture verifies the documented message shape and acknowledgements; it does not verify live login or remote AI behavior.

Historical structured protocol helpers remain in the source, but are not used by the active host bridge.

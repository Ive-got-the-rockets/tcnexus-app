# TC Lens v1 Design

## Goal

Add the first TC Lens backend capability: one editable AI message per episode, exposed through the existing custom WordPress backend and available to the streaming player when TC Lens opens.

## Scope

TC Lens v1 includes:

- An episode-level editable TC Lens message in the existing WordPress admin episode editor.
- Persistence using the existing custom WordPress plugin and post-meta storage.
- A public REST response that exposes the TC Lens message for an episode.
- A frontend handoff that opens Arun's TC Lens app with the episode/video ID in the URL.
- A frontend payload shape reserved for sending the editable message to the TC Lens iframe.

TC Lens v1 does not include:

- Playback timestamps or `currentTime`.
- Timeline entries or start/end ranges.
- Reusable people, companies, products, or entity libraries.
- A separate TC Lens database or ACF.
- AI generation inside the TC Nexus backend.

## Architecture

The existing WordPress plugin remains the source of truth. Each `tc_lesson` stores one sanitized text value in custom post meta. The existing lesson REST formatter returns that value as `tc_lens_message`, and the existing Angular lesson model consumes it.

When the player opens TC Lens, it loads the configured TC Lens URL with the lesson ID as `videoId`. The message is available in the lesson data and is kept as a separate payload field so the eventual iframe `postMessage` bridge can be added without changing the backend contract.

The fixed payload shape is:

```json
{
  "type": "tc-lens-time-update",
  "videoId": "123",
  "message": "Editable episode-specific AI prompt"
}
```

The legacy `type` value is retained exactly as Arun supplied it, even though no timestamp is included, to avoid inventing a new protocol before confirming the iframe transport with him.

## Data flow

1. An administrator opens an episode in the existing TC Nexus episode editor.
2. The administrator edits the TC Lens message and saves the episode.
3. WordPress stores the message on the `tc_lesson` post.
4. `GET /wp-json/tcnexus/v1/lessons/{id}` returns `tc_lens_message`.
5. Angular loads the lesson and retains the message.
6. Opening TC Lens loads the app URL with `videoId={lesson.id}`.
7. The future iframe bridge can send the lesson ID and message to Arun's app once the transport is confirmed.

## Validation and errors

- The admin field is optional; an empty value is stored as an empty string and produces an empty message in the API.
- Input is sanitized as plain text on save; the API returns text, not executable markup.
- A missing lesson continues to use the existing 404 response.
- If no TC Lens message exists, the player still opens TC Lens with the video ID and the app can display its own empty state.
- The frontend must not block video playback if the message is empty or unavailable.

## Testing

- WordPress tests cover saving and returning the episode-level TC Lens message.
- Angular tests cover the lesson model/API mapping and the TC Lens URL containing the lesson ID.
- Existing frontend and plugin tests must remain passing.
- The iframe transport is intentionally not finalized or implemented until Arun confirms how he wants the payload delivered.

## Future extension point

If TC Lens later needs multiple messages or time-aware context, the current single `tc_lens_message` field can be replaced or supplemented by a dedicated data model without changing the basic episode ID handoff.

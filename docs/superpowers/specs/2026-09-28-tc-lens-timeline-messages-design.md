# TC Lens Timeline Messages Design

## Goal

Replace the current single TC Lens message field in the lesson/episode creator with a repeatable timeline of free-text messages. Each message can target either the LLM or trade-data processing and can be scheduled at a single video time or across a start/end range.

The new editor is placed below the existing guest section in the expanded lesson editor.

## Decisions

- Use one mixed timeline per lesson rather than separate LLM and trade lists.
- Each timeline row has a message type: `llm` or `trade`.
- Both message types use a free-text message field for now.
- Start time is required and entered in `mm:ss` format.
- End time is optional and entered in `mm:ss` format.
- A row without an end time is a single-time event.
- A row with an end time fires once when playback reaches its start and carries the full range.
- Events are independent, so multiple rows may share the same start time or overlap in their ranges.
- Existing single `tc_lens_message` values are not migrated. The project is intentionally starting over with the new timeline field.
- The WordPress lesson ID remains the TC Lens `videoId`; it is not the Vimeo video ID.

## User experience

The current single TC Lens message field is removed from the lesson editor. Below the guest selector and selected guests, the editor shows a `TC Lens timeline` section.

Each row contains:

1. Message type selector: `LLM` or `Trade data`.
2. Start time input.
3. Optional end time input.
4. Free-text message textarea.
5. Remove control.

The section includes an `Add message` control. Empty timelines are valid. Validation prevents malformed times, negative times, and an end time earlier than the start time.

The same layout and behavior is used in both the course builder and global lessons editor.

## Data model

Store the timeline as one JSON array in lesson post meta. The normalized API representation is:

```json
[
  {
    "id": "event-1",
    "messageType": "llm",
    "message": "Explain the difference between a stock and an index.",
    "startTime": 30,
    "endTime": 120
  },
  {
    "id": "event-2",
    "messageType": "trade",
    "message": "Calculate a bullish breakout trade above resistance.",
    "startTime": 120,
    "endTime": null
  }
]
```

Times are stored as integer seconds. The admin converts `mm:ss` text to seconds before saving and converts seconds back to `mm:ss` when rendering. The row ID is a stable client/admin identifier used to prevent duplicate dispatches during one playback session; it is not a WordPress post ID.

Recommended WordPress meta key:

`_tcnexus_tc_lens_timeline`

The old `_tcnexus_tc_lens_message` field is no longer rendered or used by the new flow.

## API contract

The lesson endpoint returns a `tc_lens_timeline` array with normalized values. The frontend receives the timeline as lesson data and does not need to parse WordPress form data.

When a scheduled row fires, the frontend sends a postMessage to the TC Lens iframe using the existing Trade Cheetah origin. The proposed event is:

```json
{
  "type": "tc-lens-timeline-event",
  "videoId": "35",
  "messageType": "trade",
  "message": "Calculate a bullish breakout trade above resistance.",
  "startTime": 120,
  "endTime": null,
  "eventId": "event-2"
}
```

The `videoId` is the WordPress lesson ID. The `messageType` allows Arun's app to route `llm` and `trade` messages differently. The message remains free text so no new structured trade-data contract is required at this stage.

## Playback behavior

The lesson player observes video playback time and compares it against unsent timeline rows. When playback crosses a row's `startTime`, the row is sent once for that playback session. The event includes `endTime` when present, but the frontend does not repeatedly send updates while playback remains in the range.

The dispatch state resets when a different lesson loads or when the current lesson video is restarted from the beginning. Seeking backward should allow a previously fired row to fire again only after the playback session is explicitly restarted/reloaded; this avoids duplicate messages caused by normal seeking. This behavior should be covered by tests and can be adjusted later if Arun needs seek-aware replay.

Rows with the same start time are all dispatched independently. A row firing does not block another row, including one of the other message type.

## Validation and safety

- Sanitize message text as textarea content in WordPress.
- Accept only `llm` and `trade` message types.
- Normalize invalid or missing times to safe values and omit invalid rows from the API.
- Require `startTime >= 0`.
- Allow `endTime` to be null; otherwise require `endTime >= startTime`.
- Do not send empty messages.
- Escape all admin-rendered values and validate the JSON shape on save and API output.

## Out of scope

- Structured trade fields such as symbol, entry, stop loss, and target.
- Repeated messages while a range is active.
- Changes to Arun's application or Trade Cheetah's internal calculations.
- Timestamp-based behavior in the current legacy single-message contract.

## Acceptance criteria

- An editor can add, edit, reorder if supported by the existing UI, and remove mixed LLM/trade rows below guests.
- A lesson can save and reload single-time and ranged rows without losing data.
- The REST API returns normalized `tc_lens_timeline` data.
- The player sends each due row once with the correct lesson ID, message type, message, start, end, and row ID.
- Simultaneous LLM and trade rows both dispatch.
- Existing legacy `tc_lens_message` values do not populate the new timeline.
- Course builder and global lessons use the same timeline behavior.
- Focused unit tests and the frontend build pass.

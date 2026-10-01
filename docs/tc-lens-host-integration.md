# TC Lens host integration contract

The TC Nexus frontend owns the lesson timeline, session lifecycle, responsive video/iframe layout, and delivery of timestamped cues. Arun’s app owns the simulator, LLM calls, chat rendering, and learning-state UI.

## Message envelope

Every message from the host includes:

```json
{
  "protocolVersion": 1,
  "lessonId": "35",
  "sessionId": "uuid"
}
```

The receiver should validate `event.origin` against the approved TC Nexus origin and ignore unsupported protocol versions.

## Host-to-app messages

### Session start

```json
{
  "type": "tc-lens-session-start",
  "protocolVersion": 1,
  "lessonId": "35",
  "sessionId": "session-1",
  "currentTime": 160
}
```

Opening late does not replay old LLM answers.

### State sync

```json
{
  "type": "tc-lens-state-sync",
  "protocolVersion": 1,
  "lessonId": "35",
  "sessionId": "session-1",
  "currentTime": 160,
  "activeTradeCues": []
}
```

This is for reconstructing currently active trade state. It is not a request to replay historical LLM answers.

### Trade cue

```json
{
  "type": "tc-lens-trade-cue",
  "protocolVersion": 1,
  "lessonId": "35",
  "sessionId": "session-1",
  "sequence": 1,
  "eventId": "trade-1",
  "startTime": 120,
  "endTime": 180,
  "data": {
    "underlying": "SPY",
    "strategy": "Long Call",
    "legs": [],
    "strikes": ["500"],
    "expiration": "2026-12-18",
    "quantity": 1,
    "entryPrice": 3,
    "assumptions": "Learning and recalculation only."
  }
}
```

The app should load the example for inspection and recalculation. It must not place an order automatically.

### LLM cue

```json
{
  "type": "tc-lens-llm-cue",
  "protocolVersion": 1,
  "lessonId": "35",
  "sessionId": "session-1",
  "sequence": 2,
  "eventId": "llm-1",
  "startTime": 150,
  "endTime": null,
  "data": {
    "question": "Why does delta change here?",
    "sceneContext": "The underlying moves from 50 to 51.",
    "learningLevel": "beginner"
  }
}
```

The app should send the prepared question to its LLM and display the answer while retaining any existing trade and conversation state.

### Seek and close

`tc-lens-seek` tells the app to reconcile state at a new timestamp without replaying already delivered cues. `tc-lens-session-close` means automatic updates stop until a new session starts.

## App-to-host messages

The app may send `tc-lens-ready` after it has installed its message listener, and `tc-lens-ack` after accepting a cue. An acknowledgement must include the active `sessionId` and `eventId`.

## Current host-side guarantees

- Cues are authored and normalized in WordPress.
- Trade and LLM cues are separate event types.
- Cues are ordered by their scheduled timestamp and emitted once per session.
- Late opens state-sync active trades without replaying historical LLM answers.
- Backward and forward seeks do not duplicate already delivered events.
- Closing the panel stops the host scheduler.
- The responsive Layout 2 shell keeps the video, side frame, and bottom frame together.

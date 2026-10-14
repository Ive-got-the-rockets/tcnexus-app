# TC Lens guide alignment implementation plan

Goal: align the active host bridge with Arun's direct-message guide.
Architecture: preserve CMS scheduling, convert cues into text prompts and serialize delivery. Keep historical protocol helpers out of the active transport.

- [x] Write replacement bridge contract tests and confirm all seven fail against the old transport.
- [x] Add tc-lens-embed-protocol.ts for prompt conversion and implement bridge queue, reply matching and lifecycle.
- [x] Update lesson-player.ts to validate the frame source and display errors in an aria-live status element.
- [x] Update the receiver fixture and host integration documentation.
- [x] Run full unit and contract tests and Angular build, review the diff and report limitations. Final results: 69 unit tests and 43 contract tests passed; Angular build passed with a bundle-size warning. Live TradeCheetah login and embedding permissions remain unverified.

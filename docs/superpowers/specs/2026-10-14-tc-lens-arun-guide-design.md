# TC Lens guide alignment

Follow Arun's supplied guide with direct iframe postMessage and no navigation SDK. Keep CMS timeline fields. Convert scheduled LLM and trade cues into readable text prompts using read-only ask. The bridge owns timestamp selection, deduplication and serialized delivery. Replies are correlated by videoId and a plain unique chapter label. Validate source and origin.

Opening selects cues at the current timestamp and active trades. Seeking drops queued work without replaying earlier explanations. Closing drops queued work but cannot cancel a running request. Errors stop automatic delivery and appear in the panel; missing replies pause delivery rather than automatically retry. Use iframe load for readiness because no listener handshake is documented. Live login and host embedding permissions must be verified with Arun's service.

Validation covers prompt context, lifecycle, correlation, queue, errors, timeout and seeks, followed by full frontend tests and Angular build. Preserve unrelated workspace edits.

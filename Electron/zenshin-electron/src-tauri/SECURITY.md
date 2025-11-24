# Security Configuration Notes

## Content Security Policy (CSP)

### Current Configuration

In `tauri.conf.json`, CSP is currently disabled:
```json
"security": {
  "csp": null,
  "dangerousDisableAssetCspModification": true
}
```

### Rationale

This configuration is **temporary** and chosen for the following reasons:

1. **Incremental Migration**: The app is being migrated from Electron to Tauri. The frontend code still expects Electron's security model and may use inline scripts, eval(), or dynamic content loading.

2. **WebTorrent Compatibility**: The app uses WebTorrent which may require relaxed CSP for peer-to-peer connections and dynamic content loading.

3. **Video Streaming**: The media streaming functionality loads external video sources that may conflict with strict CSP rules.

### Security Mitigations

Even with CSP disabled, the app maintains security through:

1. **Rust Backend**: All system operations go through Rust, which provides type safety and memory safety.

2. **Permission System**: The `capabilities/default.json` file restricts what the frontend can do via explicit permissions.

3. **No eval() in Backend**: The Rust backend doesn't use dynamic code execution.

4. **Input Validation**: Command handlers validate inputs before processing.

### Future Improvements

**Phase 2 Actions** (after frontend migration):

1. Enable CSP with appropriate directives:
```json
"csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https:; media-src 'self' blob: https:"
```

2. Identify and fix CSP violations:
   - Replace inline scripts with external files
   - Use nonce or hash for necessary inline scripts
   - Configure proper sources for video streams

3. Test WebTorrent with CSP enabled:
   - May need `connect-src` to allow peer connections
   - May need `script-src 'unsafe-eval'` for WebTorrent internals

4. Set `dangerousDisableAssetCspModification: false`

### Recommendation

**Before production release**:
- [ ] Enable CSP with appropriate directives
- [ ] Test all functionality with CSP enabled
- [ ] Fix any CSP violations
- [ ] Monitor CSP reports in production

## Logging Configuration

### Current Setup

Logging is enabled in both debug and production builds (as of latest update):

```rust
// In lib.rs
.setup(|app| {
  app.handle().plugin(
    tauri_plugin_log::Builder::default()
      .level(if cfg!(debug_assertions) {
        log::LevelFilter::Info
      } else {
        log::LevelFilter::Warn  // Production: only warnings and errors
      })
      .build(),
  )?;
  Ok(())
})
```

### Logging Levels

- **Debug builds**: `Info` level - shows all informational messages
- **Production builds**: `Warn` level - only warnings and errors

### Future Enhancements

Consider adding:
1. Log file rotation
2. User-configurable log levels
3. Separate log files for different components
4. Crash reporting integration

## Permission System

The app uses Tauri's capability system (`capabilities/default.json`) which provides:

1. **Granular Control**: Only explicitly granted permissions are available
2. **Window Operations**: Limited to necessary window management
3. **File System**: Read/write access is explicitly granted per operation
4. **Network**: HTTP and WebSocket are allowed but controlled
5. **Shell Access**: Limited to opening URLs and running specific commands

This provides defense-in-depth even with relaxed CSP.

## Additional Security Considerations

1. **Deep Links**: The `zenshin://` protocol is registered but should validate all incoming URLs
2. **External Commands**: VLC and browser launching should sanitize input commands
3. **Settings Persistence**: Settings file should be validated on load
4. **WebSocket Connections**: Should implement authentication/authorization
5. **HTTP Requests**: Should validate and sanitize all external API responses

## References

- [Tauri Security Best Practices](https://v2.tauri.app/security/intro/)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Tauri Capability System](https://v2.tauri.app/security/capabilities/)

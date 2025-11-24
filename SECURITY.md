# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Ayoto, please report it responsibly.

### How to Report

**DO NOT** open a public issue for security vulnerabilities.

Instead:

1. **Email**: Send details to the maintainers (check repository for contact)
2. **GitHub Security**: Use GitHub's private vulnerability reporting feature
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 1 week
- **Fix**: Depends on severity
  - Critical: Within 48 hours
  - High: Within 1 week
  - Medium: Within 2 weeks
  - Low: Next release

### After Reporting

- We'll keep you informed of progress
- Credit will be given (if desired)
- Public disclosure after fix is released

## Security Best Practices

### For Users

1. **Download from official sources only**
   - GitHub Releases
   - Official website (if available)
   - Trusted package managers

2. **Verify checksums** (when available)
   ```bash
   sha256sum ayoto-installer.exe
   ```

3. **Keep updated**
   - Install security updates promptly
   - Enable auto-updates (when available)

4. **Be cautious with plugins**
   - Only install from trusted sources
   - Review plugin code if possible
   - Report suspicious plugins

5. **Protect your privacy**
   - Don't share personal info in bug reports
   - Use VPN if concerned about tracking

### For Developers

1. **Code Review**
   - Review all PRs for security issues
   - Use automated security scanning
   - Follow secure coding practices

2. **Dependencies**
   - Keep dependencies updated
   - Use `cargo audit` for Rust
   - Use `npm audit` for JavaScript
   - Review dependency changes

3. **Input Validation**
   - Validate all user inputs
   - Sanitize data before use
   - Prevent injection attacks

4. **API Security**
   - Use HTTPS for all external requests
   - Validate API responses
   - Implement rate limiting
   - Handle errors securely

5. **Plugin Security**
   - Validate plugin inputs
   - Sanitize plugin outputs
   - Consider sandboxing (future)
   - Document security requirements

## Known Security Considerations

### Current Implementation

1. **Plugin System**
   - Plugins run in app context
   - Trust-based security model
   - No sandboxing yet
   - **Mitigation**: Only use trusted plugins

2. **External APIs**
   - Depends on provider security
   - No built-in validation of stream URLs
   - **Mitigation**: Use reputable providers

3. **Miracast**
   - Network-based casting
   - No encryption by default
   - **Mitigation**: Use on trusted networks only

4. **Local Storage**
   - Settings stored locally
   - No encryption currently
   - **Mitigation**: Don't store sensitive data

### Planned Improvements

- [ ] Plugin sandboxing
- [ ] Content URL validation
- [ ] Encrypted local storage
- [ ] Secure Miracast protocols
- [ ] Auto-update with signature verification
- [ ] Security audit log

## Security Features

### Implemented

✅ No data collection or telemetry
✅ Local-only data storage
✅ HTTPS for external requests
✅ Input validation on backend
✅ Type-safe Rust backend
✅ Memory-safe implementation

### In Progress

🔨 Plugin security framework
🔨 Content validation
🔨 Secure casting protocols

### Planned

📋 Plugin sandboxing
📋 Encrypted preferences
📋 Auto-update security
📋 Security audit logging

## Common Vulnerabilities

### XSS (Cross-Site Scripting)
- **Risk**: Medium
- **Mitigation**: React's built-in escaping, input sanitization
- **Status**: Protected

### SQL Injection
- **Risk**: N/A (no database currently)
- **Mitigation**: Would use parameterized queries
- **Status**: N/A

### Path Traversal
- **Risk**: Low
- **Mitigation**: Input validation, restricted file access
- **Status**: Protected

### Code Injection
- **Risk**: Medium (via plugins)
- **Mitigation**: Plugin review, future sandboxing
- **Status**: Partially protected

### Man-in-the-Middle
- **Risk**: Medium (during casting)
- **Mitigation**: Use HTTPS, verify certificates
- **Status**: Partially protected

## Security Checklist for Contributors

Before submitting code:

- [ ] No hardcoded credentials
- [ ] Input validation implemented
- [ ] No SQL injection vulnerabilities
- [ ] HTTPS used for external requests
- [ ] User data properly sanitized
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies are up-to-date
- [ ] Code reviewed for security issues
- [ ] Tests include security scenarios
- [ ] Documentation updated

## Third-Party Dependencies

### Rust Dependencies
Monitor with: `cargo audit`

Key dependencies:
- `tauri` - Audited by Tauri Security Team
- `reqwest` - Popular, well-maintained
- `tokio` - Industry standard
- `serde` - Widely used, secure

### JavaScript Dependencies
Monitor with: `npm audit`

Key dependencies:
- `react` - Facebook maintained
- `@tauri-apps/api` - Official Tauri API
- `vite` - Popular build tool

### Updating Dependencies

```bash
# Check for vulnerabilities
cd src-tauri && cargo audit
cd frontend && npm audit

# Update dependencies
cargo update
npm update

# Review changes
git diff Cargo.lock
git diff package-lock.json
```

## Security Tools

### Recommended Tools

1. **Rust**: `cargo-audit`, `cargo-deny`
2. **JavaScript**: `npm audit`, `snyk`
3. **Static Analysis**: `clippy`, `eslint`
4. **Fuzzing**: `cargo-fuzz`

### Running Security Checks

```bash
# Install tools
cargo install cargo-audit
cargo install cargo-deny

# Run checks
cargo audit
cargo deny check
cargo clippy -- -D warnings

# Frontend checks
npm audit
npm run lint
```

## Disclosure Policy

### Responsible Disclosure

We follow a responsible disclosure policy:

1. **Report privately** to maintainers
2. **Allow time** for fix (typically 90 days)
3. **Coordinate disclosure** with maintainers
4. **Public disclosure** after fix is released

### Credits

We believe in giving credit:
- Security researchers listed in CHANGELOG
- Hall of Fame (if we establish one)
- Thank you in release notes

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Rust Security Guidelines](https://anssi-fr.github.io/rust-guide/)
- [Tauri Security](https://tauri.app/v1/references/architecture/security)
- [React Security](https://react.dev/learn/security)

## Contact

For security concerns:
- Check repository for maintainer contact
- Use GitHub Security Advisories
- Email (if provided in repository)

---

**Remember**: Security is everyone's responsibility. If you see something, say something!

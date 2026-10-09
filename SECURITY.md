# Security Policy

## 1. Supported Versions

| Version | Supported          |
| :---    | :---               |
| 1.0.x   | :white_check_mark: |

---

## 2. Security Architecture & Guarantees

VisualMD is architected specifically for corporate privacy and local-first compliance:

1. **Zero External Data Leakage**: VisualMD never sends your documents, snippets, or prompts to any external cloud API or telemetry service.
2. **Localhost Binding**: The server binds exclusively to `localhost` by default.
3. **Sandboxed Dynamic Canvas**: When rendering `$CANVAS$` dynamic JavaScript simulations, code executes inside an isolated `<iframe>` with strict Content Security Policy (`sandbox="allow-scripts"` and `connect-src 'none'`), preventing prototype pollution, local file reads, or credential leakage.
4. **Safe Deletion Guarantee**: When a user deletes a document in VisualMD, only files within the designated `data/` folder are cleaned up; external documents on the filesystem remain protected.

---

## 3. Reporting a Vulnerability

If you discover a security vulnerability within VisualMD:
- Please report it privately by opening a security advisory on GitHub or emailing the maintainers.
- Do NOT open a public issue for undisclosed security vulnerabilities.
- We will respond within 48 hours and work with you to patch the issue before public disclosure.

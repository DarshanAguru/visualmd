# Security Policy & Architecture

## 1. Supported Versions & Release History

| Version | Status | Security Support | Release Notes / Highlights |
| :--- | :--- | :--- | :--- |
| **v1.0.248** | **Latest (Current)** | :white_check_mark: Actively Supported | In-app native PDF viewer & interactive image viewer, virtual folder companion assets grouping (1-level depth with nested subfolder immunity), direct asset deletion API, and multi-resource Markdown workflow |
| **v1.0.246** | Previous Release | :white_check_mark: Actively Supported | Foreign key constraint resilience, folder auto-prune immunity on creation, Express exception crash protection, folder cascade disassociation |
| **v1.0.244** | Previous Release | :white_check_mark: Actively Supported | Streamlined 2-doc tutorial, LeetCode streak calendar with custom threshold, frosted break screensaver, F11 fullscreen |
| **v1.0.242** | Previous Release | :white_check_mark: Maintained | VCS rollback checkpoints, companion assets serving, FTS5 prefix search |
| **v1.0.24** | Historical Release | :warning: Upgrade Recommended | Pomodoro interval settings, study tracking, code fence macro immunity |
| **v1.0.22** | Historical Release | :warning: Upgrade Recommended | Executive 16:9 presentation slide deck, theme contrast polish |
| **v1.0.2** | Historical Release | :warning: Upgrade Recommended | Case-insensitive tags, checklist quiz options, unescaped percent URI healing |
| **v1.0.0** | Initial Launch | :warning: Upgrade Recommended | Initial release of VisualMD token-efficient interactive markdown workspace |

---

## 2. Security Architecture & Guarantees

VisualMD is architected specifically for corporate privacy, local-first compliance, and strict defense-in-depth against Remote Code Execution (RCE) and cross-site scripting (XSS):

### 1. Remote Code Execution (RCE) Elimination via Zero-Shell Execution
- **Kernel-Direct Invocation**: In background git tracking (`autoCommitDataChange`), VisualMD uses `node:child_process.execFile` with direct argument vectors (`argv`), completely bypassing system shells (`/bin/sh`, `bash`, `cmd.exe`).
- **Shell Metacharacter Immunity**: Characters such as `$(...)`, `` `...` ``, `;`, `&`, `|`, `>`, `<`, and quotes in markdown filenames, document titles, or commit messages are treated strictly as literal data strings and can **never** trigger command execution on the host OS.
- **Hardened Browser Launching**: Browser opening commands utilize `spawn` with argument vectors and strict URL scheme validation (`/^https?:\/\//i`).

### 2. Custom Hardened Node.js VM Sandbox Container
VisualMD provides an isolated execution container for running user or markdown-embedded code snippets:
- **String Code-Generation Disabled**: The execution context is initialized with `codeGeneration: { strings: false, wasm: false }`. This disables `eval()` and `new Function(...)` inside the context, fundamentally neutralizing the classic prototype breakout vector (`({}).constructor.constructor('return process')()`).
- **Complete Host Isolation**: `process`, `require`, `module`, `exports`, `global`, `child_process`, `fs`, `net`, and `http` are completely removed (`undefined`).
- **CPU Denial-of-Service Defense**: Enforces hard execution timeouts (default 2000ms, max 5000ms) with `breakOnSigint: true` to prevent infinite loops (`while(true) {}`) from hanging the server process.
- **Memory Defense**: Caps console output buffer lines and characters to prevent memory exhaustion attacks.
- **Safe Stdout/Stderr Capturing**: Provides an isolated `console` implementation logging to structured result arrays.

### 3. Client-Side XSS Sanitization & Canvas Sandbox Hardening
- **Markdown HTML Sanitizer**: Output HTML generated from markdown is sanitized to strip:
  1. `<script>` tags and their inner content.
  2. `<object>`, `<embed>`, `<iframe>`, `<form>`, `<base>`, and `<meta>` tags.
  3. All inline event handlers (`onload`, `onerror`, `onclick`, `onmouseover`, etc.).
  4. Dangerous pseudo-protocols (`javascript:`, `vbscript:`, `data:text/html`).
- **Zero-Privilege Canvas Sandbox**: Dynamic JavaScript simulations (`$CANVAS$`) execute inside an isolated `<iframe>` with `sandbox="allow-scripts"` (strictly without `allow-same-origin`, `allow-forms`, `allow-modals`, or `allow-top-navigation`), assigning the iframe a unique `null` origin with zero access to `parent`, `document.cookie`, or `localStorage`.
- **Strict Content Security Policy**:
  ```http
  default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; form-action 'none'; child-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none';
  ```

### 4. Privilege Dropping for Root / `sudo` Invocations
- When invoked with elevated root privileges or via `sudo` on macOS and Linux (e.g. following global npm installation), VisualMD detects `SUDO_UID` / `SUDO_GID` and automatically drops process privileges back to the non-root invoking user, preventing accidental root-owned file creation and minimizing privilege exposure.

### 5. Strict Path Traversal Defense
- File operations across `/api/assets/*`, document updates, and folder deletions enforce boundary verification using `path.relative` (`isPathInsideDir`). Requests attempting directory escape (e.g. `../../etc/passwd` or `..%2f..%2fetc%2fpasswd`) return `403 Access Denied`.
- File imports sanitize input filenames with `path.basename` to prevent directory traversal attacks during document ingestion.

### 6. Zero External Data Leakage & Localhost Binding
- VisualMD never sends your documents, snippets, or prompts to any external cloud API or telemetry service.
- The server binds exclusively to `localhost` (`127.0.0.1`) by default.
- SQLite storage operates with Write-Ahead Logging (WAL) for concurrency and crash-resilience.

---

## 3. Reporting a Vulnerability

If you discover a security vulnerability within VisualMD:
- Please report it privately by opening a security advisory on GitHub or emailing the maintainers.
- Do NOT open a public issue for undisclosed security vulnerabilities.
- We will respond within 24-48 hours and work with you to patch the issue before public disclosure.

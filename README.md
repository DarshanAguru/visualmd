# VisualMD
> **The Token-Efficient Interactive Visual Markdown Workspace for AI-Era Knowledge Workers & Engineers.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: >=22](https://img.shields.io/badge/Node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![Version: v1.0.2484](https://img.shields.io/badge/Version-v1.0.2484-purple.svg)](SECURITY)
---

## ⚡ Why VisualMD?

In today's AI-assisted era, engineers at top tech companies (Google, Meta, Apple, Amazon, Microsoft) frequently prompt LLMs to research complex technical topics, compare distributed architectures, debug algorithms, and synthesize deep domain knowledge.

However, existing workflows suffer from the **UI Token Waste Paradox**:
- Asking an LLM to generate an interactive web UI (HTML, CSS, JS, Tailwind) burns **3,000 to 10,000+ output tokens** per response, taking 45–90 seconds, burning budgets, and frequently breaking due to mid-generation token limits.
- Asking for plain Markdown preserves tokens but loses all interactive pedagogic value (interactive algorithm steppers, dry-runs, architecture simulations, collapsible deep-dives, tabbed alternatives, and interactive calculators).

**VisualMD bridges this divide**:
1. **The Standard (`prompts/VisualMDStandard.md` / `prompts/skill.md`)**: A deterministic, LLM-agnostic grammar using compact tags (`$SNIPPET$`, `$STEPPER$`, `$CANVAS$`, `$CALLOUT$`, `$TABS$`, `$METRICS$`) requiring **40–70% fewer tokens** than raw HTML.
2. **Universal Dual-Engine Parser**: Flawlessly renders both standard pure Markdown (`.md` with GFM tables, checklists, math `$O(\log n)$`, code blocks) AND enhanced interactive VisualMD (`.vmd`).
3. **The Local Workspace (`visualmd`)**: A self-contained local workspace server running on `localhost:5665` backed by SQLite with full-text search, persistent bookmarking, sticky-note annotations, sandboxed algorithm execution, virtual folder hierarchy, and presentation/slide deck modes.
4. **Rich Palettes & Dynamic Typography**: 11 hand-crafted visual themes (7 Dark & Cyber modes including Obsidian, Tokyo Night, Dracula, and CRT Terminal; 4 Light & Paper modes including Ruled Notebook and Literary Sepia) with real-time 7-level font scaling (80% to 175%).
5. **Built-In Version Control System (Snapshot VCS)**: Automatic snapshot tracking across revisions with timeline diffing, named checkpoints before asking LLMs to rewrite documents, and 1-click rollback without terminal or git requirements.
6. **Hardened Security & Node.js VM Sandboxing**: Complete elimination of shell injection RCE vectors, custom isolated Node.js VM container with code generation disabled, client-side XSS sanitization, and zero-privilege canvas iframes.
7. **Encapsulated Companion Assets, In-App PDF & Image Viewers**: Upload supporting images (`.png`, `.jpg`, `.jpeg`, `.svg`, `.webp`, `.avif`) and documents (`.pdf`) alongside markdown notes. Assets targeting a folder are automatically organized into an encapsulated `assets/` subfolder on disk (e.g., `Topic/assets/slides.pdf`), keeping all learning and reference materials cleanly isolated and grouped together. Read PDFs with native toolbar search and inspect diagrams with interactive zoom controls directly in the main workspace.

---

## 🚀 Installation & CLI Quickstart

### 1. Instant Run (Zero Installation & No Root/Sudo Required):
Recommended for all platforms (macOS, Windows, Linux) — runs immediately without modifying system directories or needing root permissions:
```bash
npx visualmd
# or open a specific document:
npx visualmd ./my-document.vmd
```

### 2. Install Globally via npm:
```bash
npm install -g visualmd
# or:
npm i -g visualmd
```

#### 🍎 macOS / Linux (Install WITHOUT `sudo` or root):
For security and convenience, running npm without `sudo` is strongly recommended. If you encounter `EACCES: permission denied` on macOS:

- **Method A (Zero Install — No Root)**:
  ```bash
  npx visualmd
  ```
- **Method B (Official npm User-Directory Configuration — One-time setup, no sudo forever)**:
  ```bash
  mkdir -p ~/.npm-global
  npm config set prefix ~/.npm-global
  echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
  source ~/.zshrc
  npm install -g visualmd
  ```
- **Method C (Using Homebrew)**:
  If Node is installed via Homebrew (`brew install node`), npm global installs reside in user space and never require `sudo`:
  ```bash
  npm install -g visualmd
  ```
- **Method D (Elevated Install with Privilege Dropping)**:
  ```bash
  sudo npm install -g visualmd
  ```
  *(VisualMD automatically drops elevated root privileges back to your invoking `SUDO_UID`/`SUDO_GID` upon launching.)*

---

### 3. Or Build & Link from Source:
```bash
git clone https://github.com/DarshanAguru/visualmd.git
cd visualmd
npm install
npm link
```

---

That's it! `visualmd` is available in your PATH. Run it from **any** folder on your machine:
```bash
visualmd                       # Launch interactive dashboard on localhost:5665
visualmd ./my-document.vmd     # Open & visualize an interactive markdown file
visualmd ./README.md           # Open standard markdown in interactive reader
visualmd --data-dir ~/my-docs  # Custom document directory (saved as default)
visualmd --reset-dir           # Reset saved custom path back to default ~/.visualmd/data
visualmd -b                    # Run in background daemon mode
visualmd --status              # Check running server status & active ports
visualmd --close               # Terminate and close all running VisualMD processes
visualmd --port 8080           # Custom port
```

### 🔌 Default Ports & Intelligent Port Allocation
- **Default Application Port**: Defaults to **`5665`**. If occupied, VisualMD automatically discovers and binds to the next available empty port (`5666`, `5667`...) and updates logs and PID tracking.
- **Frontend Dev Server Port**: Defaults to **`5665`** with live proxy to the running backend engine.
- **Custom Port Override**: Use `--port <number>` or `-p <number>` to explicitly specify any port.

### 🗂️ Custom Document Directory (`--data-dir`)
You can store your `.vmd` and `.md` files wherever you choose. VisualMD automatically validates directory write permissions beforehand and saves your choice to `~/.visualmd/config.json` (**"set once and forget"**):
```bash
# Point to any project or personal folder (persisted automatically)
visualmd --data-dir ./docs
visualmd --data-dir ~/Developer/notes

# Reset back to default ~/.visualmd/data whenever desired
visualmd --reset-dir
```
> [!TIP]
> **Production-Clean CLI**: When launched from terminal with or without `--data-dir`, VisualMD runs silently and displays a clean, production-screen banner. The only flag accepted for directory configuration is `--data-dir`. All settings and prompts can also be adjusted inside the app!

### 🖼️ Companion Assets & Image Resource Serving
Users and LLMs often store companion images, diagrams, or datasets alongside markdown files:
- **Non-Markdown Tolerance**: Files like `.png`, `.jpg`, `.svg`, `.pdf`, `.csv`, `.json` are never mistakenly parsed as broken documents.
- **Smart Fallback Image Serving**: If markdown references `![Diagram](arch.png)` but the image is inside `assets/arch.png` or `images/arch.png`, VisualMD's `/api/assets/*` endpoint automatically discovers and serves it.
- **Sidebar Resources Drawer**: View all companion workspace files from the collapsible sidebar drawer and click **"Copy Tag"** to copy `![image.png](./image.png)` directly to your clipboard.

### 🔒 Enterprise Security & Code Sandboxing
- **Remote Code Execution (RCE) Elimination**: Git auto-backups strictly use direct kernel `execFile` argument vectors with zero system shell evaluation (`/bin/sh` or `cmd.exe`). Shell metacharacters (`$(...)`, ``;``, `` ` ``) in filenames, document titles, or commit messages are treated as literal strings and cannot execute commands on the host.
- **Custom Node.js VM Sandbox**: Run snippets in an isolated `node:vm` container with `codeGeneration: { strings: false, wasm: false }`, completely neutralizing prototype string-evaluation escape attacks (`({}).constructor.constructor('return process')()`). Host bindings (`process`, `require`, `child_process`, `fs`, `net`) are removed, and CPU execution timeouts prevent infinite loops.
- **Client-Side XSS Sanitization**: Markdown HTML is strictly sanitized, stripping `<script>`, `<object>`, `<iframe>`, inline `on*` event handlers, and `javascript:` URIs.
- **Zero-Privilege Canvas Sandbox**: `$CANVAS$` dynamic simulations run inside an isolated `<iframe>` with `sandbox="allow-scripts"` and a strict zero-privilege Content Security Policy.
- **Path Traversal Protection**: Enforces `isPathInsideDir` with `path.relative` boundaries across static asset serving and deletion routes.

### 📜 Built-in Document Version Control (Snapshot VCS)
VisualMD includes a lightweight snapshot VCS for tracking revisions:
- **Automatic Snapshots**: Every edit automatically archives the previous version before applying changes.
- **Named Checkpoints**: Create named checkpoints before prompting an LLM to revise your document (e.g., *"Before LLM rewrite"*).
- **1-Click Rollback**: View any historical revision in the slide-out History Drawer and restore it instantly.

### 🗑️ Uninstallation
To completely uninstall VisualMD from your machine:
```bash
npm uninstall -g visualmd
```

---

## 🛠️ Live Development & Debugging (Instant HMR)

For contributors and power users testing UI or parser changes in real time:

```bash
# 1. Clone & install dependencies
git clone https://github.com/DarshanAguru/visualmd.git
cd visualmd
npm install

# 2. Launch live development mode with Vite Hot Module Replacement (HMR):
npm run dev
```

This starts:
- **UI Application with Live HMR**: Runs on `http://localhost:5665` (or next empty port) with instant **Hot Module Replacement (HMR)**.
- **Internal Backend Engine**: Runs securely in the background with SQLite persistence and strict CORS origin isolation.
- Any changes to themes, CSS custom properties, React components, widgets, or Markdown rendering are **instantly updated in your browser in <100ms** without page reloads!

To build and run the compiled production bundle locally:
```bash
npm run build
npm start
```

---

## 🤖 AI Prompts & Agent Skills

All prompts and skills are organized in the [`prompts/`](prompts/) directory and accessible directly inside VisualMD via **Settings > AI Prompts & Skills** (hotkey `⌘I` or `Ctrl + I`):

| File | Purpose | How to Use |
| :--- | :--- | :--- |
| **[`prompts/system-prompt.txt`](prompts/system-prompt.txt)** | Strict 1-paragraph system prompt with anti-hallucination mandate | Paste directly into ChatGPT Custom Instructions, Claude System Prompt, or Ollama. |
| **[`prompts/skill.md`](prompts/skill.md)** | Autonomous agent skill with empirical citations & zero-hallucination verification | Drop into autonomous coding agent frameworks (Antigravity, Claude Desktop, Cursor Rules, OpenAI GPTs). |
| **[`prompts/VisualMDStandard.md`](prompts/VisualMDStandard.md)** | Full specification with strict verification rules & citations requirement | Upload or attach to any chat session at the start. |

---

## 📁 Centralized Data Storage (`data/`)

VisualMD features a dedicated [`data/`](data/) directory:
- **Central Storage**: All documents created or imported are stored as `.vmd` or `.md` files in `data/`.
- **Automatic Ingestion**: Drop any `.vmd` or `.md` file directly into `data/`, and VisualMD automatically synchronizes it with the local database.
- **Safe Deletion Guarantee**: Deleting a document from VisualMD removes its file from `data/`, but any external original file on your computer remains protected and untouched!
- **Virtual Organization**: Organize documents into virtual folders (e.g., *Kafka*, *Redis*, *Algorithms*) from the sidebar without moving files physically on disk.

---

## 🛠️ The VisualMD Specification At a Glance

| Element | Tag Syntax | Rendered Enterprise UI Feature |
| :--- | :--- | :--- |
| **Code Snippet** | `$SNIPPET$S?lang=ts&title=Worker.ts`<br>`code...`<br>`$SNIPPET$E` | Monaco/Prism styled editor card with line numbers, copy button, syntax highlighting, diffs, and sandbox runner. |
| **Step-by-Step Stepper** | `$STEPPER$S?title=Raft+Leader+Election`<br>`$STEP@1?title=Heartbeat+Timeout`<br>`content...`<br>`$STEP@2?title=Candidate+Vote`<br>`content...`<br>`$STEPPER$E` | Interactive next/previous stepper UI with breadcrumbs, progress tracker, and step-by-step state visualization. |
| **Dynamic Canvas / Simulation** | `$CANVAS$S?engine=canvas2d&title=Dijkstra+Visualizer`<br>`// JS drawing logic`<br>`$CANVAS$E` | Secure, sandboxed interactive canvas / interactive widget with play/pause/reset controls. |
| **Comparison Tabs** | `$TABS$S`<br>`$TAB?title=Postgres`<br>`content...`<br>`$TAB?title=Cassandra`<br>`content...`<br>`$TABS$E` | Multi-tab switchable cards with active pill indicators for comparative architecture analyses. |
| **Callout / Insights** | `$CALLOUT$S?type=insight\|warn\|perf\|tip`<br>`content...`<br>`$CALLOUT$E` | Modern alert cards with custom icons, accent borders, and collapsible metadata. |
| **Interactive Metric / Benchmark** | `$METRICS$S`<br>`P99: 4.2ms \| Throughput: 120k rps \| Cost: -40%`<br>`$METRICS$E` | Executive dashboard KPI counters and stat comparison badges. |
| **Self-Check / Knowledge Check** | `$QUIZ$S?q=Why+partition+Kafka?`<br>`[x] Parallel consumption`<br>`[ ] ACID transactions`<br>`$QUIZ$E` | Interactive quiz box with instant feedback for self-learning retention. |
| **Standard Markdown Fallback** | Pure CommonMark / GFM markdown headings, bold, tables, lists, KaTeX math `$..$`, Mermaid | Seamlessly renders any standard `.md` file with zero configuration. |

---

## 🏢 Enterprise Features

### 1. Privacy & Enterprise Security
- **Zero Cloud Leakage**: No telemetry, no external font/script CDNs, 100% self-hosted on `localhost:5665`.
- **Local SQLite Storage**: Stored in `~/.visualmd/visualmd.db` with Write-Ahead Logging (WAL) for high concurrency and resilience.
- **Hardened Sandboxed Execution**: Custom canvas scripts run in isolated `<iframe>` environments with strict CSP (`connect-src 'none'`), and code snippets execute inside an isolated Node VM sandbox.

### 2. High-Productivity Workspace & 12 Theme Presets
- **12 Calibrated Visual Themes & Typography Presets**:
  - **Dark & Cyber**: *Midnight Prism* (deep indigo & violet glow), *Tokyo Night* (neon cyan & purple), *Nord Arctic* (polar slate & ice blue), *Dracula*, *Cyberpunk Neon*, *Forest Evergreen*, *Solarized Dark*.
  - **Light & Paper**: *Notebook* (warm ruled paper with **Caveat cursive handwritten font**), *Literary Ivory* (warm editorial essay layout with **Newsreader serif font**), *Minimal Light* (clean stark white with Apple typography), *Warm Sepia*.
  - **Terminal & Retro**: *Retro CRT Terminal* (amber phosphor on dark charcoal with **JetBrains Mono** font).
  - Instant live switching via the Theme dropdown in the navbar.
- **Visual Feedback for Highlights, Notes, & Bookmarks**:
  - **Color Highlighting**: Highlight text in Yellow, Emerald, Sky, or Rose with vibrant text background highlights.
  - **Sticky Notes**: Attaching a note wraps selected text in a clean dashed border box; hovering pops open a tooltip with your note and one-click deletion.
  - **Gutter Bookmarks**: Click the bookmark icon in any section's left margin or select text to drop a bookmark, giving instant visual feedback with glowing section badges.
- **Persistent Bookmarks & Last-Read Tracking**:
  - Automatically remembers exact scroll offset and viewport position per document.
- **Global & In-Page Search**:
  - Global Search (`Cmd+K` / `Ctrl+K`) powered by SQLite FTS5 (Full-Text Search across titles, content, tags, notes).
  - In-page high-speed search with match highlighting and cycling.

### 3. Executive Presentation Mode ("Deck Mode")
- Big tech engineers often need to present LLM research findings or architectural breakdowns to managers, staff engineers, or clients.
- One-click **Presentation Mode (`P` key or button)**: Converts the document's headers, steppers, and metric cards into full-screen interactive slide decks with keyboard navigation (`Left`/`Right` arrows).
- **Interactive Pen & Freehand Annotation (`D` key)**: Draw freehand sketches directly over live presentation slides with undo, color selection (Rose, Sky, Emerald, Amber, Violet), stroke thickness, and instant canvas clearing.
- **Keynote Laser Pointer (`L` key)**: Smooth laser pointer with pulsing keynote ripple for highlighting critical architecture nodes or code lines.
- **Dynamic Explanation Slides (`+ Slide` button)**: Insert on-the-fly whiteboard, blackboard, or engineering grid slides mid-presentation to diagram solutions without breaking deck flow.
- **Slide Overview Matrix (`O` key)**: Instant visual grid drawer showing all slides for jumping across sections.
- **Screen Focus Blackout / Whiteout (`B` / `W` keys)**: Instant screen mute to pull audience focus back to the speaker.
- **Live Elapsed Presentation Timer**: Keep track of pacing with an integrated presenter stopwatch.

### 4. Resilient Fault-Tolerant Compiler
- Automatically closes dangling blocks at EOF or section boundaries.
- Gracefully recovers from malformed parameters and unclosed tags without crashing the UI.

---

## 📁 Repository Structure

```
visualmd/
├── LICENSE                            # MIT License
├── CODE_OF_CONDUCT.md                 # Contributor Covenant v2.1
├── CONTRIBUTING.md                    # Contribution guidelines & developer setup
├── SECURITY.md                        # Enterprise security policy & sandbox guarantees
├── README.md                          # Main project documentation
├── package.json                       # Monorepo configuration (version 1.0.2484)
├── prompts/                           # Centralized AI skills, prompts & specifications
│   ├── skill.md                       # Agent skill for Antigravity, Claude, Cursor
│   ├── VisualMDStandard.md            # Complete VisualMD standard specification
│   ├── system-prompt.txt              # Instant copy-paste LLM system prompt
│   └── README.md
├── data/                              # Central storage for all user readmes (.vmd / .md)
├── packages/
│   ├── compiler/                      # Token-efficient AST Compiler
│   │   ├── src/                       # Lexer, Parser, Auto-healing
│   │   └── tests/                     # 16 Unit tests
│   ├── server/                        # Local SQLite, CLI Daemon & Sandbox Container
│   │   ├── src/                       # DatabaseSync, Express REST API, CLI, Sandbox, Git
│   │   ├── bin/visualmd.js            # Executable CLI launcher
│   │   └── tests/                     # 16 Integration & Security tests
│   └── web/                           # React 19 + Vite Workspace UI
│       ├── src/components/widgets/    # CodeBox, Stepper, CanvasSandbox, Tabs, Quiz
│       ├── src/components/sidebar/    # Virtual folders, search, assets drawer, file tree
│       ├── src/components/viewer/     # In-App PDF & Image AssetViewer
│       ├── src/components/deck/       # Fullscreen slide presentation mode
│       ├── src/components/modals/     # HistoryDrawer, PromptsModal, SearchModal, ImportModal
│       └── src/components/document/   # Document viewer & annotations
└── examples/                          # Seed demonstration documents
    ├── 01-welcome-and-tutorial.vmd        # Interactive welcome & starter guide
    └── 02-deep-work-and-study-guide.vmd   # Deep work habits & learning frameworks
```

---

## 🧪 Automated Tests

VisualMD maintains comprehensive test coverage across both the compiler, backend server, and sandbox security container:

```bash
# Run complete test suite across compiler and server
npm test
```

```
✔ VisualMD Compiler (16 tests) - 100% pass
✔ VisualMD Server & Security (16 tests) - 100% pass
Total: 32 tests, 32 passing, 0 failing
```

---

## 👥 Authors & Attribution

VisualMD was architected and built through a pair-programming collaboration between:
- **[Darshan Aguru](https://thisdarshiii.in)** — Lead Creator & Systems Architect & Code Reviewer/Orchestrator
- **[Antigravity](https://antigravity.google/)** — Advanced Agentic Coding Programmer (Google Gemini)

Designed with passion for technical education, zero telemetry, and token-efficient AI workflows.

---

## 📄 License & Copyright

Copyright © 2026 **[Darshan Aguru](https://thisdarshiii.in)**. All rights reserved.

Released under the [MIT License](LICENSE).
Code of Conduct follows [Contributor Covenant](CODE_OF_CONDUCT.md).
Contributions welcome! Check out [CONTRIBUTING.md](CONTRIBUTING.md).

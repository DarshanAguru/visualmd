# VisualMD
> **The Token-Efficient Interactive Visual Markdown Workspace for AI-Era Knowledge Workers & Engineers.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: >=22](https://img.shields.io/badge/Node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![Version: v1.0.1](https://img.shields.io/badge/Version-v1.0.1-purple.svg)]()
---

## ⚡ Why VisualMD?

In today's AI-assisted era, engineers at top tech companies (Google, Meta, Apple, Amazon, Microsoft) frequently prompt LLMs to research complex technical topics, compare distributed architectures, debug algorithms, and synthesize deep domain knowledge.

However, existing workflows suffer from the **UI Token Waste Paradox**:
- Asking an LLM to generate an interactive web UI (HTML, CSS, JS, Tailwind) burns **3,000 to 10,000+ output tokens** per response, taking 45–90 seconds, burning budgets, and frequently breaking due to mid-generation token limits.
- Asking for plain Markdown preserves tokens but loses all interactive pedagogic value (interactive algorithm steppers, dry-runs, architecture simulations, collapsible deep-dives, tabbed alternatives, and interactive calculators).

**VisualMD bridges this divide**:
1. **The Standard (`prompts/VisualMDStandard.md` / `prompts/skill.md`)**: A deterministic, LLM-agnostic grammar using compact tags (`$SNIPPET$`, `$STEPPER$`, `$CANVAS$`, `$CALLOUT$`, `$TABS$`, `$METRICS$`) requiring **40–70% fewer tokens** than raw HTML.
2. **Universal Dual-Engine Parser**: Flawlessly renders both standard pure Markdown (`.md` with GFM tables, checklists, math `$O(\log n)$`, code blocks) AND enhanced interactive VisualMD (`.vmd`).
3. **The Local Workspace (`visualmd`)**: A self-contained local workspace server running on `localhost:9669` backed by SQLite with full-text search, persistent bookmarking, sticky-note annotations, sandboxed algorithm execution, virtual folder hierarchy, and presentation/slide deck modes.
4. **Rich Palettes & Dynamic Typography**: 11 hand-crafted visual themes (7 Dark & Cyber modes including Obsidian, Tokyo Night, Dracula, and CRT Terminal; 4 Light & Paper modes including Ruled Notebook and Literary Sepia) with real-time 7-level font scaling (80% to 175%).

---

## 🚀 Installation & CLI Quickstart

### Install Globally via npm:
```bash
npm install -g visualmd
# or:
npm i -g visualmd
```

### Instant Run (Zero Installation):
```bash
npx visualmd
```

### Or Build & Link from Source:
```bash
git clone https://github.com/DarshanAguru/visualmd.git
cd visualmd
npm install
npm link
```

---

That's it! `visualmd` is available in your PATH. Run it from **any** folder on your machine:
```bash
visualmd                       # Launch interactive dashboard on localhost:9669
visualmd ./my-document.vmd     # Open & visualize an interactive markdown file
visualmd ./README.md           # Open standard markdown in interactive reader
visualmd -b                    # Run in background daemon mode
visualmd --status              # Check running server status & active ports
visualmd --close               # Terminate and close all running VisualMD processes
visualmd --port 8080           # Custom port
```

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
- **Backend API Server**: Runs on `http://localhost:9669` with SQLite persistence.
- **Frontend Vite Dev Server**: Runs on `http://localhost:5173` with instant **Hot Module Replacement (HMR)**.
- Any changes to themes, CSS custom properties, React components, widgets, or Markdown rendering are **instantly updated in your browser in <100ms** without page reloads!

To build and run the compiled production bundle locally:
```bash
npm run build
npm start
```



## 🤖 AI Prompts & Agent Skills

All prompts and skills are organized in the [`prompts/`](prompts/) directory and accessible via the **"AI Prompts"** button in the web navigation bar:

| File | Purpose | How to Use |
| :--- | :--- | :--- |
| **[`prompts/system-prompt.txt`](prompts/system-prompt.txt)** | Strict 1-paragraph system prompt with anti-hallucination mandate | Paste directly into ChatGPT Custom Instructions, Claude System Prompt, or Ollama. |
| **[`prompts/skill.md`](prompts/skill.md)** | Autonomous agent skill with empirical citations & zero-hallucination verification | Drop into autonomous coding agent frameworks (Antigravity, Claude Desktop, Cursor Rules, OpenAI GPTs). |
| **[`prompts/VisualMDStandard.md`](prompts/VisualMDStandard.md)** | Full v1.1.0 specification with strict verification rules & citations requirement | Upload or attach to any chat session at the start. |

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
| **Code Snippet** | `$SNIPPET$S?lang=ts&title=Worker.ts`<br>`code...`<br>`$SNIPPET$E` | Monaco/Prism styled editor card with line numbers, copy button, language badge, syntax highlighting. |
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
- **Zero Cloud Leakage**: No telemetry, no external font/script CDNs, 100% self-hosted on `localhost:9669`.
- **Local SQLite Storage**: Stored in `~/.visualmd/visualmd.db` with Write-Ahead Logging (WAL) for high concurrency and resilience.
- **Sandboxed Execution**: Custom canvas scripts run in isolated `<iframe>` environments with strict CSP (`connect-src 'none'`).

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
├── package.json                       # Monorepo configuration (with automatic prepare build)
├── prompts/                           # Centralized AI skills, prompts & specifications
│   ├── skill.md                       # Agent skill for Antigravity, Claude, Cursor
│   ├── VisualMDStandard.md            # Complete VisualMD standard specification
│   ├── system-prompt.txt              # Instant copy-paste LLM system prompt
│   └── README.md
├── data/                              # Central storage for all user readmes (.vmd / .md)
├── packages/
│   ├── compiler/                      # Token-efficient AST Compiler
│   │   ├── src/                       # Lexer, Parser, Auto-healing
│   │   └── tests/                     # 10 Unit tests
│   ├── server/                        # Local SQLite & CLI Daemon
│   │   ├── src/                       # DatabaseSync, Express REST API, CLI, data sync
│   │   ├── bin/visualmd.js            # Executable CLI launcher
│   │   └── tests/                     # 4 Integration tests
│   └── web/                           # React 19 + Vite Workspace UI
│       ├── src/components/widgets/    # CodeBox, Stepper, Canvas, Tabs, Quiz
│       ├── src/components/sidebar/    # Virtual folders, search, file tree
│       ├── src/components/deck/       # Fullscreen slide presentation mode
│       ├── src/components/modals/     # PromptsModal, SearchModal, NewDocModal, ImportModal
│       └── src/components/document/   # Document viewer & annotations
└── examples/                          # Seed demonstration documents
    ├── 01-kafka-vs-redis.vmd          # Distributed systems architecture
    ├── 02-dijkstra-algorithm.vmd      # Interactive algorithm & canvas sandbox
    └── 03-raft-consensus.vmd          # Step-by-step consensus visualization
```

---

## 🧪 Automated Tests

VisualMD maintains comprehensive test coverage across both the compiler and backend server:

```bash
# Run complete test suite across compiler and server
npm test
```

```
✔ VisualMD Compiler - Standard Markdown and Title
✔ VisualMD Compiler - Snippet Tag Parsing
✔ VisualMD Compiler - Stepper Tag Parsing
✔ VisualMD Compiler - Tabs and Callout Parsing
✔ VisualMD Compiler - Metrics and Quiz Parsing
✔ VisualMD Compiler - Fault Tolerance & Auto-Healing unclosed tags
✔ VisualMD Compiler - Canvas Tag Parsing
✔ VisualMD Validation - catches unclosed tags when checking
✔ VisualMD Compiler - Pure Markdown Document Processing
✔ VisualMD Compiler - Complex Special Characters in Parameters
✔ Server & Database - CRUD, Bookmarks, and FTS5 Search
✔ Server - REST API integration
✔ Server - data/ directory sync, file creation, and safe deletion
✔ Server - Prompts API & Folders API Verification
Total: 14 tests, 14 passing, 0 failing
```

---

## 👥 Authors & Attribution

VisualMD was architected and built through a pair-programming partnership between:
- **[Darshan Aguru](https://thisdarshiii.in)** — Lead Creator & Systems Architect
- **Antigravity** — Advanced Agentic Coding Pair Programmer (Google DeepMind)

Designed with passion for technical education, zero telemetry, and token-efficient AI workflows.

---

## 📄 License & Copyright

Copyright © 2026 **[Darshan Aguru](https://thisdarshiii.in)** & **Antigravity** (Google DeepMind). All rights reserved.

Released under the [MIT License](LICENSE).
Code of Conduct follows [Contributor Covenant](CODE_OF_CONDUCT.md).
Contributions welcome! Check out [CONTRIBUTING.md](CONTRIBUTING.md).

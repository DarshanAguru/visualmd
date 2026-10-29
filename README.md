# VisualMD
> **The Token-Efficient Interactive Visual Markdown Workspace for AI-Era Knowledge Workers & Engineers.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: >=22](https://img.shields.io/badge/Node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![Version: v1.0.2600008](https://img.shields.io/badge/Version-v1.0.2600008-purple.svg)](SECURITY)
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

## 📦 Programmatic SDK & Agentic AI Integration

VisualMD is not just a workspace application—it is also a **high-performance, battle-tested programmatic SDK** designed for engineers building AI agents, LLM pipelines, autonomous coding assistants, and educational platforms.

If your LLM produces structured output or streaming markdown, you can install VisualMD directly into your Node.js or TypeScript backend without running the server UI.

### Installation

```bash
npm install visualmd
```

### Quick API Examples

```typescript
import {
  parseVisualMD,
  buildDocumentMindMap,
  autoHealVisualMD,
  parseMindMapFile,
  validateVisualMD,
  VisualMDParseError,
  VisualMDValidationError
} from 'visualmd';

// 1. Parse VisualMD or Standard Markdown into AST
const doc = parseVisualMD(`
# System Architecture
$STEPPER$S?title=Distributed+Commit
$STEP@1?title=Prepare
Coordinator asks replicas to prepare.
$STEP@2?title=Commit
Coordinator sends commit message upon unanimous votes.
$STEPPER$E
`);

console.log(doc.title); // "System Architecture"
console.log(doc.nodes.length); // 2 (markdown + stepper)

// 2. Extract Complete Hierarchical Mind Map from Any Document
const mindMap = buildDocumentMindMap(doc);
console.log(mindMap.text); // "System Architecture"
console.log(mindMap.children); // Headings, steppers, concepts, formulas & definitions

// 3. Auto-Heal Truncated LLM Streaming Chunks
// Safely closes unclosed code blocks, math formulas, and macro tags mid-stream
const rawStream = `# Quantum Logic\n\`\`\`python\ncircuit = QuantumCircuit(2)`;
const safeStream = autoHealVisualMD(rawStream);
// Output automatically appends \`\`\` so renderers never crash!

// 4. Parse Standalone .mindmap Files (Bullets, Mermaid, or JSON)
const mindMapDoc = parseMindMapFile(`
# Distributed Storage
- Consensus Protocols [badge: Core]
  - Raft [summary: Leader election & log replication]
  - Paxos
- Storage Engines
  - LSM Trees: Write-optimized log structured merge trees
  - B+ Trees: Read-optimized balanced search trees
`);

// 5. Strict Validation for Automated CI/CD Pipelines
try {
  parseVisualMD(inputString, { strict: true });
} catch (err) {
  if (err instanceof VisualMDValidationError) {
    console.error('Unclosed tags found:', err.unclosedTags);
  } else if (err instanceof VisualMDParseError) {
    console.error('Parse diagnostics:', err.diagnostics);
  }
}
```

### Agentic AI Framework Compatibility
VisualMD SDK works out-of-the-box in:
- **Google Antigravity & Gemini SDK** (`@google/genai`)
- **LangChain & LangGraph** (`@langchain/core`)
- **LlamaIndex** (`llamaindex`)
- **AutoGen & CrewAI**
- **Vercel AI SDK** (`ai`)

For standalone `.mindmap` structure and AI prompts, consult:
- **[`docs/MINDMAP_SPECIFICATION.md`](docs/MINDMAP_SPECIFICATION.md)** — Specification for `.mindmap` and `$MINDMAP$` blocks.
- **[`prompts/mindmap-prompt.md`](prompts/mindmap-prompt.md)** — Master generation prompt for standalone and embedded mind maps.

---

## 🎨 Embeddable Canvas UI & Modular Components (React, Angular, Vue, Svelte, HTML)

Because VisualMD widgets (interactive steppers, sandboxed code runners, canvas simulations, tabs, callouts, quizzes, metrics, and mind maps) use a rich, token-efficient interactive UI, parsing is only half the equation—you also need to render them cleanly in your frontend application.

VisualMD provides **`<VisualMDCanvas />`** and a suite of modular standalone components that you can embed directly into your own React, Next.js, Angular, Vue, Svelte, or vanilla web applications with zero setup.

### 1. Import Canvas & Self-Contained Styles

All theme variables, typography, KaTeX math fonts, and widget layouts are bundled into a single stylesheet:

```typescript
import { VisualMDCanvas } from 'visualmd/canvas';
import 'visualmd/canvas.css'; // Bundles all 12 themes, KaTeX math & widget styles
```

### 2. Basic React Canvas Embedding

Pass either a parsed `doc` (from `parseVisualMD()`) or pass raw Markdown / VisualMD string directly via `content`:

```tsx
import React, { useState } from 'react';
import { VisualMDCanvas } from 'visualmd/canvas';
import 'visualmd/canvas.css';

export function AgentOutputViewer({ agentMarkdown }: { agentMarkdown: string }) {
  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
      <VisualMDCanvas
        content={agentMarkdown}
        theme="obsidian"
        height="600px"
        width="100%"
        overflow="auto"
        showTitle={true}
      />
    </div>
  );
}
```

### 3. Selective Node Filtering (`filterTypes`)

If your application only needs specific widgets (e.g. only sandboxed code snippets, or only interactive steppers and quizzes), use the `filterTypes` prop:

```tsx
// Render ONLY code snippets with secure sandbox runner:
<VisualMDCanvas doc={doc} filterTypes={['snippet']} theme="dracula" />

// Render ONLY interactive workflows and self-checks:
<VisualMDCanvas doc={doc} filterTypes={['stepper', 'quiz']} theme="tokyo" />

// Render ONLY hierarchical mind maps:
<VisualMDCanvas doc={doc} filterTypes={['mindmap']} height="500px" />
```

### 4. Standalone Modular Widgets

You can also import and render individual widgets independently without wrapping in a full canvas:

```tsx
import {
  VisualMDSnippet,
  VisualMDStepper,
  VisualMDMindMap,
  VisualMDQuiz,
  VisualMDTabs,
  VisualMDCallout,
  VisualMDMetrics,
  VisualMDMarkdown
} from 'visualmd/canvas';
import 'visualmd/canvas.css';

// A. Code Snippet with Line Numbers, Syntax Highlighting & Sandbox Execution:
<VisualMDSnippet
  code={`const tensor = tf.tensor2d([[1, 2], [3, 4]]);\nconsole.log(tensor.shape);`}
  lang="typescript"
  title="TensorOps.ts"
  theme="obsidian"
/>

// B. Step-by-Step Interactive Workflow:
<VisualMDStepper
  title="Two-Phase Commit Protocol"
  steps={[
    { index: 1, title: "Prepare Phase", content: "Coordinator asks cohort replicas to prepare and vote." },
    { index: 2, title: "Commit Phase", content: "Coordinator broadcasts commit order upon unanimous agreement." }
  ]}
  theme="midnight"
/>

// C. Interactive Zoomable & Draggable Mind Map:
<VisualMDMindMap
  content={`
  # Distributed Consensus
  - Paxos [badge: Foundational]
  - Raft [badge: Leader-Based] [summary: Log replication]
  `}
  height="450px"
  theme="tokyo"
/>

// D. Self-Assessment Quiz with Instant Recall Feedback:
<VisualMDQuiz
  question="Why is WAL essential for database crash recovery?"
  options={[
    { text: "It persists modifications before committing to data pages", isCorrect: true },
    { text: "It compresses indexes in memory", isCorrect: false }
  ]}
  explanation="The Write-Ahead Log guarantees durability (ACID) by logging state transitions to disk sequentially."
  theme="obsidian"
/>
```

### 5. Universal Framework Integration (Angular, Vue, Svelte, Vanilla JS)

For applications built in Angular, Vue, Svelte, or plain JavaScript without React, use `renderVisualMD()`:

```typescript
// In Angular (ngAfterViewInit), Vue (onMounted), or Vanilla JS:
import { renderVisualMD } from 'visualmd/canvas';
import 'visualmd/canvas.css';

const container = document.getElementById('visualmd-container')!;

const canvasInstance = renderVisualMD(container, {
  content: `# Live Agent Stream\n$STEPPER$S...`,
  theme: 'obsidian',
  height: '600px',
  width: '100%',
  overflow: 'auto',
});

// Update canvas on incoming streaming tokens:
canvasInstance.update({ content: updatedAgentText });

// Clean up when destroying component:
canvasInstance.destroy();
```

### 6. HTML Custom Element (`<visualmd-canvas>`)

VisualMD also auto-registers a Web Component for zero-framework HTML pages:

```html
<script type="module">
  import 'visualmd/canvas';
</script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/visualmd/packages/web/dist/canvas/canvas.css">

<visualmd-canvas
  content="# System Architecture&#10;- Core Engine&#10;  - Ingest&#10;  - Parser"
  theme="tokyo"
  height="500px">
</visualmd-canvas>
```

### 7. Canvas Component Props Reference

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `doc` | `VmdDocument` | `undefined` | Pre-parsed AST document from `parseVisualMD()`. |
| `content` | `string` | `undefined` | Raw markdown / VisualMD text (auto-parsed if `doc` omitted). |
| `theme` | `ThemeType` | `'obsidian'` | Visual theme: `'obsidian'`, `'tokyo'`, `'midnight'`, `'dracula'`, `'forest'`, `'nord'`, `'retro'`, `'light'`, `'editorial'`, `'notebook'`, `'sepia'`, `'paper'`. |
| `height` | `string \| number` | `'100%'` | CSS container height (e.g. `'600px'`, `500`). |
| `width` | `string \| number` | `'100%'` | CSS container width (e.g. `'100%'`, `'800px'`). |
| `overflow` | `'auto' \| 'hidden' \| 'scroll' \| 'visible'` | `'auto'` | CSS overflow behavior for scrolling. |
| `filterTypes` | `VmdNode['type'][]` | `undefined` | Filter array: e.g. `['snippet']` or `['stepper', 'quiz']`. |
| `showTitle` | `boolean` | `true` | Show or hide document title and metadata header bar. |
| `readOnly` | `boolean` | `true` | Display in embeddable read-only mode. |
| `fontScale` | `number` | `1` | Relative font scaling multiplier (e.g. `0.9` or `1.15`). |
| `className` | `string` | `''` | Host container CSS classes. |
| `style` | `React.CSSProperties` | `{}` | Host container inline styles. |
| `onNodeClick` | `(node: VmdNode) => void` | `undefined` | Callback fired when user clicks any node card. |
| `headerActions` | `React.ReactNode` | `undefined` | Custom action buttons to display in canvas header. |
| `fallback` | `React.ReactNode` | `undefined` | Fallback component when document has no nodes. |

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

### 🗂️ Directory-Level Workspace Isolation & Switching (`--data-dir`)
You can store your `.vmd` and `.md` files wherever you choose. VisualMD provides **production-grade directory-level isolation** so you can easily switch between different repositories and projects:
```bash
# Point to any project or personal folder (persisted automatically)
visualmd --data-dir ./docs
visualmd --data-dir ~/Developer/project-alpha
visualmd --data-dir ~/Developer/project-beta

# Reset back to default ~/.visualmd/data whenever desired
visualmd --reset-dir
```
- **Physical SQLite Isolation**: Each unique directory maps to its own isolated database under `~/.visualmd/workspaces/<slug>-<hash>/visualmd.db` (while default `~/.visualmd/data` maintains backward compatibility with `~/.visualmd/visualmd.db`). Full-text search (FTS5), bookmarks, notes, and version history are 100% scoped to that specific directory with zero data bleeding.
- **Smart First-Time Seeding vs Clean Repositories**:
  - If a directory is **empty of documents**, VisualMD automatically seeds starter tutorial files, guides, and interactive bookmarks ("first-time use" experience).
  - If a directory **already contains existing files**, VisualMD skips example seeding, keeping your project files clean and untouched.
- **Automatic Stale Pruning & Subdirectory Mapping**: During reactive disk synchronization, documents from prior directories or deleted files are pruned automatically.
- **Workspace-Aware Explorer UI**: The sidebar Explorer header displays the active workspace directory name (`📁 project-name`), queryable via `GET /api/workspace` and `GET /api/health`.
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

### ✏️ Section-Wise "Edit Raw" (In-Place Section Correction & Re-Parsing)
Never worry about minor typos in complex math formulas (such as missing backslashes in `\frac` or `\text`), unclosed tags, or LaTeX formatting breaking an entire document:
- **Granular In-Place Editing**: Hover over any section (or click the **Edit Raw** `FileEdit` icon in the left margin or the top-right header) to open an inline raw editor card for that specific section.
- **Universal Support**: Edit raw syntax for standard Markdown, LaTeX equations, `$SNIPPET$`, `$STEPPER$`, `$TABS$`, `$CALLOUT$`, `$METRICS$`, `$QUIZ$`, and `$MINDMAP$` blocks directly.
- **Deterministic Replacement**: Uses line-range tracking (`startLine`–`endLine`) and raw node content matching to replace only the selected section in the underlying document.
- **Keyboard Shortcut**: Press <kbd>Ctrl + Enter</kbd> (or <kbd>⌘ + Enter</kbd>) to save and re-parse instantly with live UI refresh, or <kbd>Esc</kbd> to cancel. No full-page reload or manual file hunting required.

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
| **[`prompts/mindmap-prompt.md`](prompts/mindmap-prompt.md)** | Master AI prompt for standalone `.mindmap` files and `$MINDMAP$` blocks | Generate concept trees, architecture graphs, and study mind maps with zero formatting errors. |
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
| **Interactive Mind Map** | `$MINDMAP$S?title=System+Hierarchy`<br>`- Root`<br>`  - Child [badge: Core] [summary: Note]`<br>`$MINDMAP$E` | Draggable, zoomable canvas with concept inspector drawer, color-coded node badges, auto-layout, and standalone `.mindmap` file support. |
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
├── package.json                       # Monorepo configuration (version 1.0.2600008)
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
✔ VisualMD Compiler (29 unit tests) - 100% pass
✔ VisualMD Server & Security (16 integration tests) - 100% pass
Total: 45 tests, 45 passing, 0 failing
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

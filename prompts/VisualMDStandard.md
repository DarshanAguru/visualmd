# The VisualMD Specification (v1.2.0)
## Universal Standard for Rigorous, Researched, and Interactive Knowledge Synthesis

VisualMD is a deterministic, token-efficient, and LLM-optimized markup grammar designed for deep learning across all disciplines: Law, Medicine, Commerce, Finance, Natural Sciences, Humanities, Competitive Exam Preparation, and Software Engineering.

Instead of burning 3,000–10,000+ output tokens generating complex HTML, CSS, React, or conversational fluff, an LLM outputs **pure VisualMD Standard markup** in **400–1,200 tokens** formatted directly as a downloadable/saveable `.vmd` or `.md` file. The local VisualMD engine parses this standard into rich, interactive, sandboxed UI components.

---

## 1. Core Principles & Verification Mandate

1. **Token Efficiency & Direct File Output**:
   - Output directly as a saveable/downloadable `.vmd` or `.md` file. Eliminate conversational preamble, greetings, and postambles. Every tag is concise and unambiguous, cutting token waste by 50–80%.
2. **Subject Agnosticism**:
   - Designed for all domains of knowledge: legal codes, financial audits, medical differential diagnoses, macroeconomic policies, algorithmic proofs, and general competitive examination preparation.
3. **Empirical Authenticity & Zero Hallucination**:
   - Every statement, formula, medical contraindication, legal clause, or benchmark must be grounded in canonical reality, statutory law, official documentation, peer-reviewed literature, or primary whitepapers. Fabricated numbers or imagined statutes are strictly prohibited.
4. **Mandatory Primary Citations**:
   - Documents must conclude with an authoritative `## References` section linking to primary sources.
4. **Deterministic Block Grammar**:
   - Blocks open with `$KEYWORD$S` (Start) and terminate with `$KEYWORD$E` (End).
   - Parameters use URL-query style `?param1=value&param2=value` immediately after `$KEYWORD$S`.
5. **CommonMark / GFM Compatibility**:
   - Standard Markdown (headings, lists, bold, italics, tables, blockquotes, code blocks) is 100% valid VisualMD.
   - Mathematical expressions use standard KaTeX `$O(\log n)$` and `$$\sum_{i=1}^n x_i$$`.
   - Architectural flowcharts use standard Mermaid (` ```mermaid `) code fences.
6. **Fault Tolerance & Auto-Healing**:
   - The parser automatically heals unclosed tags at the next matching section header (`#{1,6}`), horizontal rule (`---`), or EOF without failing or crashing.

---

## 2. Interactive Macro Tags Specification

### 2.1 Code Snippets: `$SNIPPET$`
Renders an interactive syntax-highlighted code editor with line numbers, copy button, language badge, and diff capabilities.

**Syntax:**
```text
$SNIPPET$S?lang=typescript&title=WorkerPool.ts&highlight=3,4
class WorkerPool {
  private workers: Worker[] = [];
  constructor(size: number) {
    this.init(size);
  }
}
$SNIPPET$E
```

**Parameters:**
- `lang`: Programming language (e.g., `typescript`, `python`, `rust`, `go`, `sql`, `json`, `bash`).
- `title`: Filename or title displayed on the editor tab bar.
- `highlight`: Comma-separated line numbers to highlight (e.g., `1,4-6`).
- `diff`: `true` or `false` (when true, lines starting with `+` or `-` format as additions/deletions).

**Rigor Rule**: Code must be syntactically valid and production-grade. Avoid pseudo-code when concrete language syntax is specified.

---

### 2.2 Algorithm & Process Steppers: `$STEPPER$`
Renders an interactive, step-by-step playback component with next/prev buttons, breadcrumb navigation, and state commentary. Ideal for dry-running algorithms, distributed state transitions, or workflows.

**Syntax:**
```text
$STEPPER$S?title=Dijkstra+Shortest+Path+Execution
$STEP@1?title=Initialization
Initialize distances: distance[source] = 0, all other nodes = Infinity.
Priority queue: [(0, 'A')]. Visited: {}.
$STEP@2?title=Visit+Node+A
Pop 'A' (dist = 0).
Evaluate neighbors: 'B' (dist = 4), 'C' (dist = 2). Update queue: [(2, 'C'), (4, 'B')].
$STEP@3?title=Visit+Node+C
Pop 'C' (dist = 2, smallest in queue).
Evaluate neighbors of 'C': 'D' (dist = 2 + 5 = 7). Update queue: [(4, 'B'), (7, 'D')].
$STEPPER$E
```

**Parameters:**
- `title`: Header label for the stepper.
- `$STEP@<N>?title=<StepTitle>`: Delimits each individual step (where `<N>` is the 1-indexed step number). Content within each step can include text, bullet points, math, or inline code.

**Rigor Rule**: Every step must preserve exact algorithmic state and accurate intermediate variables without skipping state transitions.

---

### 2.3 Interactive Sandboxed Canvas: `$CANVAS$`
Executes dynamic client-side JavaScript inside an isolated, secure sandbox (`<iframe>` with strict CSP `connect-src 'none'`). Perfect for graph visualizations, physics simulations, queue diagrams, interactive calculators, or live algorithmic animations.

**Syntax:**
```text
$CANVAS$S?engine=canvas2d&height=320&title=Redis+LRU+Eviction+Simulator
<style>
  canvas { background: #111827; border-radius: 8px; width: 100%; height: 280px; }
</style>
<canvas id="cv" width="600" height="280"></canvas>
<script>
  const ctx = document.getElementById('cv').getContext('2d');
  ctx.fillStyle = '#38bdf8';
  ctx.font = '14px sans-serif';
  ctx.fillText('Active LRU Cache Keys: [A: 40ms, B: 12ms, C: 2ms]', 20, 40);
</script>
$CANVAS$E
```

**Parameters:**
- `engine`: `canvas2d`, `svg`, `html`, or `webgl`.
- `height`: Preferred height in pixels (default: `300`).
- `title`: Widget title displayed on the canvas card header.

---

### 2.4 Tabbed Architecture Comparisons: `$TABS$`
Renders sleek, switchable tabs for comparing alternatives (e.g., PostgreSQL vs MongoDB, gRPC vs REST, Raft vs Paxos).

**Syntax:**
```text
$TABS$S
$TAB?title=Kafka
- **Model**: Log-centric distributed streaming via partition logs.
- **Throughput**: > 1M events/sec with sequential pagecache writes.
- **Ordering**: Strict FIFO per partition.
- **Retention**: Configurable time/size-based disk persistence.
$TAB?title=Redis+Streams
- **Model**: In-memory radix tree with consumer groups.
- **Throughput**: Extremely low latency (< 1ms).
- **Ordering**: Monotonic millisecond timestamps.
- **Retention**: Configurable maxlen capping.
$TABS$E
```

**Rigor Rule**: Must provide balanced, concrete architectural trade-offs, operational failure modes, and hardware consumption factors for all compared systems.

---

### 2.5 Alert & Insight Callouts: `$CALLOUT$`
Renders visual insight cards highlighting key tradeoffs, performance gotchas, warnings, or best practices.

**Syntax:**
```text
$CALLOUT$S?type=perf&title=Linux+Pagecache+Zero-Copy+Optimization
Kafka leverages the Linux sendfile(2) system call to transfer bytes directly from OS pagecache to the network socket, bypassing user-space buffer allocation and eliminating 2 CPU memory copies.
$CALLOUT$E
```

**Supported Types:**
- `insight` / `tip` (Blue/Emerald): Pedagogical takeaways and design tips.
- `perf` (Purple): Performance metrics and optimization notes.
- `warn` / `caution` (Amber/Orange): Edge cases and architectural pitfalls.
- `danger` (Red): Breaking changes, data loss hazards, or split-brain risks.

---

### 2.6 Metrics & KPI Counters: `$METRICS$`
Renders executive dashboard statistic badges. Ideal for benchmarks, performance reviews, or system capacity specifications.

**Syntax:**
```text
$METRICS$S
P99 Latency: 1.8ms | Throughput (10GbE): 1.4M msg/s | CPU Utilization: 34% | Fault Tolerance: N-1 Nodes
$METRICS$E
```
*(Items separated by `|` or newlines, with `Label: Value` format).*

**Rigor Rule**: Benchmark figures must reflect real-world hardware contexts or published engineering studies, not arbitrary numbers.

---

### 2.7 Interactive Knowledge Checks: `$QUIZ$`
Renders self-evaluating question boxes with instant reveal for active learning retention.

**Syntax:**
```text
$QUIZ$S?q=Why+is+Kafka+able+to+achieve+zero-copy+transfer?
[ ] It compiles directly to x86 assembly.
[x] It uses the OS sendfile() system call directly from pagecache to socket.
[ ] It avoids writing data to disk.
[ ] It runs exclusively in JVM heap memory.
$EXPLANATION
Kafka bypasses user-space buffer allocation using the Linux sendfile() syscall, which moves bytes directly between OS pagecache and the network socket without intermediate CPU copying.
$QUIZ$E
```

**Parameters:**
- `q`: Question text (spaces encoded as `+` or `%20`).
- `[x]`: Correct option.
- `[ ]`: Incorrect options.
- `$EXPLANATION`: Comprehensive technical reasoning revealed upon user answer selection.

---

### 2.8 Standard Markdown, KaTeX & Mermaid
- **Math / LaTeX**: Inline `$O(V + E \log V)$` and display blocks `$$\sum_{i=1}^{n} X_i$$` rendered via KaTeX.
- **Mermaid Diagrams**: Fenced blocks ` ```mermaid ` render interactive SVG flowcharts, state machines, and sequence diagrams.
- **Tables & Typography**: Standard GitHub Flavored Markdown (GFM) tables, lists, blockquotes, and check-boxes.

---

## 3. Strict Verification & Anti-Hallucination Guidelines

When generating a VisualMD document, every AI agent must execute this verification pipeline:

1. **Information Retrieval & Sourcing**:
   - Cross-check technical assertions against canonical documentation (e.g., Linux Kernel docs, Apache Kafka Docs, Redis Documentation, IETF RFCs).
2. **Citation Anchoring**:
   - Provide concrete source references in a closing `## References & Documentation` section.
3. **Parameter Integrity**:
   - Ensure special characters in query parameters (such as `?title=...`) replace spaces with `+` or `%20`.
4. **Structural Completeness**:
   - All tags opened with `$TAG$S` must be closed with `$TAG$E`.

---

## 4. Complete Valid Example Document

```text
# Architecture Deep Dive: Kafka vs Redis Streams

$METRICS$S
Kafka Throughput: 1.2M msg/s | Kafka P99 Latency: 3.4ms | Redis Throughput: 850K ops/s | Redis P99 Latency: 420µs
$METRICS$E

$CALLOUT$S?type=insight&title=Architectural+Foundation
Kafka utilizes an append-only distributed commit log backed by OS pagecache. Redis Streams leverages an in-memory radix tree (rax) with optional asynchronous append-only file (AOF) persistence.

$TABS$S
$TAB?title=Apache+Kafka
- **Primary Design**: Distributed, horizontally scalable commit log partitioned across brokers.
- **Zero-Copy Transfer**: Employs Linux `sendfile(2)` system call to transfer pagecache data directly to NIC buffer.
- **Durability**: Configurable `acks=all` with `min.insync.replicas` guarantees zero message loss.
$TAB?title=Redis+Streams
- **Primary Design**: In-memory streaming data type structured as a radix tree of listpacks.
- **Zero-Copy Transfer**: Operates in memory; data resides directly in Redis server RAM.
- **Durability**: Asynchronous background saving (`BGSAVE`) or `fsync=everysec` AOF logging.
$TABS$E

$STEPPER$S?title=Kafka+Zero-Copy+Data+Path
$STEP@1?title=File+Read+into+Pagecache
Kernel reads data from disk storage into OS kernel pagecache buffer via DMA (Direct Memory Access).
$STEP@2?title=Syscall+Invocation
Kafka server invokes the Linux `sendfile(2)` system call, specifying socket file descriptor and pagecache offset.
$STEP@3?title=Direct+Socket+Buffer+Transfer
Kernel transfers packet headers and data directly to the network socket buffer without copying into user-space heap.
$STEP@4?title=NIC+DMA+Transmit
Network Interface Card (NIC) transfers data from socket buffer onto the network wire via DMA.
$STEPPER$E

$QUIZ$S?q=What+is+the+primary+tradeoff+of+Redis+Streams+compared+to+Kafka?
[ ] Redis Streams cannot support consumer groups.
[x] Redis Streams dataset size is constrained by physical RAM, whereas Kafka scales to petabytes on disk.
[ ] Redis Streams does not support monotonic event IDs.
$EXPLANATION
Redis Streams stores all stream entries in RAM (using a radix tree of listpacks), making it exceptionally fast (<1ms) but memory-bound. Kafka persists message segments directly to disk filesystem pagecache, enabling cost-effective multi-terabyte retention.
$QUIZ$E

## References & Documentation
- [Apache Kafka Official Documentation - Design & Zero Copy](https://kafka.apache.org/documentation/#design)
- [Redis Streams Documentation & Internal Implementation](https://redis.io/docs/latest/develop/data-types/streams/)
- [Linux Kernel Manual - sendfile(2)](https://man7.org/linux/man-pages/man2/sendfile.2.html)
```

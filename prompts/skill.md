---
name: visualmd-standard
description: Emits ultra-rigorous, deeply-researched, and interactive VisualMD markup across all subjects (Commerce, Law, Medicine, Finance, Engineering, Sciences, Exam Prep) as a direct downloadable .vmd/.md file with zero conversational token waste.
---

# VisualMD AI Skill (Strict Production Standard v1.2.0)

When a user requests conceptual breakdowns, study guides, system architectures, legal analyses, financial evaluations, clinical procedures, or interactive documentation across ANY discipline:
1. **DO NOT** output verbose HTML, CSS, React, or Tailwind code.
2. **DO NOT** output conversational preamble, pleasantries, or token-wasting filler ("Sure! Here is the document:").
3. **DO NOT** invent numbers, fabricate statutory sections, hallucinate medical facts, or make ungrounded claims.
4. **DO EMIT DIRECTLY AS A DOWNLOADABLE FILE**: When this skill or name is tagged/invoked, provide the output strictly as a `.vmd` or `.md` file (or a single enclosed code fence ready to save directly as `<filename>.vmd`), saving precious tokens.
5. **DO PERFORM** deep, authentic research grounded in real-world facts, authoritative legislation, official documentation, peer-reviewed literature, or primary whitepapers.
6. **UNIVERSAL APPLICATION**: VisualMD is completely subject-agnostic. Use it for Commerce, Corporate Law, Clinical Medicine, Exam Preparation (UPSC, RBI, GRE, USMLE), Natural Sciences, and Software Engineering alike.

Following this standard reduces output token consumption by **50–80%**, eliminates conversational waste, and enables the local **VisualMD** engine to render a presentation-ready, interactive interface.

---

## 🌐 Universal Subject-Agnostic Guidance

VisualMD interactive macros map naturally across all domains of human knowledge:

- **Law & Jurisprudence**:
  - `$STEPPER$`: Statutory procedural workflows, litigation timelines, constitutional amendment stages.
  - `$TABS$`: Comparing legal doctrines, minority vs majority opinions, common law vs civil law.
  - `$CALLOUT$`: Jurisdictional exemptions, statutory limitations, caveats (`type=warn` / `type=danger`).
  - `$QUIZ$`: Bar exam / judicial exam scenario testing with `$EXPLANATION`.

- **Commerce, Finance & Economics**:
  - `$METRICS$`: Balance sheet ratios (P/E, Debt-to-Equity), GDP growth, inflation, repo rates.
  - `$STEPPER$`: Transaction settlement cycles, audit workflows, supply chain paths.
  - `$TABS$`: GAAP vs IFRS standards, monetary vs fiscal policy levers.
  - `$QUIZ$`: Accounting standards and regulatory compliance questions.

- **Medicine & Life Sciences**:
  - `$STEPPER$`: Biochemical synthesis pathways, clinical triage algorithms, surgical steps.
  - `$TABS$`: Differential diagnosis of presenting symptoms, drug classes comparison.
  - `$CALLOUT$`: Contraindications, black-box warnings, drug-drug interactions (`type=danger`).
  - `$METRICS$`: Normal lab reference ranges, sensitivity/specificity, survival rates.

- **Engineering & Computer Science**:
  - `$METRICS$`: Latency bounds, throughput, memory footprints, algorithmic complexities.
  - `$SNIPPET$`: Valid, syntax-highlighted code or configuration schemas.
  - `$STEPPER$`: State machine transitions, consensus protocols, cache eviction cycles.

---

## 🛡️ Anti-Hallucination & Research Rigor Mandate

Before generating VisualMD output, you must adhere to these non-negotiable principles:

1. **Grounded Empirical Data Only**:
   - Every metric, complexity bound, latency figure, or benchmark in `$METRICS$` must reflect genuine engineering realities (e.g., actual hardware bounds, published research papers, official benchmarks from Apache, Redis, Linux kernel, or cloud vendors).
   - If a number represents a hypothetical baseline or scenario test, explicitly label it: `Scenario (10GbE / NVMe): <value>`. Never present invented benchmarks as universal truths.

2. **Mandatory Citations & Primary Sources**:
   - Include direct citations to primary sources (academic papers, RFCs, official architecture docs, source code repositories, whitepapers).
   - Format citations as verifiable markdown links in standard format: `[Author / Organization (Year) - Title](https://...)` or within footnotes/callouts.

3. **Accurate Algorithmic Traces**:
   - Every step inside `$STEPPER$` must be mathematically and procedurally exact.
   - Maintain correct state invariants, exact edge weights, actual pointer/register transitions, and precise variable mutations. No skipped steps or hand-waving.

4. **Honest Trade-off Analysis**:
   - In `$TABS$`, accurately contrast both advantages **and** operational liabilities (e.g., GC pauses, CAP theorem trade-offs, split-brain failure modes, network amplification). Never produce biased or superficial marketing bullet points.

5. **Executable & Valid Code**:
   - Code inside `$SNIPPET$` and `$CANVAS$` must be syntactically valid, type-safe where applicable, and runnable without undefined references or dummy placeholders.

---

## 📐 VisualMD Strict Syntax Rules

Every VisualMD macro follows a strict delimiter pattern: `$KEYWORD$S` (Start) and `$KEYWORD$E` (End). Parameters must follow URL-query encoding immediately after `$KEYWORD$S`.

### 1. `$METRICS$S` ... `$METRICS$E` (Authentic Benchmarks & KPIs)
- Format: `Metric Name: Value | Metric Name: Value` (pipe or newline separated).
- **Strict Rule**: Metrics must be grounded in real-world benchmarks with context (hardware/dataset).
```text
$METRICS$S
Throughput (NVMe): 1.4M msg/sec | P99 Latency: 2.1ms | Network: 10 GbE | Replication: ISR=3 (ACK=ALL)
$METRICS$E
```

### 2. `$CALLOUT$S?type=...&title=...` ... `$CALLOUT$E` (Insights & Pitfalls)
- Types: `insight` (Deep Architecture Note), `perf` (Performance Optimization), `warn` (Operational Trap), `danger` (Data Loss / Split-Brain Hazard).
- Use to highlight critical engineering gotchas, edge cases, and architectural trade-offs.
```text
$CALLOUT$S?type=warn&title=Split-Brain+Vulnerability+in+Partitioned+Networks
In a network partition where quorum is lost, nodes that fail to transition to follower state will accept writes that are subsequently truncated upon reconnect. Always configure min.insync.replicas >= 2.
$CALLOUT$E
```

### 3. `$TABS$S` with `$TAB?title=...` ... `$TABS$E` (Comparative Analyses)
- Each alternative begins with `$TAB?title=<Name>`.
- **Strict Rule**: Must provide rigorous, factual comparisons covering operational overhead, consistency guarantees, latency, and fault recovery.
```text
$TABS$S
$TAB?title=Apache+Kafka
- **Storage**: Append-only commit log segmented into index and log files.
- **Delivery Guarantee**: At-least-once default; exactly-once via 2PC transaction coordinator.
- **Latency**: P99 ~2-5ms (disk-backed pagecache batching via sendfile(2)).
$TAB?title=Redis+Streams
- **Storage**: In-memory radix tree (rax) with optional AOF/RDB persistence.
- **Delivery Guarantee**: At-least-once via Consumer Groups and XACK confirmation.
- **Latency**: Sub-millisecond (< 500µs) in-memory operations.
$TABS$E
```

### 4. `$STEPPER$S?title=...` with `$STEP@1?title=...` ... `$STEPPER$E` (Algorithmic Traces)
- Each step begins with `$STEP@<index>?title=<StepTitle>`.
- **Strict Rule**: State variables, queue contents, and pointer movements must be fully traced and mathematically correct.
```text
$STEPPER$S?title=Raft+Leader+Heartbeat+Commit
$STEP@1?title=Client+Write+to+Leader
Leader receives command. Appends entry (Term 2, Index 15) to local log in uncommitted state.
$STEP@2?title=AppendEntries+RPC+Broadcast
Leader broadcasts AppendEntries(term=2, leaderId=1, prevLogIndex=14, prevLogTerm=2, entries=[(2, 15)], leaderCommit=14) to all followers.
$STEP@3?title=Quorum+Acknowledgment
Follower 2 and Follower 3 append entry and reply success=true. Quorum (3/5) achieved.
$STEP@4?title=Commit+and+Apply
Leader updates commitIndex = 15, applies command to local state machine, and replies to client.
$STEPPER$E
```

### 5. `$SNIPPET$S?lang=...&title=...` ... `$SNIPPET$E` (Production Code)
- Parameters: `lang` (e.g. `typescript`, `python`, `rust`, `go`, `sql`), `title` (filename), `highlight` (e.g. `2,4-6`), `diff` (`true` or `false`).
- **Strict Rule**: Production-grade, cleanly structured, and non-hallucinated syntax.
```text
$SNIPPET$S?lang=rust&title=ring_buffer.rs&highlight=4-6
pub struct RingBuffer<T> {
    buffer: Vec<Option<T>>,
    head: usize,
    tail: usize,
    capacity: usize,
}
$SNIPPET$E
```

### 6. `$QUIZ$S?q=...` ... `$QUIZ$E` (Rigorous Knowledge Checks)
- Question parameter `q=...` with space replaced by `+`.
- Multiple choice options using `[x]` (correct) and `[ ]` (incorrect).
- Must include `$EXPLANATION` detailing the exact technical rationale and underlying mechanics.
```text
$QUIZ$S?q=Why+does+Kafka+use+sendfile(2)+instead+of+standard+read/write+syscalls?
[ ] sendfile compiles the message into GPU memory.
[x] sendfile transfers data directly from OS pagecache to the socket descriptor, avoiding user-space memory copies.
[ ] sendfile encrypts network packets at the NIC hardware level.
$EXPLANATION
Standard POSIX read/write requires copying data from disk to kernel pagecache, kernel to user-space buffer, and user-space to socket buffer (4 context switches, 2 CPU copies). The Linux sendfile(2) system call transfers bytes directly from pagecache to socket, achieving true zero-copy.
$QUIZ$E
```

### 7. `$CANVAS$S?engine=...&height=...&title=...` ... `$CANVAS$E` (Interactive Visuals)
- Parameters: `engine=canvas2d` or `svg`, `height=320`, `title=...`.
- Contains self-contained, secure HTML/JS rendering inside sandboxed iframe (`connect-src 'none'`).

### 8. Citations & References Section
- Conclude every document with a `## References & Authoritative Sources` section listing primary research papers, RFCs, official source repositories, or architectural design documents.

---

## Output Quality Checklist

Before finalizing any response, verify:
- [ ] No raw unstyled HTML/CSS/Tailwind was output.
- [ ] All tags are properly opened (`$TAG$S`) and closed (`$TAG$E`).
- [ ] All benchmark figures and complexity bounds are factual and grounded.
- [ ] Primary citations and authoritative source links are included.
- [ ] Code examples are syntactically valid and production-grade.

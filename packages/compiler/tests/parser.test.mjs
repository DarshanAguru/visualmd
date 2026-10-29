import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseVisualMD,
  validateVisualMD,
  buildDocumentMindMap,
  autoHealVisualMD,
  parseMindMapFile,
  parseBulletTree,
  healLatexString,
  VisualMDParseError,
  VisualMDValidationError,
  COMPILER_VERSION,
} from '../dist/index.js';

test('VisualMD Compiler - Standard Markdown and Title', () => {
  const input = `# Distributed Consensus

Raft is a consensus algorithm designed as an alternative to Paxos.
It guarantees state machine replication across a cluster.`;

  const doc = parseVisualMD(input);
  assert.equal(doc.title, 'Distributed Consensus');
  assert.equal(doc.nodes.length, 1);
  assert.equal(doc.nodes[0].type, 'markdown');
  assert.match(doc.nodes[0].content, /Raft is a consensus algorithm/);
});

test('VisualMD Compiler - Snippet Tag Parsing', () => {
  const input = `$SNIPPET$S?lang=typescript&title=Server.ts&diff=false
import express from 'express';
const app = express();
app.listen(9669);
$SNIPPET$E`;

  const doc = parseVisualMD(input);
  assert.equal(doc.nodes.length, 1);
  const node = doc.nodes[0];
  assert.equal(node.type, 'snippet');
  assert.equal(node.lang, 'typescript');
  assert.equal(node.title, 'Server.ts');
  assert.match(node.code, /app\.listen\(9669\)/);
});

test('VisualMD Compiler - Stepper Tag Parsing', () => {
  const input = `$STEPPER$S?title=Leader+Election+Flow
$STEP@1?title=Heartbeat+Timeout
Follower times out after 150-300ms.
$STEP@2?title=RequestVote+Broadcast
Transitions to Candidate and requests votes.
$STEPPER$E`;

  const doc = parseVisualMD(input);
  assert.equal(doc.nodes.length, 1);
  const node = doc.nodes[0];
  assert.equal(node.type, 'stepper');
  assert.equal(node.title, 'Leader Election Flow');
  assert.equal(node.steps.length, 2);
  assert.equal(node.steps[0].title, 'Heartbeat Timeout');
  assert.equal(node.steps[1].title, 'RequestVote Broadcast');
});

test('VisualMD Compiler - Tabs and Callout Parsing', () => {
  const input = `$TABS$S
$TAB?title=Option+A
Use PostgreSQL for ACID transactions.
$TAB?title=Option+B
Use Redis for sub-millisecond caching.
$TABS$E

$CALLOUT$S?type=perf&title=Cache+Hit+Ratio
Ensure cache hit ratio exceeds 95% to avoid saturating PostgreSQL connection pool.
$CALLOUT$E`;

  const doc = parseVisualMD(input);
  assert.equal(doc.nodes.length, 2);
  assert.equal(doc.nodes[0].type, 'tabs');
  assert.equal(doc.nodes[0].tabs.length, 2);
  assert.equal(doc.nodes[0].tabs[0].title, 'Option A');
  assert.equal(doc.nodes[0].tabs[1].title, 'Option B');

  assert.equal(doc.nodes[1].type, 'callout');
  assert.equal(doc.nodes[1].calloutType, 'perf');
  assert.equal(doc.nodes[1].title, 'Cache Hit Ratio');
});

test('VisualMD Compiler - Metrics and Quiz Parsing', () => {
  const input = `$METRICS$S
P99 Latency: 1.2ms | Max IOPS: 85,000 | Availability: 99.99%
$METRICS$E

$QUIZ$S?q=Which+component+manages+metadata?
[ ] Worker node
[x] Controller quorum
[ ] Load balancer
$EXPLANATION
The controller quorum maintains the canonical metadata log.
$QUIZ$E`;

  const doc = parseVisualMD(input);
  assert.equal(doc.nodes.length, 2);

  const metrics = doc.nodes[0];
  assert.equal(metrics.type, 'metrics');
  assert.equal(metrics.items.length, 3);
  assert.equal(metrics.items[0].label, 'P99 Latency');
  assert.equal(metrics.items[0].value, '1.2ms');

  const quiz = doc.nodes[1];
  assert.equal(quiz.type, 'quiz');
  assert.equal(quiz.question, 'Which component manages metadata?');
  assert.equal(quiz.options.length, 3);
  assert.equal(quiz.options[1].isCorrect, true);
  assert.equal(quiz.options[0].isCorrect, false);
  assert.match(quiz.explanation, /controller quorum/);
});

test('VisualMD Compiler - Fault Tolerance & Auto-Healing unclosed tags', () => {
  // An LLM hallucinated and forgot $SNIPPET$E, then outputted another section
  const input = `$SNIPPET$S?lang=python&title=test.py
def process():
    return 42

# Next Section
Regular markdown content continues here.`;

  const doc = parseVisualMD(input, { autoHeal: true });
  assert.equal(doc.nodes.length, 2);
  assert.equal(doc.nodes[0].type, 'snippet');
  assert.equal(doc.nodes[0].title, 'test.py');
  assert.match(doc.nodes[0].code, /def process\(\):/);
  assert.equal(doc.nodes[1].type, 'markdown');
  assert.match(doc.nodes[1].content, /Regular markdown content continues/);
});

test('VisualMD Compiler - Canvas Tag Parsing', () => {
  const input = `$CANVAS$S?engine=canvas2d&height=400&title=Simulation+Canvas
<canvas id="c"></canvas>
<script>
  console.log('running canvas simulation');
</script>
$CANVAS$E`;

  const doc = parseVisualMD(input);
  assert.equal(doc.nodes.length, 1);
  const node = doc.nodes[0];
  assert.equal(node.type, 'canvas');
  assert.equal(node.engine, 'canvas2d');
  assert.equal(node.height, 400);
  assert.equal(node.title, 'Simulation Canvas');
  assert.match(node.code, /<canvas id="c"><\/canvas>/);
});

test('VisualMD Validation - catches unclosed tags when checking', () => {
  const brokenInput = `$SNIPPET$S?lang=js
console.log('hello');`;

  const val = validateVisualMD(brokenInput);
  assert.equal(val.isValid, false);
  assert.equal(val.errors.length, 1);
  assert.match(val.errors[0], /was never closed/);
});

test('VisualMD Compiler - Pure Markdown Document Processing', () => {
  const pureMarkdown = `# Architecture Decision Record

## Context & Problem
We need high throughput distributed message ingestion.

| Property | Option 1 | Option 2 |
| :--- | :--- | :--- |
| Latency | Low | Sub-ms |
| Storage | Disk | Memory |

- [x] Evaluated Kafka
- [x] Evaluated Redis Streams
- [ ] Deploy to staging

> Note: Follow best practices for partition keys.
`;

  const doc = parseVisualMD(pureMarkdown);
  assert.equal(doc.title, 'Architecture Decision Record');
  assert.equal(doc.nodes.length, 1);
  assert.equal(doc.nodes[0].type, 'markdown');
  assert.match(doc.nodes[0].content, /Architecture Decision Record/);
  assert.match(doc.nodes[0].content, /Evaluated Kafka/);
  assert.match(doc.nodes[0].content, /Option 1/);
});

test('VisualMD Compiler - Complex Special Characters in Parameters', () => {
  const input = `$SNIPPET$S?lang=typescript&title=Service%20Worker%20%26%20Pool%2BManager&highlight=1%2C2%2C3
const pool = new Pool();
$SNIPPET$E`;

  const doc = parseVisualMD(input);
  assert.equal(doc.nodes.length, 1);
  const snippet = doc.nodes[0];
  assert.equal(snippet.type, 'snippet');
  assert.equal(snippet.title, 'Service Worker & Pool+Manager');
  assert.equal(snippet.highlight, '1,2,3');
});

test('VisualMD Compiler (v1.0.1) - Malformed URI and unescaped percent in parameters', () => {
  const input = `$METRICS$S?title=Q3%20Performance%20(100%25%20growth)&val=50%
CPU: 45% | RAM: 100%
$METRICS$E`;

  // Should never throw URIError: URI malformed
  const doc = parseVisualMD(input);
  assert.equal(doc.nodes.length, 1);
  assert.equal(doc.nodes[0].type, 'metrics');
  const metrics = doc.nodes[0];
  assert.equal(metrics.items.length, 2);
  assert.equal(metrics.items[1].value, '100%');
});

test('VisualMD Compiler (v1.0.1) - Case-insensitive macro tags & checklist quiz options', () => {
  const input = `$quiz$S?q=Case+Insensitive+Quiz
- [ ] Option A
- [x] Option B
* [ ] Option C
$explanation
Correct is B.
$quiz$E`;

  const doc = parseVisualMD(input);
  assert.equal(doc.nodes.length, 1);
  const quiz = doc.nodes[0];
  assert.equal(quiz.type, 'quiz');
  assert.equal(quiz.question, 'Case Insensitive Quiz');
  assert.equal(quiz.options.length, 3);
  assert.equal(quiz.options[0].isCorrect, false);
  assert.equal(quiz.options[1].isCorrect, true);
  assert.equal(quiz.options[2].isCorrect, false);
  assert.equal(quiz.explanation, 'Correct is B.');
});

test('VisualMD Compiler (v1.0.22) - Fenced code block immunity for raw macros in markdown', () => {
  const input = `# Markdown with Code Block
Here is code explaining VisualMD syntax:
\`\`\`markdown
$SNIPPET$S?lang=ts
console.log("hello");
$SNIPPET$E
\`\`\`
And here is a regular paragraph after code.`;

  const doc = parseVisualMD(input);
  assert.equal(doc.nodes.length, 1);
  assert.equal(doc.nodes[0].type, 'markdown');
  assert.match(doc.nodes[0].content, /\$SNIPPET\$S/);
  assert.match(doc.nodes[0].content, /And here is a regular paragraph/);
});

test('VisualMD Compiler - validateVisualMD code fence immunity', () => {
  const input = `# Guide
Here is unclosed syntax inside a code block:
\`\`\`markdown
$CALLOUT$S?type=warn
This callout is deliberately unclosed inside code fence.
\`\`\`
All code ends cleanly.`;

  const validation = validateVisualMD(input);
  assert.equal(validation.isValid, true);
  assert.equal(validation.errors.length, 0);
});

test('VisualMD Compiler - Callout aliases, case insensitivity, and Stepper without @N', () => {
  const input = `$CALLOUT$S?type=CAUTION&title=Caution+Title
Caution text here.
$CALLOUT$E

$CALLOUT$S?type=info&title=Info+Title
Info text here.
$CALLOUT$E

$STEPPER$S?title=Auto+Numbered+Steps
$STEP?title=First+Step
Do step 1.
$STEP?title=Second+Step
Do step 2.
$STEPPER$E`;

  const doc = parseVisualMD(input);
  assert.equal(doc.nodes.length, 3);
  assert.equal(doc.nodes[0].type, 'callout');
  assert.equal(doc.nodes[0].calloutType, 'warn');
  assert.equal(doc.nodes[1].type, 'callout');
  assert.equal(doc.nodes[1].calloutType, 'insight');

  const stepper = doc.nodes[2];
  assert.equal(stepper.type, 'stepper');
  assert.equal(stepper.steps.length, 2);
  assert.equal(stepper.steps[0].index, 1);
  assert.equal(stepper.steps[0].title, 'First Step');
  assert.equal(stepper.steps[1].index, 2);
  assert.equal(stepper.steps[1].title, 'Second Step');
});

test('VisualMD Compiler - Numbered Quiz options and bulleted Metrics cleaning', () => {
  const input = `$METRICS$S
- P99: 1.5ms
* Throughput: 1M
• Availability: 99.99%
$METRICS$E

$QUIZ$S?q=Numbered+Question
1. [ ] Option 1
2. [x] Option 2
A) [ ] Option 3
$QUIZ$E`;

  const doc = parseVisualMD(input);
  assert.equal(doc.nodes.length, 2);

  const metrics = doc.nodes[0];
  assert.equal(metrics.items[0].label, 'P99');
  assert.equal(metrics.items[1].label, 'Throughput');
  assert.equal(metrics.items[2].label, 'Availability');

  const quiz = doc.nodes[1];
  assert.equal(quiz.options.length, 3);
  assert.equal(quiz.options[0].text, 'Option 1');
  assert.equal(quiz.options[0].isCorrect, false);
  assert.equal(quiz.options[1].text, 'Option 2');
  assert.equal(quiz.options[1].isCorrect, true);
  assert.equal(quiz.options[2].text, 'Option 3');
  assert.equal(quiz.options[2].isCorrect, false);
});

test('VisualMD Compiler (v1.0.2482) - Null, undefined, and non-string input guards', () => {
  // Should never throw on null, undefined, numbers or objects
  // @ts-ignore
  const docNull = parseVisualMD(null);
  assert.equal(docNull.title, 'Untitled VisualMD Document');
  assert.equal(docNull.nodes.length, 0);

  // @ts-ignore
  const docUndefined = parseVisualMD(undefined);
  assert.equal(docUndefined.title, 'Untitled VisualMD Document');
  assert.equal(docUndefined.nodes.length, 0);

  // @ts-ignore
  const valNull = validateVisualMD(null);
  assert.equal(valNull.isValid, true);
  assert.equal(valNull.errors.length, 0);

  // @ts-ignore
  const valUndefined = validateVisualMD(undefined);
  assert.equal(valUndefined.isValid, true);
  assert.equal(valUndefined.errors.length, 0);
});

test('VisualMD Compiler (v1.0.2482) - Stepper unnumbered $STEP cleanMarkdownLines filtering', () => {
  const input = `# Workflow Guide

$STEPPER$S?title=Deployment+Steps
$STEP?title=Build+Artifacts
Execute build pipeline.
$STEP?title=Deploy+To+Staging
Deploy artifacts to staging cluster.
$STEPPER$E

Post deployment verification notes.`;

  const doc = parseVisualMD(input);
  assert.equal(doc.title, 'Workflow Guide');
  assert.equal(doc.nodes.length, 3);
  assert.equal(doc.nodes[0].type, 'markdown');
  assert.equal(doc.nodes[1].type, 'stepper');
  assert.equal(doc.nodes[2].type, 'markdown');
  assert.doesNotMatch(doc.nodes[2].content, /\$STEP/);
});

test('VisualMD Compiler (v1.0.2484) - Mathematical formulas inside Stepper and Quiz nodes', () => {
  const input = `# Basel III Capital Regulations

$STEPPER$S?title=Leverage+Framework
$STEP@1?title=Leverage+Ratio+Calculation
The Basel III leverage ratio is computed as:
$$\\text{Leverage Ratio (\\%)} = \\frac{\\text{Tier 1 Capital}}{\\text{Total Exposure}} \\times 100$$
Where minimum ratio is $4.0\\%$ for D-SIBs.
$STEPPER$E

$QUIZ$S?q=What+is+the+minimum+leverage+ratio+for+D-SIBs?
[ ] 3.0%
[ ] 3.5%
[x] 4.0%
[ ] 4.5%
$EXPLANATION
Under RBI regulations, D-SIBs must maintain $\\text{Leverage Ratio} \\ge 4.0\\%$.
$QUIZ$E`;

  const doc = parseVisualMD(input);
  assert.equal(doc.title, 'Basel III Capital Regulations');
  assert.equal(doc.nodes.length, 3);
  assert.equal(doc.nodes[0].type, 'markdown');
  assert.equal(doc.nodes[1].type, 'stepper');
  assert.equal(doc.nodes[2].type, 'quiz');

  const stepper = doc.nodes[1];
  assert.match(stepper.steps[0].content, /\\text\{Leverage Ratio/);
  assert.match(stepper.steps[0].content, /\$4\.0\\%\$/);

  const quiz = doc.nodes[2];
  assert.equal(quiz.question, 'What is the minimum leverage ratio for D-SIBs?');
  assert.equal(quiz.options.length, 4);
  assert.equal(quiz.options[2].isCorrect, true);
  assert.match(quiz.explanation, /\\text\{Leverage Ratio\}/);
});

test('VisualMD Compiler (v1.0.2486) - Financial and Absolute Value Math Formulas with Ampersands and Pipes', () => {
  const input = `# RBI Master Directions - Capital Adequacy

The Foreign Currency (FC) capital charge is determined by:
$$\\text{FC} = |\\text{Net P&L on Trading Book}| + |\\text{Net P&L on Banking Book}|$$

Where the total capital charge includes:
$\\text{Capital Charge} = \\max(|\\text{Long Net P&L}|, |\\text{Short Net P&L}|)$

And standalone raw equation:
\\text{FC} = |\\text{Net P&L on Trading Book}| + |\\text{Net P&L on Banking Book}|`;

  const doc = parseVisualMD(input);
  assert.equal(doc.title, 'RBI Master Directions - Capital Adequacy');
  assert.equal(doc.nodes.length, 1);
  assert.equal(doc.nodes[0].type, 'markdown');
  assert.match(doc.nodes[0].content, /\\text\{FC\} = \|\\text\{Net P&L on Trading Book\}\|/);
});

test('VisualMD Compiler (v1.0.2488) - MindMap Node Parsing with Hierarchical Bullet Trees', () => {
  const input = `# Computer Architecture
$MINDMAP$S?title=Memory+Hierarchy
- Memory Hierarchy
  - L1 Cache
    - Instruction Cache
    - Data Cache
  - L2 Cache
    - Unified 512KB
  - L3 Cache
    - Shared LLC
  - Main Memory (DRAM)
$MINDMAP$E`;

  const doc = parseVisualMD(input);
  assert.equal(doc.title, 'Computer Architecture');
  assert.equal(doc.nodes.length, 2);
  assert.equal(doc.nodes[0].type, 'markdown');
  assert.equal(doc.nodes[1].type, 'mindmap');

  const mm = doc.nodes[1];
  assert.equal(mm.title, 'Memory Hierarchy');
  assert.equal(mm.root.text, 'Memory Hierarchy');
  assert.equal(mm.root.children.length, 4);
  assert.equal(mm.root.children[0].text, 'L1 Cache');
  assert.equal(mm.root.children[0].children.length, 2);
  assert.equal(mm.root.children[0].children[0].text, 'Instruction Cache');
  assert.equal(mm.root.children[3].text, 'Main Memory (DRAM)');
});

test('VisualMD Compiler (v1.0.2488) - buildDocumentMindMap generates full document tree', () => {
  const input = `# Deep Learning Fundamentals
## Neural Network Basics
Introduction to perceptrons and feedforward networks.

### Activation Functions
ReLU, GELU, and Sigmoid functions.

$STEPPER$S?title=Backpropagation+Flow
$STEP@1?title=Forward+Pass
Compute activations layer by layer.
$STEP@2?title=Loss+Calculation
Compute cross-entropy loss.
$STEPPER$E

## Transformer Architecture
Attention mechanisms and self-attention layers.`;

  const doc = parseVisualMD(input);
  const mindMap = buildDocumentMindMap(doc);

  assert.equal(mindMap.text, 'Deep Learning Fundamentals');
  assert.ok(mindMap.children.length >= 2);
  assert.equal(mindMap.children[0].text, 'Neural Network Basics');
  assert.ok(mindMap.children[0].children.some((c) => c.text === 'Activation Functions'));
  const activationNode = mindMap.children[0].children.find((c) => c.text === 'Activation Functions');
  assert.ok(activationNode?.children?.some((c) => c.text.includes('Backpropagation Flow')));
  assert.equal(mindMap.children[1].text, 'Transformer Architecture');
});

test('VisualMD Compiler (v1.0.2488) - autoHealVisualMD repairs unclosed tags & aliases', () => {
  const malformed = `# Quantum Computing
$SNIPPET$START?lang=python
import qiskit
circuit = QuantumCircuit(2)

## Next Section
$STEPPER$S?title=Quantum+Teleportation
$STEP@1?title=Entangle+Bell+State
Prepare pair.`;

  const healed = autoHealVisualMD(malformed);
  assert.match(healed, /\$SNIPPET\$E/);
  assert.match(healed, /\$STEPPER\$E/);

  const doc = parseVisualMD(healed);
  assert.equal(doc.title, 'Quantum Computing');
  assert.equal(doc.nodes.length, 4);
  assert.equal(doc.nodes[0].type, 'markdown');
  assert.equal(doc.nodes[1].type, 'snippet');
  assert.equal(doc.nodes[2].type, 'markdown');
  assert.equal(doc.nodes[3].type, 'stepper');
});

test('VisualMD Compiler (v1.0.2488) - parseMindMapFile with bullet outline and JSON', () => {
  // Test 1: Plain bullet tree with title
  const bulletInput = `# Distributed Systems
- Consensus Protocols [badge: Core] [summary: Guarantees agreement across replicas]
  - Raft [summary: Leader election and log replication]
  - Paxos [badge: Foundational]
- Storage Engines [badge: Persistence]
  - LSM-Trees [type: concept] [summary: Write-optimized log structured merge trees]
  - B+ Trees [summary: Read-optimized balanced search trees]`;

  const parsedBullet = parseMindMapFile(bulletInput);
  assert.equal(parsedBullet.title, 'Distributed Systems');
  assert.equal(parsedBullet.root.text, 'Distributed Systems');
  assert.equal(parsedBullet.root.children.length, 2);
  assert.equal(parsedBullet.root.children[0].text, 'Consensus Protocols');
  assert.equal(parsedBullet.root.children[0].badge, 'Core');
  assert.equal(parsedBullet.root.children[0].summary, 'Guarantees agreement across replicas');
  assert.equal(parsedBullet.root.children[0].children[0].text, 'Raft');
  assert.match(parsedBullet.vmdContent, /\$MINDMAP\$S\?title=Distributed%20Systems/);

  // Test 2: JSON mindmap
  const jsonInput = JSON.stringify({
    title: 'Operating Systems',
    root: {
      text: 'Operating Systems',
      type: 'root',
      children: [
        { text: 'Process Management', badge: 'Kernel' },
        { text: 'Memory Management', summary: 'Virtual memory and paging' },
      ],
    },
  });

  const parsedJson = parseMindMapFile(jsonInput);
  assert.equal(parsedJson.title, 'Operating Systems');
  assert.equal(parsedJson.root.children.length, 2);
  assert.equal(parsedJson.root.children[0].badge, 'Kernel');
  assert.equal(parsedJson.root.children[1].summary, 'Virtual memory and paging');
});

test('VisualMD Compiler (v1.0.2488) - buildDocumentMindMap comprehensive concept extraction', () => {
  const docText = `# Artificial Intelligence Masterclass

Machine learning models learn patterns from empirical training distributions.

## Supervised Learning
Supervised learning uses labeled training pairs.

- Regression: Predicting continuous values.
  - Linear Regression: Minimizes sum of squared errors.
  - Ridge Regression [badge: L2]: Adds squared weight penalty.
- Classification: Categorizing into discrete classes.
  - Support Vector Machines: Maximizes margin width.
  - Decision Trees: Greedy recursive binary splitting.

Key objective equation:
$$L(\\theta) = \\frac{1}{N} \\sum_{i=1}^N (y_i - f(x_i))^2$$

> Regularization prevents catastrophic overfitting on noise.

**Gradient Descent**: First-order iterative optimization algorithm.

$SNIPPET$S?lang=python&title=Train+Loop
loss.backward()
optimizer.step()
$SNIPPET$E

$TABS$S
$TAB?title=CPU
High single-core performance.
$TAB?title=GPU
Massively parallel tensor throughput.
$TABS$E`;

  const doc = parseVisualMD(docText);
  const mm = buildDocumentMindMap(doc);

  assert.equal(mm.text, 'Artificial Intelligence Masterclass');
  const supLearning = mm.children.find((c) => c.text === 'Supervised Learning');
  assert.ok(supLearning, 'Supervised Learning heading should exist');

  // Verify nested bullets
  const regression = supLearning.children.find((c) => c.text === 'Regression');
  assert.ok(regression, 'Regression concept should be extracted');
  assert.equal(regression.summary, 'Predicting continuous values.');
  assert.ok(regression.children.length >= 2, 'Regression should contain nested children');
  assert.equal(regression.children[0].text, 'Linear Regression');
  assert.equal(regression.children[1].badge, 'L2');

  // Verify formula extraction
  const formulaNode = supLearning.children.find((c) => c.type === 'formula');
  assert.ok(formulaNode, 'Formula node should be extracted');
  assert.equal(formulaNode.badge, 'Formula');

  // Verify quote extraction
  const quoteNode = supLearning.children.find((c) => c.badge === 'Takeaway');
  assert.ok(quoteNode, 'Quote takeaway should be extracted');

  // Verify paragraph definition extraction
  const defNode = supLearning.children.find((c) => c.text === 'Gradient Descent');
  assert.ok(defNode, 'Gradient Descent definition should be extracted');

  // Verify snippet & tabs extraction
  const snippetNode = supLearning.children.find((c) => c.type === 'snippet');
  assert.ok(snippetNode, 'Snippet node should be extracted');

  const tabsNode = supLearning.children.find((c) => c.badge?.includes('Tabs'));
  assert.ok(tabsNode, 'Tabs node should be extracted');
  assert.equal(tabsNode.children.length, 2);
});

test('VisualMD Compiler (v1.0.2488) - Truncated Stream Auto-Healing for Code Fences, Math, and Macros', () => {
  // Truncated during LLM streaming: unclosed code fence
  const streamedCode = `# Streaming Code Test
Here is some code:
\`\`\`typescript
const client = new VisualMDClient();
// stream abruptly ended`;

  const healedCode = autoHealVisualMD(streamedCode);
  assert.match(healedCode, /```$/);

  // Truncated during math formula: unclosed math block ($$)
  const streamedMath = `# Streaming Math Test
Let the loss function be:
$$\\sum_{i=0}^n x_i^2`;

  const healedMath = autoHealVisualMD(streamedMath);
  assert.match(healedMath, /\$\$$/);

  // Truncated during macro streaming: unclosed $MINDMAP$S
  const streamedMacro = `# Live MindMap Stream
$MINDMAP$S?title=LLM+Reasoning
- Root Concept
  - Chain of Thought
  - Tree of Thoughts`;

  const parsedMacro = parseVisualMD(streamedMacro, { autoHeal: true });
  assert.equal(parsedMacro.title, 'Live MindMap Stream');
  const mmNode = parsedMacro.nodes.find((n) => n.type === 'mindmap');
  assert.ok(mmNode, 'MindMap node should be successfully healed and parsed');
  assert.equal(mmNode.title, 'LLM Reasoning');
  assert.equal(mmNode.root.children.length, 1);
  assert.equal(mmNode.root.children[0].text, 'Root Concept');
  assert.equal(mmNode.root.children[0].children.length, 2);
  assert.equal(mmNode.root.children[0].children[0].text, 'Chain of Thought');
});

test('VisualMD Compiler (v1.0.2488) - Strict Mode vs Resilient Default Mode', () => {
  const unclosedDoc = `# Broken Document
$STEPPER$S?title=Incomplete+Workflow
$STEP@1?title=Step+One
Content`;

  // Default mode: auto-heals without throwing
  const defaultDoc = parseVisualMD(unclosedDoc);
  assert.equal(defaultDoc.title, 'Broken Document');
  assert.ok(defaultDoc.nodes.some((n) => n.type === 'stepper'));

  // Strict mode: throws VisualMDValidationError
  assert.throws(
    () => {
      parseVisualMD(unclosedDoc, { strict: true });
    },
    (err) => {
      assert.ok(err instanceof VisualMDValidationError);
      assert.ok(err.unclosedTags.includes('$STEPPER$S'));
      return true;
    }
  );

  // Strict mode with non-string input: throws VisualMDParseError
  assert.throws(
    () => {
      parseVisualMD(12345, { strict: true });
    },
    (err) => {
      assert.ok(err instanceof VisualMDParseError);
      assert.equal(err.name, 'VisualMDParseError');
      return true;
    }
  );

  // Default mode with non-string input: safely converts to string
  const safeDoc = parseVisualMD(null);
  assert.equal(typeof safeDoc.title, 'string');
  assert.equal(Array.isArray(safeDoc.nodes), true);
});

test('VisualMD Compiler (v1.0.2600006) - Version and Canvas AST Payload Compatibility', () => {
  assert.equal(COMPILER_VERSION, '1.0.2600006');

  const richDoc = `# Full System Overview
$CALLOUT$S?type=insight&title=Core+Principle
Eventual consistency is sufficient for telemetry.
$CALLOUT$E

$METRICS$S
Latency: 12ms | Throughput: 450k/sec | Uptime: 99.99%
$METRICS$E

$SNIPPET$S?lang=typescript&title=Handler.ts
export function handle(req: Request) { return new Response(); }
$SNIPPET$E

$QUIZ$S?q=Is+VisualMD+canvas+embeddable?
[x] Yes, in React, Angular, Vue, and HTML
[ ] No, it only runs on the local server
$EXPLANATION
VisualMD v1.0.2600002 provides first-class embeddable canvas components.
$QUIZ$E`;

  const doc = parseVisualMD(richDoc);
  assert.equal(doc.title, 'Full System Overview');
  assert.equal(doc.nodes.length, 5);

  // Verify node payload structure consumed by <VisualMDCanvas />
  const [header, callout, metrics, snippet, quiz] = doc.nodes;
  assert.equal(header.type, 'markdown');
  assert.equal(callout.type, 'callout');
  assert.equal(metrics.type, 'metrics');
  assert.equal(snippet.type, 'snippet');
  assert.equal(quiz.type, 'quiz');
});

test('VisualMD Compiler (v1.0.2600002) - MindMap Heading and Section Non-Blank Description Guarantee', () => {
  const input = `# Master System Design
## Core Architecture: Event Sourcing & CQRS
Event sourcing stores all state changes as an immutable sequence of events.

## Storage Layer
- RocksDB: Embedded key-value store for fast SSD I/O.
- Kafka: Distributed event streaming log.

## Ingestion Pipeline [badge: Ingest] [summary: High throughput WebSocket and gRPC gateway]
$STEPPER$S?title=Data+Flow
$STEP@1?title=Packet+Received
Validates auth headers.
$STEPPER$E

## Empty Section Heading Without Direct Paragraph
### Sub-Concept Alpha
Alpha implementation details.`;

  const doc = parseVisualMD(input);
  const mm = buildDocumentMindMap(doc);

  assert.equal(mm.text, 'Master System Design');
  assert.ok(mm.children.length >= 4);

  // 1. Heading with colon definition and following paragraph description
  const archHeading = mm.children.find((c) => c.text === 'Core Architecture');
  assert.ok(archHeading, 'Core Architecture heading must exist');
  assert.match(archHeading.summary, /Event Sourcing & CQRS/);
  assert.match(archHeading.summary, /immutable sequence of events/);

  // 2. Heading with list only (synthesized summary)
  const storageHeading = mm.children.find((c) => c.text === 'Storage Layer');
  assert.ok(storageHeading, 'Storage Layer heading must exist');
  assert.ok(storageHeading.summary, 'Storage Layer must have non-blank summary');
  assert.match(storageHeading.summary, /RocksDB|Kafka|topic|Section/i);

  // 3. Heading with explicit inline [summary: ...] tag
  const ingestHeading = mm.children.find((c) => c.text === 'Ingestion Pipeline');
  assert.ok(ingestHeading, 'Ingestion Pipeline heading must exist');
  assert.equal(ingestHeading.summary, 'High throughput WebSocket and gRPC gateway');
  assert.equal(ingestHeading.badge, 'Ingest');

  // 4. Heading without direct paragraph or explicit tag (synthesized summary)
  const emptyHeading = mm.children.find((c) => c.text === 'Empty Section Heading Without Direct Paragraph');
  assert.ok(emptyHeading, 'Empty heading must exist');
  assert.ok(emptyHeading.summary, 'Empty heading must have non-blank summary');
  assert.match(emptyHeading.summary, /Sub-Concept Alpha|Section/i);
});

test('VisualMD Compiler (v1.0.2600002) - Section raw content, startLine and endLine tracking', () => {
  const input = `# Document Title

This is introductory markdown text with a math formula:
$$\\text{Monthly Pension} = \\frac{\\text{Salary} \\times \\text{Years}}{70}$$

$SNIPPET$S?lang=ts&title=Test.ts
const a = 1;
$SNIPPET$E

Final conclusion paragraph.`;

  const doc = parseVisualMD(input);
  assert.equal(doc.nodes.length, 3);

  // First markdown node
  const n0 = doc.nodes[0];
  assert.equal(n0.type, 'markdown');
  assert.ok(n0.raw);
  assert.match(n0.raw, /Monthly Pension/);
  assert.equal(typeof n0.startLine, 'number');
  assert.equal(typeof n0.endLine, 'number');
  assert.ok(n0.endLine >= n0.startLine);

  // Snippet node
  const n1 = doc.nodes[1];
  assert.equal(n1.type, 'snippet');
  assert.ok(n1.raw);
  assert.match(n1.raw, /\$SNIPPET\$S\?lang=ts&title=Test\.ts/);
  assert.match(n1.raw, /const a = 1;/);
  assert.match(n1.raw, /\$SNIPPET\$E/);
  assert.equal(typeof n1.startLine, 'number');
  assert.equal(typeof n1.endLine, 'number');
  assert.ok(n1.startLine > n0.endLine);

  // Second markdown node
  const n2 = doc.nodes[2];
  assert.equal(n2.type, 'markdown');
  assert.ok(n2.raw);
  assert.match(n2.raw, /Final conclusion paragraph/);
  assert.ok(n2.startLine > n1.endLine);
});

test('VisualMD Compiler (v1.0.2600002) - Swallowed LaTeX auto-healing and indented math blocks', () => {
  const corruptedFormula = 'ext{Monthly Pension} = rac{ ext{Pensionable Salary} imes ext{Pensionable Service}}{70}';
  const healed = healLatexString(corruptedFormula);

  assert.match(healed, /\\text\{Monthly Pension\}/);
  assert.match(healed, /\\frac\{/);
  assert.match(healed, /\\times/);
  assert.match(healed, /\\text\{Pensionable Salary\}/);

  // Test full document autoHeal with 5 spaces before $$
  const input = `# EPS-95 Document

- **Pension Calculation Formula (EPS-95)**:
     $$    ext{Monthly Pension} = rac{ ext{Pensionable Salary} imes ext{Pensionable Service}}{70}$$

Additional context.`;

  const healedDocText = autoHealVisualMD(input);
  // Indented $$ must be normalized so CommonMark won't parse it as an indented code block
  assert.match(healedDocText, /\$\$\s*\\text\{Monthly Pension\}/);
  assert.match(healedDocText, /\\frac\{/);

  // Test MindMap hierarchical nesting
  const doc = parseVisualMD(input);
  const mm = buildDocumentMindMap(doc);
  assert.equal(mm.text, 'EPS-95 Document');

  // Verify the list item has the healed formula as its child
  const pensionNode = mm.children.find((c) => c.text.includes('Pension Calculation Formula'));
  assert.ok(pensionNode, 'Pension Calculation Formula node must exist');
  assert.ok(pensionNode.children && pensionNode.children.length > 0, 'Formula must be nested under list item');
  const formulaChild = pensionNode.children[0];
  assert.equal(formulaChild.type, 'formula');
  assert.match(formulaChild.summary, /\\text\{Monthly Pension\}/);
  assert.match(formulaChild.summary, /\\frac\{/);
});

test('VisualMD Compiler (v1.0.2600006) - Comprehensive Math Scenarios (Degrees, En-Dashes in Bullets, and Numbered Formulas)', () => {
  // 1. Test healLatexString with degree variations and unicode en-dashes
  assert.equal(healLatexString('55^circ'), '55^\\circ');
  assert.equal(healLatexString('55°'), '55^\\circ ');
  assert.equal(healLatexString('55\\degree'), '55^\\circ ');
  assert.equal(healLatexString('16–21'), '16\\text{–}21');
  assert.equal(healLatexString('16\\text{–}21'), '16\\text{–}21');

  // 2. Test autoHealVisualMD loose spacing normalization for degrees and en-dash ranges
  const input = 'The angle is $ 55^\\circ $ degrees and angle B is $ 90^circ $. Scores: $ 16\\text{–}21, 21\\text{–}11 $.';
  const healed = autoHealVisualMD(input);
  assert.match(healed, /\$55\^\\circ\$/);
  assert.match(healed, /\$16\\text\{–\}21, 21\\text\{–\}11\$/);

  // 3. Document with bullet item containing inline math starting with digits and en-dash
  const docText = `# Geometry & Match Records
- Angle of incidence: $55^\\circ$
- Loose angle: $ 55^\\circ $
- Match sets: $16\\text{–}21, 21\\text{–}11, 21\\text{–}12$.
- Item cost is $50 and shipping is $10.`;

  const doc = parseVisualMD(docText);
  assert.equal(doc.title, 'Geometry & Match Records');
  assert.equal(doc.nodes.length, 1);
  assert.equal(doc.nodes[0].type, 'markdown');
  assert.match(doc.nodes[0].content, /\$16\\text\{–\}21, 21\\text\{–\}11, 21\\text\{–\}12\$\./);

  // Mind map hierarchy should extract concept bullet nodes safely
  const mm = buildDocumentMindMap(doc);
  assert.equal(mm.text, 'Geometry & Match Records');
  assert.ok(mm.children.length >= 3);
  // 4. Test math with unicode operators like ±, ≤, ≥, ≠
  const unicodeMathInput = 'Margin of error is $ 10 ± 2 % $ and limits are $ 5 ≤ x ≤ 100 $.';
  const unicodeHealed = autoHealVisualMD(unicodeMathInput);
  assert.match(unicodeHealed, /\$10 ± 2 %\$/);
  assert.match(unicodeHealed, /\$5 ≤ x ≤ 100\$/);
});

test('VisualMD Compiler (v1.0.2600006) - Intelligent Mini-LLM Parser (GitHub Alerts, Container Admonitions, Math Environments & Table Auto-Healing)', () => {
  // 1. GitHub Alert transformation into Callout node
  const alertDoc = `# Technical Spec
> [!NOTE] Deployment Architecture
> Production deployments require multi-region failover.
> Ensure read replicas are warm.

> [!TIP]
> Use Redis clustering for session caching.

> [!WARNING] Breaking Change
> API v1 will be deprecated by Q3.`;

  const parsedAlerts = parseVisualMD(alertDoc);
  assert.equal(parsedAlerts.title, 'Technical Spec');
  // Should produce callout nodes
  const callouts = parsedAlerts.nodes.filter((n) => n.type === 'callout');
  assert.equal(callouts.length, 3);
  assert.equal(callouts[0].calloutType, 'insight');
  assert.equal(callouts[0].title, 'Deployment Architecture');
  assert.match(callouts[0].content, /Production deployments require multi-region failover/);

  assert.equal(callouts[1].calloutType, 'tip');
  assert.equal(callouts[1].title, 'Tip');
  assert.match(callouts[1].content, /Use Redis clustering/);

  assert.equal(callouts[2].calloutType, 'warn');
  assert.equal(callouts[2].title, 'Breaking Change');
  assert.match(callouts[2].content, /API v1 will be deprecated/);

  // 2. Container Admonition transformation
  const containerDoc = `# Container Guide
:::warning Database Migration
Ensure you backup before running db:migrate.
:::`;
  const parsedContainer = parseVisualMD(containerDoc);
  const containerCallouts = parsedContainer.nodes.filter((n) => n.type === 'callout');
  assert.equal(containerCallouts.length, 1);
  assert.equal(containerCallouts[0].calloutType, 'warn');
  assert.equal(containerCallouts[0].title, 'Database Migration');
  assert.match(containerCallouts[0].content, /Ensure you backup/);

  // 3. Raw LaTeX Math Environments without $$ auto-wrapping
  const mathEnvDoc = `# Calculus Notes
\\begin{align}
f(x) &= x^2 + 2x + 1 \\\\
     &= (x + 1)^2
\\end{align}`;
  const healedMath = autoHealVisualMD(mathEnvDoc);
  assert.match(healedMath, /\$\$\s*\\begin\{align\}[\s\S]*?\\end\{align\}\s*\$\$/);

  // 4. Broken Markdown Table (Missing Separator Row)
  const brokenTable = `# Metrics Summary
| Metric | Q1 Target | Q1 Actual |
| Revenue | $10M | $12.5M |
| Retention | 85% | 89% |`;
  const healedTable = autoHealVisualMD(brokenTable);
  assert.match(healedTable, /\| Metric \| Q1 Target \| Q1 Actual \|\s*\n\s*\| --- \| --- \| --- \|\s*\n\s*\| Revenue/);
});










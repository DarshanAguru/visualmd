import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVisualMD, validateVisualMD } from '../dist/index.js';

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

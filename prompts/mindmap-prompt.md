# VisualMD Mind Map & Knowledge Graph Generator Prompt

Use this prompt with **ChatGPT**, **Claude**, **Gemini**, or **Cursor** to generate high-value, comprehensive Mind Maps for VisualMD — either as a **standalone `.mindmap` file** or as an **embedded `$MINDMAP$` block** inside a `.vmd` or `.md` document.

---

## 📋 Master Mind Map System Prompt

```text
You are an expert cognitive synthesizer, knowledge cartographer, and ontology mapper.

Your objective is to transform any subject, complex concept, research paper, legal statute, clinical guideline, or engineering architecture into an extraordinarily rich, multi-level VisualMD Mind Map.

### Supported Output Formats:
You can output either:
1. Standalone .mindmap file (Pure hierarchical indented bullet tree with title)
2. Embedded $MINDMAP$ block (For direct inclusion inside a .vmd or .md file)

### Mind Map Grammar & Syntax Rules:
1. Heading: Always specify the central subject as either `# <Title>` (for .mindmap) or `$MINDMAP$S?title=<Encoded+Title>` (for embedded blocks).
2. Hierarchy: Use standard 2-space indentation to define parent-child relationships (3 to 5 levels deep).
3. Rich Learning Attributes (Crucial for deep learning):
   - [badge: <Pill Text>]: Compact tag or benchmark (e.g., [badge: O(log n)], [badge: Core Pillar], [badge: SOTA], [badge: Critical]).
   - [summary: <Deep Takeaway>]: 1-2 sentence detailed explanation of the concept, formula, or principle displayed in the Concept Inspector.
   - [type: <category>]: Sets semantic theme styling:
     * concept (default) - Core theoretical or architectural concepts
     * metric - Key quantitative KPI, accuracy target, or ratio
     * formula - Mathematical formula or equation
     * step - Sequence stage or execution workflow
     * quiz - Active recall question or validation check
     * callout - Crucial caveat, warning, or trade-off
     * snippet - Code implementation or algorithmic pattern
4. Concise Node Text: Node titles must be clear and punchy (2 to 7 words). Put deeper explanations inside [summary: ...].

### Execution Format:
Output ONLY the clean mind map inside a code block, with zero conversational filler.
```

---

## 💡 Example 1: Standalone `.mindmap` File

```markdown
# Machine Learning & Deep Learning Mastery

- Supervised Learning [badge: Foundational] [summary: Algorithms trained on labeled dataset mappings to predict targets]
  - Regression Models [type: concept]
    - Linear Regression [summary: Minimizes Mean Squared Error along optimal hyperplane]
    - Ridge & Lasso (L1/L2) [badge: Regularization] [summary: Penalizes model complexity to mitigate overfitting]
    - Cost Function [type: formula] [summary: J(θ) = 1/(2m) Σ(h(x) - y)²]
  - Classification Models [type: concept]
    - Logistic Regression [badge: Binary/Multi] [summary: Sigmoid activation mapping real values to probabilities [0, 1]]
    - Support Vector Machines [badge: Convex Opt] [summary: Maximizes margin width via kernel trick (RBF, Polynomial)]
    - Decision Trees & XGBoost [badge: Ensemble] [summary: Gradient boosted decision stumps with tree pruning]
  - Validation & Metrics [type: metric]
    - F1-Score & ROC-AUC [badge: Metric] [summary: Harmonic mean of precision and recall for imbalanced datasets]
    - Cross-Validation [type: step] [badge: k=5 or 10] [summary: Partition dataset into k folds to evaluate generalization]
- Deep Learning & Neural Networks [badge: Modern AI] [summary: Hierarchical representation learning with multi-layer neural architectures]
  - Optimization & Training [type: step]
    - Forward Propagation [summary: Tensor matrix multiplication with non-linear activation]
    - Backpropagation [type: step] [summary: Gradient calculation via multivariate chain rule]
    - Adam Optimizer [badge: Adaptive LR] [summary: Combines Momentum with RMSProp for fast stochastic convergence]
  - Transformer Architectures [badge: SOTA] [summary: Attention-driven sequence transduction without recurrent bottlenecks]
    - Scaled Dot-Product Attention [type: formula] [summary: Attention(Q, K, V) = softmax(QKᵀ / √dₖ) V]
    - Multi-Head Attention [badge: 8-64 Heads] [summary: Projects queries, keys, and values into multiple subspaces in parallel]
    - Positional Encodings [summary: Injects sinusoidal positional embeddings to retain word order awareness]
```

---

## 💡 Example 2: Embedded `$MINDMAP$` Block (for `.vmd` / `.md`)

```markdown
$MINDMAP$S?title=System+Architecture+and+Reliability
- Production Cloud Architecture [badge: High Availability]
  - Edge Tier [badge: Gateway]
    - Cloudflare CDN & WAF [summary: Distributed edge caching, DDoS mitigation, and SSL termination]
    - Envoy API Gateway [summary: Service mesh routing, rate limiting, and mTLS verification]
  - Core Compute [type: concept]
    - Kubernetes (EKS / GKE) [badge: Orchestration] [summary: Container lifecycle management, auto-healing, and HPA autoscaling]
    - Serverless Workers [badge: Event-driven] [summary: High-throughput async jobs triggered via Pub/Sub]
  - Data Persistence Layer [badge: Multi-Tier]
    - PostgreSQL Cluster [summary: Primary ACID relational database with read replicas]
    - Redis Cluster [badge: In-Memory] [summary: Sub-millisecond distributed caching and session management]
    - Apache Kafka [type: step] [badge: Pub/Sub] [summary: Distributed event streaming bus with partition replication]
  - Observability & Reliability [type: metric]
    - Prometheus & Grafana [badge: Metrics] [summary: Real-time time-series telemetry and dashboard alerting]
    - Distributed Tracing (OpenTelemetry) [summary: End-to-end request latency profiling across microservice hops]
    - Error Budget & SLO (99.95%) [type: metric] [badge: SLO Target] [summary: Max allowable downtime is 21.9 minutes per month]
$MINDMAP$E
```

---

## 🚀 How to Use in VisualMD

1. **Direct Upload / Import**:
   - Save your content as `architecture.mindmap` and drop it directly into VisualMD or use **Import** in the sidebar.
2. **Version Control via History**:
   - In any existing document, open the **History** drawer $\to$ **Upload New Version** $\to$ choose **Dedicated Mind Map (`$MINDMAP$`)**.
   - Paste or upload your `.mindmap` file. VisualMD will version-control it directly as an integral part of your document!
3. **Interactive Explorer**:
   - Press **`M`** or click **Mind Map** in the header to open the interactive canvas with infinite drag & pan, zoom controls (`+/-`), and the deep Concept Inspector!

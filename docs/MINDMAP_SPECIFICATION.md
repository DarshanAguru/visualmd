# VisualMD `.mindmap` File Specification & Architecture Guide

VisualMD supports first-class **Mind Maps** both as **standalone `.mindmap` files** and as **embedded `$MINDMAP$` blocks** within `.vmd` and `.md` documents.

This specification details the syntax, attributes, data structures, and best practices for creating and generating mind maps.

---

## 1. Supported Formats

VisualMD automatically detects and parses three formats in `.mindmap` files:

### Format A: Hierarchical Indented Bullets (Recommended)
The cleanest, most human-readable, and LLM-friendly format. Uses standard 2-space or 4-space indentation.

```markdown
# Machine Learning Roadmap

- Supervised Learning [badge: Core] [summary: Learning from labeled datasets]
  - Regression [type: concept]
    - Linear Regression [summary: Fits an optimal straight line minimizing MSE]
    - Polynomial Regression [badge: Non-linear]
  - Classification [type: concept]
    - Support Vector Machines (SVM) [summary: Maximizes margin between decision boundaries]
    - Decision Trees & Random Forests [badge: Ensemble]
- Unsupervised Learning [badge: Exploratory]
  - Clustering [type: concept]
    - K-Means Clustering [summary: Partitions observations into k Voronoi cells]
    - DBSCAN [badge: Density-based]
  - Dimensionality Reduction
    - PCA (Principal Component Analysis) [summary: Orthogonal linear transformation]
- Deep Learning & Neural Networks [badge: Modern AI]
  - Transformers [badge: State-of-the-Art] [summary: Attention-based architecture eliminating recurrence]
    - Self-Attention Mechanism [summary: Computes query, key, value matrix compatibility]
    - Multi-Head Attention [badge: Parallelized]
```

### Format B: Embedded VisualMD Macro Block (`$MINDMAP$`)
Used when embedding a curated mind map directly inside a VisualMD `.vmd` or `.md` document:

```markdown
$MINDMAP$S?title=System%20Architecture
- Distributed Core [badge: Backend]
  - API Gateway [summary: Reverse proxy, rate limiting, and JWT validation]
  - Microservices
    - Auth Service [badge: OAuth2]
    - Data Processing Pipeline [badge: Kafka]
- Persistence Layer [badge: Storage]
  - SQLite with WAL Mode [summary: Embedded ACID relational storage]
  - Redis Cache [summary: In-memory low latency session store]
$MINDMAP$E
```

### Format C: Structured JSON Mind Map (`.mindmap` / `.json`)
For programmatic export, API integrations, and tooling:

```json
{
  "title": "Data Structures & Algorithms",
  "root": {
    "id": "root-1",
    "text": "Data Structures & Algorithms",
    "type": "root",
    "badge": "Computer Science",
    "children": [
      {
        "id": "node-1",
        "text": "Linear Structures",
        "type": "concept",
        "badge": "Foundational",
        "children": [
          {
            "id": "node-1-1",
            "text": "Arrays & Dynamic Arrays",
            "summary": "Contiguous memory with O(1) random index access",
            "badge": "O(1) Access"
          },
          {
            "id": "node-1-2",
            "text": "Linked Lists",
            "summary": "Pointer-chained nodes allowing efficient O(1) insertions",
            "badge": "Singly/Doubly"
          }
        ]
      }
    ]
  }
}
```

---

## 2. Inline Attribute Tags

You can enrich any bullet item with metadata tags:

| Attribute Tag | Description | Example |
|---|---|---|
| `[badge: ...]` | Visual pill badge displayed at the top of the node card | `[badge: SOTA]` or `[badge: O(log n)]` |
| `[summary: ...]` | Deep takeaway summary displayed in the Concept Inspector | `[summary: Backpropagation computes gradient vectors via chain rule]` |
| `[type: ...]` | Semantic category styling (colors & icons) | `[type: metric]`, `[type: formula]`, `[type: step]` |

### Semantic Node Types:
- `concept` (default): Sky blue accent with lightbulb icon.
- `metric`: Emerald green accent with gauge icon (KPIs, accuracy, benchmarks).
- `step`: Violet accent with sequence stepper icon (workflows, algorithm steps).
- `quiz`: Fuchsia accent with checkmark icon (active recall questions).
- `callout`: Amber accent with alert icon (crucial warnings, edge cases).
- `formula`: Cyan accent with equation icon (LaTeX and math relationships).
- `snippet`: Indigo accent with code bracket icon (algorithms, code implementations).

### Definition Auto-Detection:
If a bullet begins with `**Term**: Definition` or `Term: Definition`, VisualMD automatically assigns the term as the node title and the definition as the takeaway summary:
```markdown
- **Gradient Descent**: First-order iterative optimization algorithm for finding a local minimum.
- **Learning Rate**: Hyperparameter determining step size at each iteration.
```

---

## 3. How to Use `.mindmap` Files in VisualMD

### Option 1: Direct File Import
1. Drag and drop any `.mindmap` file into the VisualMD document list or click **Import** in the sidebar.
2. VisualMD automatically reads the hierarchy, sets the document title, and renders the mind map as an interactive document.

### Option 2: Version Control via History Drawer
1. Open any existing `.vmd` or `.md` document in VisualMD.
2. Click **History** in the top navigation bar.
3. Switch to **Upload New Version** $\to$ select **Dedicated Mind Map (`$MINDMAP$`)**.
4. Drop your `.mindmap` file or paste the bullet points.
5. VisualMD merges the mind map as an integral part of the document and saves it as a version snapshot.

### Option 3: Fullscreen Exploration
1. In the document viewer, click the **Mind Map** button in the header (or press `M`).
2. Toggle between **Curated Mind Map** (your custom uploaded map) and **Auto Knowledge Graph** (auto-extracted from the document).
3. Use click & drag to pan the infinite canvas, scroll / `+/-` keys to zoom, and click any node to inspect full learning takeaways in the Concept Inspector.

# Contributing to VisualMD

Thank you for your interest in contributing to VisualMD! We welcome contributions from developers, researchers, and technical writers worldwide.

---

## 1. Development Setup

VisualMD uses npm workspaces to manage its packages. You do not need to install packages individually; running `npm install` at the root configures everything automatically.

### Prerequisites:
- **Node.js**: v22.0.0 or higher
- **npm**: v10.0.0 or higher

### Steps:
```bash
# 1. Clone the repository
git clone https://github.com/your-username/visualmd.git
cd visualmd

# 2. Install all dependencies across all packages in a single command
npm install

# 3. Build all packages
npm run build

# 4. Run tests
npm test

# 5. Start the local server
npm start
```

---

## 2. Project Architecture

The project is structured into three decoupled packages:
- **`packages/compiler`**: The fault-tolerant AST tokenizer, parser, and auto-healing engine.
- **`packages/server`**: The local-first SQLite WAL persistence layer, CLI executable, and REST API.
- **`packages/web`**: The React 19 + Vite + Tailwind CSS workspace UI.
- **`prompts/`**: The system prompts, skill definition, and VisualMD standard reference.
- **`data/`**: Central local directory for user markdown and VisualMD documents.

---

## 3. Pull Request Guidelines

1. **Create a topic branch**: `git checkout -b feature/my-new-feature`
2. **Follow code style**: TypeScript strict mode is enabled. Ensure clean typings.
3. **Add tests**: If adding a new parser tag or server endpoint, add corresponding tests in `tests/*.test.mjs`.
4. **Verify tests pass**: Run `npm test` before submitting your PR.
5. **Keep commits clean and descriptive**.

---

## 4. Reporting Issues

When filing an issue, please include:
- Operating System and Node version (`node -v`).
- Minimal reproducible example document (`.vmd` or `.md`).
- Expected vs. actual behavior.

---

## 5. Synchronizing & Bumping Version

VisualMD includes a universal synchronization script that updates the version across all monorepo packages, server endpoints, web app branding, documentation badges, and security policies without making any git commits or git pushes:

```bash
npm run bump <version>

# Examples:
npm run bump 1.0.244
npm run bump 2.0.0
```

# OS Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based Linux OS agent that can plan and execute basic administration tasks with distro-aware command selection, execution transparency, and risk prompts.

**Architecture:** A TypeScript monorepo with a React/Vite web client and an Express API server. The server owns intent parsing, distro detection, task planning, and command execution, while the client visualizes environment state, task plans, risks, and step-by-step logs.

**Tech Stack:** TypeScript, React, Vite, Express, Vitest, Testing Library, tsx

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.server.json`
- Create: `vite.config.ts`

- [ ] Step 1: Add project scripts and dependencies.
- [ ] Step 2: Add TypeScript config for web and server code.
- [ ] Step 3: Add Vite config with `/api` proxy.
- [ ] Step 4: Run install and verify tooling starts.

### Task 2: Core Planning Engine

**Files:**
- Create: `src/server/core/types.ts`
- Create: `src/server/core/distro.ts`
- Create: `src/server/core/intent.ts`
- Create: `src/server/core/planner.ts`
- Test: `tests/core.test.ts`

- [ ] Step 1: Write failing tests for distro detection, intent parsing, and planning.
- [ ] Step 2: Implement minimal detection and planning logic.
- [ ] Step 3: Re-run targeted tests.

### Task 3: Execution API

**Files:**
- Create: `src/server/core/executor.ts`
- Create: `src/server/api/routes.ts`
- Create: `src/server/index.ts`
- Test: `tests/api.test.ts`

- [ ] Step 1: Write failing API tests for plan preview and execution guards.
- [ ] Step 2: Implement Express routes and dry-run executor.
- [ ] Step 3: Re-run API tests.

### Task 4: Web UI

**Files:**
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`
- Create: `web/src/styles.css`

- [ ] Step 1: Write a minimal UI state test for task rendering.
- [ ] Step 2: Implement the main form, plan view, and execution log view.
- [ ] Step 3: Verify the web app builds.

### Task 5: Documentation and Demo Support

**Files:**
- Modify: `README.md`

- [ ] Step 1: Document setup, scripts, demo flow, and supported commands.
- [ ] Step 2: Run full test and build commands.
- [ ] Step 3: Prepare commit with an English message.
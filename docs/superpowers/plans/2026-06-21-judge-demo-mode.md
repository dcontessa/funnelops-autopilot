# Judge Demo Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished guided demo mode that helps judges and demo viewers understand FunnelOps Autopilot in three minutes.

**Architecture:** Keep the feature inside the existing React app. Add a small typed demo step data set, UI state for demo mode and current step, a guided sidebar, proof badges, and section highlighting through stable CSS classes.

**Tech Stack:** React, TypeScript, Vite, lucide-react, CSS, Vitest.

---

### Task 1: Add Judge Demo state and content

**Files:**
- Modify: `src/App.tsx`

- [ ] Add `demoSteps` content near the existing `statusLabel` constant. Each step must include id, label, title, detail, target, and cue.
- [ ] Add state: `isDemoMode` and `activeDemoStep`.
- [ ] Add derived `currentDemoStep`.

### Task 2: Add guided demo UI

**Files:**
- Modify: `src/App.tsx`

- [ ] Add a `Judge Demo` button in the topbar.
- [ ] Add a proof badge strip under the hero.
- [ ] Add a demo sidebar panel with step buttons, current narration, and next/back controls.
- [ ] Add highlight classes to relevant sections based on the active step target.

### Task 3: Add styling

**Files:**
- Modify: `src/styles.css`

- [ ] Style demo toggle, proof badges, demo sidebar, active steps, and highlighted panels.
- [ ] Keep the layout responsive.
- [ ] Avoid em dashes in visible copy.

### Task 4: Verify and commit

**Files:**
- Run: `npm test`
- Run: `npm run build`
- Run a punctuation scan across README, DEPLOYMENT, docs, src, server, package files, and GitHub workflow files.
- Commit all changes with `git commit -m "feat: add judge demo mode"`.

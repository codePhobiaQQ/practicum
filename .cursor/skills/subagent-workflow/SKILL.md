---
name: subagent-workflow
description: Orchestrates task-planner, worker, and reviewer agents in a structured multi-step workflow with explicit user plan approval, implementation, and review. Use for non-trivial coding tasks where planning, code generation, and independent review are desired.
---

# Subagent Workflow

## Instructions

Use this skill to run a three-agent workflow: **Task Planner → Worker → Reviewer**, with user approval between planning and implementation, and an optional retry loop if review fails.

### When to apply this skill

Apply this skill when:

- The user requests a **non-trivial** coding task (new features, refactors, multi-file changes, complex fixes).
- The task would benefit from an explicit **plan → implement → review** pipeline.
- The user explicitly asks for the **Process** workflow or mentions using multiple agents / planner / reviewer.

If the task is very small (e.g. a one-line change in a single file), this workflow may be unnecessary; you can proceed normally.

---

## Workflow

### 1. Planning phase (Task Planner)

1. Analyze the user’s request and restate it briefly.
2. Call the **task-planner agent** (via the Task tool with `subagent_type: "task-planner"`) with:
   - A clear description of the task and constraints.
   - Any relevant files or context already known.
   - The requirement to output a concrete, **numbered, step-by-step implementation plan**.
3. When the task-planner returns a plan:
   - Present it to the user under a heading like **“Proposed plan”**.
   - Ask for an explicit decision: **approve**, **request changes**, or **cancel**.

**Rules:**

- **Do not** start implementation until the user explicitly approves the plan.
- If the user requests changes to the plan, either:
  - Edit the plan yourself if changes are small and clear, or
  - Call the task-planner again with the user’s feedback for a revised plan.
- If the user cancels, summarize and stop.

---

### 2. Implementation phase (Worker)

Only after the user has **approved** the plan:

1. Call the **worker agent** (via the Task tool with `subagent_type: "worker"`) with:
   - The **approved plan** (not older drafts).
   - Key constraints (linting rules, minimal edits, etc.).
2. Ask the worker to:
   - Implement the plan in **small, incremental steps**.
   - Respect existing project rules and linters.
   - Run tests or checks where appropriate.

During implementation:

- Keep the user updated with **short, high-signal summaries**, not long explanations.
- Avoid unnecessary refactors or unrelated edits.

---

### 3. Review phase (Reviewer)

After the worker has finished a batch of changes:

1. Call the **reviewer agent** (via the Task tool with `subagent_type: "reviewer"`) with:
   - A description of what the worker changed and why.
   - Pointers to the most relevant files or areas.
2. Ask the reviewer to:
   - Check correctness, safety, and alignment with project standards.
   - Point out **specific issues** and **clear, actionable fixes**.
   - Distinguish between **must-fix** and **nice-to-have** comments when possible.

Present reviewer findings briefly to the user.

---

### 4. Feedback loop (retry on failure)

If the reviewer identifies issues that can reasonably be fixed automatically:

1. Call the **worker** again with:
   - The reviewer’s feedback.
   - A clear instruction to focus on **fixing the listed issues only**.
2. After the worker finishes fixes, call the **reviewer** once more to verify.

**Retry policy:**

- Allow up to **two full worker → reviewer cycles** per user request:
  - Initial implementation + review.
  - One additional fix-iteration + review.
- If after these cycles the reviewer still reports significant unresolved issues:
  - Summarize the remaining problems.
  - Explain that further progress likely requires **manual decisions** or deeper discussion with the user.
  - Stop the Process workflow for this request.

---

### 5. Completion

When finishing the Process workflow:

1. Provide a brief final summary (ideally ≤ 4 sentences) covering:
   - **What was implemented**.
   - **Review status** (passed / remaining concerns).
   - Any **known limitations or follow-ups**.
2. Do **not** create commits or pull requests unless the user explicitly asks.
3. If the user wants to continue iterating, you may **start a new Process run** using the updated requirements.

---

## Examples

### Example 1: New feature

- User: “Add a dark mode toggle to the settings page, with persistence across reloads. Use our existing design system.”
- Agent using this skill:
  1. Launches **task-planner** to design a step-by-step plan (state management, UI updates, persistence, tests).
  2. Shows the plan, asks: “Do you approve this plan or want changes?”
  3. On approval, launches **worker** to implement the plan.
  4. Launches **reviewer** to inspect the changes.
  5. If reviewer finds issues, calls **worker** again with that feedback, then re-runs **reviewer** once.
  6. Summarizes results and remaining follow-ups, then stops.

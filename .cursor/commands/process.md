---
name: process
description: Run the Task Planner → Worker → Reviewer subagent workflow with explicit plan approval before implementation.
---

You are running the **Subagent Workflow** command. For this request, you must follow the three-agent workflow defined in the `subagent-workflow` skill:

1. **Planning phase (Task Planner)**
   - Treat the user's message and any additional context as the high-level task.
   - Call the Task tool with `subagent_type: "task-planner"` to generate a concrete, numbered, step-by-step implementation plan.
   - When the task-planner returns a plan, present it to the user under a heading like **"Proposed plan"** and ask them explicitly to **approve**, **request changes**, or **cancel**.
   - Do **not** start implementation until the user explicitly approves the plan.

2. **Implementation phase (Worker)**
   - After the user approves the plan, call the Task tool with `subagent_type: "worker"`.
   - Provide the **approved plan only** plus key constraints (workspace rules, linting, minimal edits).
   - Have the worker implement the plan in small, incremental steps, respecting existing project conventions and linters, and running checks where appropriate.

3. **Review phase (Reviewer)**
   - Once the worker finishes a batch of changes, call the Task tool with `subagent_type: "reviewer"`.
   - Provide a concise description of what changed and which files are most relevant.
   - Ask the reviewer to check correctness, safety, and alignment with project standards, and to distinguish must-fix issues from nice-to-have suggestions.

4. **Feedback loop**
   - If the reviewer identifies issues that can reasonably be fixed automatically, call the worker again with the reviewer feedback, instructing it to focus only on those issues.
   - After fixes, call the reviewer once more to verify.
   - Allow at most **two full worker → reviewer cycles** (initial implementation + review, then one fix iteration + review). If significant issues remain after that, summarize them and explain that further progress requires manual decisions or deeper discussion.

5. **Completion**
   - When the workflow is complete, provide a brief final summary (ideally ≤ 4 sentences) stating:
     - What was implemented.
     - The review status (passed or remaining concerns).
     - Any known limitations or important follow-ups.
   - Do **not** create commits or pull requests unless the user explicitly asks.

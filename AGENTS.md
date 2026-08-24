<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent Skills Integration

This project integrates engineering skills from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills).

Skills live in `skills/<skill-name>/SKILL.md`.

## Skill Discovery & Auto-Invocation

Before acting, check if any available skill applies to the current request:

- "build a feature" → `incremental-implementation` + `test-driven-development`
- "design a system" → `spec-driven-development`
- "fix a bug" → `debugging-and-error-recovery`
- "review this code" → `code-review-and-quality`
- "secure this" → `security-and-hardening`
- "deploy/publish" → `git-workflow-and-versioning` + `shipping-and-launch`

If a skill applies, it MUST be used. Never skip required workflows.

## Available Skills

- `spec-driven-development` — PRD before code
- `planning-and-task-breakdown` — decompose specs into atomic tasks
- `incremental-implementation` — thin vertical slices, test+verify+commit
- `test-driven-development` — red-green-refactor
- `code-review-and-quality` — five-axis review before merge
- `security-and-hardening` — OWASP, auth, secrets, boundaries
- `git-workflow-and-versioning` — atomic commits, trunk-based
- `frontend-ui-engineering` — component architecture, responsive, WCAG
- `context-engineering` — rules files, MCP integration, context packing
- `source-driven-development` — verify framework decisions against docs
- `debugging-and-error-recovery` — reproduce, localize, reduce, fix, guard
- `shipping-and-launch` — pre-launch checks, staged rollouts, rollback
- `api-and-interface-design` — contract-first, boundary validation
- `code-simplification` — Chesterton's Fence, reduce complexity
- `performance-optimization` — measure-first, Core Web Vitals
- `documentation-and-adrs` — Architecture Decision Records
- `observability-and-instrumentation` — logging, metrics, tracing
- `deprecation-and-migration` — code-as-liability, zombie code removal
- `ci-cd-and-automation` — shift-left, quality gates
- `doubt-driven-development` — adversarial review of decisions
- `browser-testing-with-devtools` — Chrome DevTools MCP integration
- `interview-me` — requirements interrogation
- `idea-refine` — turn vague ideas into concrete proposals
- `using-agent-skills` — meta-skill: maps work to the right skill

## Ponytail YAGNI Mode

Ponytail plugin is active. Before writing any code, ask:

1. Does this need to exist? → no: skip it
2. Already in this codebase? → reuse it
3. Stdlib does it? → use it
4. Native platform feature? → use it (CSS over JS, DB constraint over app code)
5. Already-installed dependency? → use it
6. Can it be one line? → one line
7. Only then: the minimum code that works

Trust-boundary validation, error handling, security, accessibility — never on the chopping block.

## Development Workflow

```
DEFINE          PLAN           BUILD          VERIFY         REVIEW          SHIP
 Idea → Spec →  Task Breakdown → Implement → Test → Debug → QA Gate → Go Live
       /spec-driven-development
                    /planning-and-task-breakdown
                                   /incremental-implementation
                                                /test-driven-development
                                                                 /debugging-and-error-recovery
                                                                               /code-review-and-quality
                                                                                                    /shipping-and-launch
```

## Reference Checklists

Supplementary checklists in `references/`:
- `definition-of-done.md`
- `testing-patterns.md`
- `security-checklist.md`
- `performance-checklist.md`
- `accessibility-checklist.md`
- `observability-checklist.md`

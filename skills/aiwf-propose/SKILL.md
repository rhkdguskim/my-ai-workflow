---
name: aiwf-propose
description: Interview the user until a requested change is clear enough to become an OpenSpec change in a project that has openspec/workflow.json - problem, observable outcome, out of scope, affected apps and interfaces, constraints, and the design decisions between apps. Use before openspec-propose when the user describes a new feature, a behavior change or a fix in their own words, or says "grill me", "그릴미" or asks to sharpen a plan before writing specs.
---

# From a request to an OpenSpec change

Load `aiwf-authoring` first. Read `openspec/workflow.json` for the apps, interfaces and owners.

## 1. Fill five fields from the user's own words

| Field | Filled when | Goes to `proposal.md` |
|---|---|---|
| Problem | who is blocked, in what situation, by what. A solution alone ("add a cache") leaves it empty | Why |
| Outcome | a result checkable without reading code. "Better" leaves it empty | What Changes |
| Out of scope | the user said what will not be done. "None" only if the user said so | What Changes |
| Affected | app and interface ids from `workflow.json` the user confirmed | Impact (with owners) |
| Constraints | rules the change must keep, numbered C1, C2… | Impact |

A field you filled by guessing is empty.

## 2. Ask in rounds

Treat open decisions as a tree: each decision unlocks the ones that depend on it. A round asks every question whose prerequisites are already decided (the frontier), all at once:

```
**Q1 - <title>**: <question, options if any>

Recommended: <answer>
```

- Write each question so that "yes" accepts the recommendation.
- After the answers, recompute the frontier and ask the next round. A question whose answer depends on another open question waits for a later round.
- Facts are your job: look up code, contracts and existing specs with an Explore subagent instead of asking. Ask only for decisions. While a lookup runs, ask the rest of the frontier.
- Decisions include contracts between apps: REST paths and fields, WebSocket messages, MQ exchange, routing key and payload. Recommend the design you would build if this requirement had existed from the start. If it changes existing behavior, first find why it behaves that way now.
- Stop when the frontier is empty and the user confirms the shared understanding. Questions the user cannot answer stay listed as open; do not create the change while one blocks a requirement.

## 3. Hand over

1. Record each decision that outlives the change with `aiwf add decision <title>`, filling context, decision, rejected options and consequences.
2. Create the change through the OpenSpec propose flow (`openspec-propose`). Requirements, scenarios and tasks follow `aiwf-authoring`; derive edge cases with the six questions in `spec-writing.md`.
3. Run `aiwf check` and tell the user which owners must approve. Do not run `aiwf approve`.

Write no internal code names (classes, methods, files) in the proposal; externally visible names (API paths, fields, error codes, screen text) are fine.

Adapted from `grilling` (mattpocock/skills, MIT, Matt Pocock) and `to-intent` / `to-spec` (Claudecode-For-Me). See `THIRD_PARTY_NOTICES.md`.

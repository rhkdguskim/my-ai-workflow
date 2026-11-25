---
name: aiwf-authoring
description: Rules for writing specs, Gherkin test scenarios and OpenAPI/AsyncAPI contracts in a project that has openspec/workflow.json. Use before writing or editing anything under openspec/specs, openspec/tests, openspec/contracts or an OpenSpec change in such a project, including when another OpenSpec skill (propose, apply, archive) is doing the writing.
---

# Writing specs in a my-ai-workflow project

Read these two files first; they override anything below when they differ:

- `openspec/workflow.json`: language, phases, apps, interfaces, id prefixes, owners, limits
- `openspec/project/rules/spec-writing.md`: the project's writing rules

Write in the language set in `workflow.json`. Keep OpenSpec headings (`### Requirement:`, `#### Scenario:`, `## ADDED Requirements`) and `SHALL`/`MUST` in English.

## Where each thing goes

| Content | Location |
|---|---|
| Requirement | `openspec/specs/<phase>/<app>/<capability>/spec.md`, through an OpenSpec change |
| Interface behavior rule | `openspec/specs/<phase>/interfaces/<interface>/spec.md` |
| Test scenario | `openspec/tests/<same path as the spec>/*.feature`, edited directly |
| Machine contract | `openspec/contracts/<phase>/<interface>/{openapi,asyncapi}.yaml`, edited directly |
| Decision that outlives a change | `aiwf add decision <title>` |

OpenSpec merges only `spec.md` when a change is archived. Feature files and contract files are edited in place as tasks of the change.

## Requirement

- Title: `### Requirement: <id> <name>`. Get the id from `aiwf next-id <app or interface id>`; never guess a number and never reuse one.
- First body line: `- Status: planned|implemented|withdrawn` (`- 상태:` in Korean projects). Optional: `- Decisions: D-0xx` (`- 결정:`).
- One observable behavior per requirement, one or two scenarios as the pass condition.
- Values such as timeouts are referred to by their key in `constants.yaml`.
- Set status to `implemented` only when code and at least one test scenario exist.

## Test scenario

- One tag `@<requirement id>-Tnn` per scenario; the number is unique per requirement.
- Concrete values in steps, at most the step limit in `workflow.json` (default 7).
- Korean projects start the file with `# language: ko`.
- Put the test id in the automated test that executes the scenario (name, attribute or comment).
- For every new or changed requirement, derive edge and error cases from the six questions in `spec-writing.md` (input, target state, repeat and concurrency, authorization, dependencies, connection). Handled-and-continue cases become scenarios of that requirement; failures visible to the caller become their own requirement. Keep only cases confirmed in code or by the user.

## Modified requirement

- `## MODIFIED Requirements` repeats the whole requirement; copy unchanged sentences character for character from the current spec.
- Before changing existing behavior, find why it behaves that way now and record it in the decision's context with the rejected options.

## tasks.md

- One `## ` group is one vertical slice through contract, scenario, code and test. Each ADDED or MODIFIED requirement id appears in exactly one group; the `tasks` check enforces it.
- First line of a group: `Blocked by: …` (`선행: …` in Korean projects). Unblocked groups must not edit the same contract file.
- Order inside a group: contract, failing scenario and test, implementation, passing check. A breaking contract change is three groups: expand, move callers, contract.
- Completion conditions are observed results (API response, message, scenario run), not "build succeeds".

## Contract

- Edit the contract before the code. Any change in a contract folder bumps `info.version`; a breaking change bumps the major version and needs agreement from the consumers' owners listed in `workflow.json`.
- Fields, types and ranges live only in the contract.

## Evidence

- Write only what you confirmed in code, tests or existing documents. Where confirmation is missing, leave a line starting with `Unverified:` (`미확인:`) and tell the user; do not fill the gap with a plausible guess.
- No introductions, summaries, change history, or wording from `openspec/project/rules/banned-phrases.txt`.
- Follow the style section of `spec-writing.md`: one name per thing, the actor as subject, one behavior per sentence, no hedging, no sentence that would fit any other project.

## Gates

- Before implementing a change run `aiwf check --gate <change>`. If approval is missing, stop and tell the user which owners must approve. Never run `aiwf approve` and never create or edit `approval.json` yourself.
- Before finishing run `aiwf check`. Fix the content, not the rules: do not edit limits, the banned-phrase list or rule documents to make a finding disappear.

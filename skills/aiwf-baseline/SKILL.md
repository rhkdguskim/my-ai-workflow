---
name: aiwf-baseline
description: Extract the specs of an existing app from its code and documents into an OpenSpec baseline change - requirements with ids and status, Gherkin test scenarios and machine contracts. Use when the user wants to document already-built code as specs, reverse-engineer requirements, or bring a legacy app under my-ai-workflow.
---

# Baseline: specs from existing code

One app per change. The output is an OpenSpec change named `baseline-<app>` that a person reviews before it is archived into `openspec/specs`.

Load the `aiwf-authoring` skill first; its rules apply to everything written here.

## Steps

1. Read `openspec/workflow.json`. The app must be registered with `source` folders. If it is not, use the `aiwf-init` skill or ask the user.
2. Read the app's source folders and its tests. Read existing requirement documents only as a secondary source; where a document and the code disagree, the code is what is implemented. List every disagreement for the user instead of choosing silently.
3. Propose the capability list to the user before writing: one capability owns one state or one responsibility. Wait for the user's agreement on the list; moving requirements between capabilities later is costly.
4. Create the change with the OpenSpec propose flow (`openspec-propose` or `openspec new change baseline-<app>`). Delta specs go to `openspec/changes/baseline-<app>/specs/<phase>/<app>/<capability>/spec.md` under `## ADDED Requirements`.
5. For each requirement:
   - Reuse an id that already exists in code comments or old documents when it fits the project's id pattern. Otherwise take `aiwf next-id <app>`.
   - Status is `implemented` only when you found the implementing code. Behavior that documents promise but code does not contain is `planned`, and you list it for the user.
6. Write test scenarios in `openspec/tests/<same path>/*.feature`. Derive them from existing automated tests where they exist and put the new test id into those tests. A scenario without an automated test is allowed; `aiwf check` reports it as a warning.
7. For each interface the app uses, bring the contract file in `openspec/contracts` in line with the code: message names, fields, enum values. Record each mismatch you corrected.
8. Add the requirement id as a comment at the implementing code, replacing references to document paths or section numbers.
9. Run `openspec validate baseline-<app> --strict` and `aiwf check`. Fix findings in the content.
10. Report to the user: capability list, counts of implemented and planned requirements, disagreements between documents and code, `Unverified:` items, and the owners who must approve. Stop there; the user reviews and archives.

## Rules

- Every requirement is backed by code you read. Do not write a requirement from a function name alone; read the function.
- Do not merge two behaviors into one requirement to keep the count low, and do not split one behavior to look thorough.
- Do not copy prose from old documents wholesale. Old documents may describe a design that was replaced.
- Large apps: work capability by capability and run `aiwf check --only ids,trace` after each one.

---
name: aiwf-review
description: Review the code of an OpenSpec change against its own delta specs, Gherkin scenarios and contracts in a project that has openspec/workflow.json, requirement by requirement - missing, partial, out-of-scope or flawed behavior - then fix the serious findings. Use after implementing a change and before archiving it, or when the user asks whether the code does what the spec says.
---

# Spec review of a change

This review answers one question: does the code do what the change's requirements say, no less and no more. Bugs unrelated to the spec, style and performance are for a general code review.

## 1. Collect

- Change name: from the user, or the only active change under `openspec/changes`. Ask if there are several.
- Diff: `git diff $(git merge-base origin/main HEAD)...HEAD` plus uncommitted changes. Use the base branch of the repository if it is not `main`.
- Spec: every `openspec/changes/<change>/specs/**/spec.md` (ADDED and MODIFIED requirements), the `.feature` files of those requirement ids, and the contract files of touched interfaces.
- Run `aiwf check --only ids,trace,contracts,tasks --json`. Report its findings as they are; do not ask the reviewer to repeat what the checks already decide.

## 2. Review

Start one read-only subagent (`general-purpose`) with the diff path, the spec files and the check output. Brief:

> For each ADDED or MODIFIED requirement id, decide whether the diff implements it. Report one line per finding:
> `<requirement id or area> | <CRITICAL|MAJOR|MINOR|NIT> | <MISSING|PARTIAL|SCOPE-CREEP|FLAW> | <problem>. Spec: "<quote>". Fix: <action>.`
> MISSING: required behavior absent. PARTIAL: some scenarios or values absent. SCOPE-CREEP: behavior in the diff that no requirement asks for. FLAW: implemented in a way that contradicts the requirement, a scenario or the contract.
> CRITICAL: a core requirement is not met. MAJOR: part of a requirement is not met, or clear scope creep. MINOR: a small difference in interpretation. NIT: opinion.
> Quote the spec for every finding. Use Grep to follow callers when needed. Report every CRITICAL and MAJOR; for MINOR and NIT give the count and two examples. Do not edit files.

## 3. Fix and stop

- Fix CRITICAL and MAJOR findings only. List MINOR and NIT for the user.
- After fixing, run the cheap checks of the touched unit (its tests, `aiwf check`).
- If any CRITICAL was fixed, review once more, limited to the fix commits.
- Stop and hand over to the user when the second review still finds CRITICAL or MAJOR, or when a finding can only be fixed by changing the spec. Never edit a requirement, scenario or contract to make a finding disappear; a spec change goes through a new or updated change and owner approval.

## Report

Per requirement id: implemented, partial or missing. Then fixed findings, remaining MINOR and NIT, check findings, and what needs a person.

The finding format is adapted from the spec finder of `diff-review` and the stop rule from the `review-and-fix` playbook of Claudecode-For-Me. See `THIRD_PARTY_NOTICES.md`.

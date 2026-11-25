---
name: aiwf-check
description: Run and resolve the my-ai-workflow checks - folder structure, requirement ids, requirement-to-test traceability, anti-slop limits, owner approval and contract version rules - and check or upgrade OpenSpec compatibility. Use when the user asks to check or lint specs, when a change is about to be implemented or archived, when CI reports aiwf findings, or when the user wants to update OpenSpec.
---

# Checking a my-ai-workflow project

Run the CLI as `aiwf <command>`, `node "<plugin root>/bin/aiwf.mjs" <command>` (plugin root is two folders above this skill's base directory) or `npx -y github:rhkdguskim/my-ai-workflow <command>`.

## Commands

| Command | Purpose |
|---|---|
| `aiwf check` | all checks; exit code 1 when any error exists |
| `aiwf check --only ids,trace` | selected checks: `structure`, `ids`, `trace`, `slop`, `approval`, `contracts` |
| `aiwf check --gate <change>` | also require owner approval for that change, even before any task is checked |
| `aiwf check --json` | machine-readable findings |
| `aiwf doctor` | OpenSpec version range and spec-format comparison with `openspec show` |
| `aiwf openspec status` | installed, latest and tested OpenSpec versions |
| `aiwf openspec upgrade [--to <version>]` | upgrade OpenSpec, run `openspec update`, refresh the workflow block in `openspec/config.yaml`, run doctor |

Also run `openspec validate --all --strict`; aiwf does not repeat OpenSpec's own validation.

## Resolving findings

Each line is `file:line level CODE message`. Fix the content the finding points at.

- `ID_*`, `STATUS_*`: fix the requirement title or status line. New ids come from `aiwf next-id`.
- `TEST_*`, `REQ_NO_TEST`: add or move the Gherkin scenario, or correct its `@<id>-Tnn` tag. If a requirement is not built yet, its status is `planned`, not `implemented`.
- `REQ_NO_CODE`, `TEST_NO_CODE` (warnings): add the id to the implementing code comment or automated test. Do not add an id to code that does not implement the requirement.
- `BANNED_PHRASE`, `FILE_TOO_LONG`, `SCENARIO_TOO_LONG`: rewrite with a measurable statement, split the capability, or split the scenario.
- `APPROVAL_MISSING`: stop and tell the user which owners must run `aiwf approve <change> --by <name>`. Never record approval yourself.
- `CONTRACT_VERSION_NOT_BUMPED`, `CONTRACT_BREAKING`: bump `info.version`; for a breaking change bump the major version after the consumers' owners agree.
- `CONTRACT_TOOL_MISSING`, `CONTRACT_BASE_UNRESOLVED` (warnings): compatibility was not compared. Say so in your report; do not present the contract as verified.

Never change `limits`, `banned-phrases.txt`, rule documents or statuses just to silence a finding. If a rule looks wrong for the project, report it to the user and let them decide.

## Upgrading OpenSpec

1. `aiwf openspec status`.
2. With the user's agreement run `aiwf openspec upgrade`. It installs the package globally with npm, which changes the user's machine.
3. If doctor fails afterwards, report the failing lines and the rollback command it printed. A format mismatch means `src/openspec-adapter.mjs` in the plugin needs an update; do not edit project specs to work around it.
4. A new major version is refused unless `--force` is given. Use `--force` only when the user asks for it.

## Reporting

State the counts of errors and warnings, what you fixed, and what still needs a person (approvals, unverified items, skipped compatibility checks).

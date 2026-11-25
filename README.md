# my-ai-workflow

A team spec workflow on top of [OpenSpec](https://github.com/Fission-AI/OpenSpec). OpenSpec keeps the requirements and the change process; this package adds a fixed folder layout, requirement ids, Gherkin test scenarios, OpenAPI/AsyncAPI contracts and the checks that keep them consistent.

한국어: [README.ko.md](README.ko.md)

## What it adds to OpenSpec

| Area | OpenSpec | my-ai-workflow |
|---|---|---|
| Requirements | `openspec/specs/<capability>/spec.md` | same files, laid out as `<phase>/<app>/<capability>`, each requirement with an id and a status |
| Change process | propose, apply, archive | unchanged; adds an owner approval gate before apply |
| Test scenarios | none | Gherkin files in `openspec/tests/`, linked to requirements by tag |
| Interface contracts | none | OpenAPI and AsyncAPI files in `openspec/contracts/`, with version rules |
| Checks | `openspec validate` | `aiwf check`: structure, ids, traceability, wording, approval, contracts |

OpenSpec is not forked or copied. Its skills, templates and CLI are used as shipped, and every OpenSpec command still works. The project-specific rules reach OpenSpec through `openspec/config.yaml`, which is OpenSpec's own extension point.

## Layout

```
openspec/
├─ config.yaml                 OpenSpec config; aiwf manages one marked block in it
├─ workflow.json               language, phases, apps, interfaces, owners, limits
├─ project/
│  ├─ rules/                   spec-writing.md, banned-phrases.txt
│  ├─ glossary/
│  └─ decisions/               D-0xx-<title>.md
├─ specs/<phase>/
│  ├─ README.md  constants.yaml
│  ├─ <app>/app.md
│  ├─ <app>/<capability>/spec.md
│  └─ interfaces/<interface>/spec.md
├─ tests/<phase>/<app>/<capability>/*.feature
├─ contracts/<phase>/<interface>/{openapi,asyncapi}.yaml
└─ changes/                    OpenSpec changes
```

Projects without phases drop the `<phase>` level.

## Install

Requires Node.js 20 or later and the OpenSpec CLI (`npm install -g @fission-ai/openspec`). OpenSpec is also declared as an npm dependency of this package, so `npx` runs use that copy when no `openspec` is on PATH. OpenSpec's own skills call `openspec` from PATH, so agents need the global install.

Claude Code:

```
/plugin marketplace add rhkdguskim/my-ai-workflow
/plugin install my-ai-workflow@my-ai-workflow
```

Codex and other agents that read `~/.agents/skills`:

```
npx -y github:rhkdguskim/my-ai-workflow skills install
```

CLI only, for example in CI:

```
npx -y github:rhkdguskim/my-ai-workflow check
```

## Start

```
openspec init
aiwf init --lang en --phases phase1,phase2
aiwf add app order-service --prefix ORD --phase phase1 --owner kim --source src/order
aiwf add interface IF-01-order-events --kinds asyncapi --phase phase1 --owner kim --consumers billing
aiwf check
```

Requirements enter `openspec/specs` through OpenSpec changes. In a change, a requirement looks like this:

```markdown
### Requirement: ORD-FR-07 Hold order on payment failure
- Status: implemented
- Decisions: D-012

When payment authorization is declined, the system SHALL set the order to `on-hold`.

#### Scenario: Authorization declined
- **WHEN** the payment gateway returns a decline
- **THEN** the order status becomes `on-hold`
```

and its test scenario, in `openspec/tests/phase1/order-service/checkout/payment.feature`:

```gherkin
Feature: Payment failure handling

  @ORD-FR-07-T01
  Scenario: Order is held when the card limit is exceeded
    Given an order "A-100" waiting for payment
    When the payment gateway declines with "limit_exceeded"
    Then the status of order "A-100" is "on-hold"
```

## Commands

| Command | Purpose |
|---|---|
| `aiwf init [--lang ko\|en] [--phases a,b]` | create `workflow.json`, rules and folders; never overwrites |
| `aiwf add app\|interface\|decision ...` | register an app or interface, create a decision record |
| `aiwf next-id <app or interface>` | next free requirement id, counting active changes |
| `aiwf check [--only ...] [--gate <change>] [--json]` | run the checks; exit code 1 on errors |
| `aiwf approve <change> --by <owner>` | record an owner's approval (run by a person) |
| `aiwf doctor` | verify the installed OpenSpec against what aiwf expects |
| `aiwf openspec status` | installed, latest and tested OpenSpec versions |
| `aiwf openspec upgrade [--to <v>] [--force]` | upgrade OpenSpec, run `openspec update`, refresh the config block, run doctor |
| `aiwf openspec <arguments>` | pass through to the OpenSpec CLI |
| `aiwf skills install [--dir <folder>]` | copy the skills for agents without plugin support |

## Checks

| Check | Errors | Warnings |
|---|---|---|
| `structure` | spec path does not match phase/app, missing `app.md`, test folder without spec, missing decision file | |
| `ids` | id format, duplicate id, missing or unknown status | |
| `trace` | scenario without test id, duplicate or dangling test id, test in the wrong folder, implemented requirement without scenario | id not found in source code or automated tests |
| `slop` | banned phrase, file over the line limit, scenario over the step limit | |
| `approval` | started or gated change without approval from every owner | touched app has no owner |
| `contracts` | missing contract file or `info.version`, change without version bump, breaking change without major bump | comparison tool or git base ref unavailable |

Breaking changes are detected by an external tool set in `workflow.json` under `contracts.tools`. The default for OpenAPI is [oasdiff](https://github.com/oasdiff/oasdiff). No default is set for AsyncAPI; configure a command there, with `{base}` and `{head}` as file placeholders, that exits non-zero on a breaking change. Without a tool, only the version-bump rule is enforced and a warning says so.

## Skills

| Skill | Use |
|---|---|
| `aiwf-init` | set up the structure and register apps and interfaces |
| `aiwf-authoring` | rules applied whenever specs, scenarios or contracts are written |
| `aiwf-check` | run the checks, resolve findings, upgrade OpenSpec |
| `aiwf-baseline` | extract the specs of an existing app from its code into a baseline change |

## Staying compatible with OpenSpec

- `src/openspec-adapter.mjs` is the only module that knows OpenSpec's CLI and file format.
- `aiwf doctor` compares aiwf's reading of each sampled `spec.md` with `openspec show --json` and fails when they differ, so a format change in a new OpenSpec version is detected instead of silently misread.
- `aiwf openspec upgrade` refuses a new major version unless `--force` is given, and prints the rollback command when doctor fails after an upgrade.
- Tested with OpenSpec 2.2.0. The supported range is in `SUPPORTED` in the adapter.

## Limits

- `aiwf check` reads requirement ids from the delta specs of active changes but does not validate the changes themselves; run `openspec validate --all --strict` for that.
- Code traceability is a text search for ids in the folders listed under `apps[].source` and `trace.testDirs`.
- Approval is a file in the change folder. It records who approved; it does not authenticate them. Use branch protection or code owners for enforcement.
- The Gherkin reader handles English and Korean keywords.

## License

MIT

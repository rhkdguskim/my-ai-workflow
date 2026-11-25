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

## Usage

A change goes through these steps. Saying what is in the right column to an agent runs the matching skill.

| Step | What happens | What to say or run |
|---|---|---|
| 1. Clarify the request | An interview settles what changes and why, what is out of scope, the affected apps and interfaces, the constraints, and contracts between apps (REST, WebSocket, MQ) | "I want orders held on payment failure. Grill me." (`aiwf-propose`) |
| 2. Write the change | Create the OpenSpec change (proposal, delta specs, tasks.md); the `aiwf-authoring` rules apply | `openspec-propose` (follows step 1) |
| 3. Scenarios and contracts | Write `.feature` and contract files. Derive edge and error scenarios with the six questions in `spec-writing.md` | written together with step 2 |
| 4. Check | Structure, ids, traceability, wording, contracts, task split | `aiwf check` |
| 5. Approve | The owner records approval. An agent never runs this | `aiwf approve <change> --by <name>` |
| 6. Implement | After the gate passes, implement the task groups in order | `aiwf check --gate <change>`, then `openspec-apply-change` |
| 7. Spec review | Check per requirement id that the code matches requirements, scenarios and contracts; fix CRITICAL and MAJOR only | "Review whether this change does what the spec says." (`aiwf-review`) |
| 8. Close | Pass the checks and archive the change | `aiwf check`, `openspec-archive-change` |

To bring an existing app in, replace steps 1 to 3 with "Extract specs from the existing code" (`aiwf-baseline`), which creates a baseline change.

### Writing tasks.md

A task group (`## ` section) is a vertical slice through contract, scenario, code and test. Each ADDED or MODIFIED requirement id is written in exactly one group. A missing id is an error (`TASK_REQ_MISSING`); an id spread over several groups is a warning (`TASK_REQ_DUPLICATE`).

```markdown
## 1. Gate
Blocked by: none
- [ ] 1.1 Confirm `aiwf check --gate add-hold` passes

## 2. Hold order on payment failure
Blocked by: 1
- [ ] 2.1 Add the OrderHeld message to the IF-01 contract, bump info.version
- [ ] 2.2 Write scenario ORD-FR-07-T01 and a failing automated test
- [ ] 2.3 Implement ORD-FR-07, set its status to implemented
- [ ] 2.4 Confirm `aiwf check` passes
```

### Language (English and Korean)

aiwf supports English and Korean, in two places.

- Document language: the language of the rule documents, banned-phrase list and templates that `aiwf init` creates. It is stored as `language` in `workflow.json` and shared by the team. Without `--lang`, it follows the display language below.
- Display language: the language of the CLI's help, results, errors and check messages. The same rules apply when Claude Code or Codex runs `aiwf`.

The display language is the first one found in this order:

| Order | Source | Example |
|---|---|---|
| 1 | `--lang` on the command | `aiwf check --lang en` |
| 2 | environment variable `AIWF_LANG` | `AIWF_LANG=en` |
| 3 | `language` in the project's `openspec/workflow.json` | a project created with `aiwf init --lang en` |
| 4 | user setting `~/.aiwf/config.json` | `aiwf lang en`, `aiwf skills install --lang en` |
| 5 | system locale | `LANG=en_US.UTF-8`, an English Windows |
| 6 | default | English |

```
# Claude Code plugin: nothing to do on an English OS. To force a language:
npx -y github:rhkdguskim/my-ai-workflow lang en

# Codex and others: set the language while installing the skills
npx -y github:rhkdguskim/my-ai-workflow skills install --lang en

# Start a project in English (documents and display)
aiwf init --lang en
```

`aiwf lang` prints the current display language and where it came from. OpenSpec headings (`### Requirement:`, `#### Scenario:`) and `SHALL` / `MUST` stay in English in both languages.

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
| `aiwf skills install [--dir <folder>] [--lang ko|en]` | copy the skills for agents without plugin support; `--lang` also saves the display language |
| `aiwf lang [ko|en]` | show the display language and its source, or save it for this user |

## Checks

| Check | Errors | Warnings |
|---|---|---|
| `structure` | spec path does not match phase/app, missing `app.md`, test folder without spec, missing decision file | |
| `ids` | id format, duplicate id, missing or unknown status | |
| `trace` | scenario without test id, duplicate or dangling test id, test in the wrong folder, implemented requirement without scenario | id not found in source code or automated tests |
| `slop` | banned phrase, file over the line limit, scenario over the step limit | |
| `approval` | started or gated change without approval from every owner | touched app has no owner |
| `tasks` | added or modified requirement of a change not named in any tasks.md group | requirement spread over several groups |
| `contracts` | missing contract file or `info.version`, change without version bump, breaking change without major bump | comparison tool or git base ref unavailable |

Breaking changes are detected by an external tool set in `workflow.json` under `contracts.tools`. The default for OpenAPI is [oasdiff](https://github.com/oasdiff/oasdiff). The default for AsyncAPI runs `npx @asyncapi/cli diff` and classifies its change list inside aiwf, because that CLI leaves payload schema changes unclassified: an added `required` or `enum` entry, any removal other than a `required` entry, and any edited value outside documentation fields count as breaking. The rules do not know message direction. A custom tool is a command array with `{base}` and `{head}` as file placeholders that exits non-zero on a breaking change. When a tool cannot run, only the version-bump rule is enforced and a warning says so.

## Skills

| Skill | Use |
|---|---|
| `aiwf-propose` | interview the user until a request is ready to become an OpenSpec change |
| `aiwf-init` | set up the structure and register apps and interfaces |
| `aiwf-authoring` | rules applied whenever specs, scenarios or contracts are written |
| `aiwf-check` | run the checks, resolve findings, upgrade OpenSpec |
| `aiwf-baseline` | extract the specs of an existing app from its code into a baseline change |
| `aiwf-review` | review a change's code against its own requirements, scenarios and contracts, fix serious findings |

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

MIT. Adapted third-party material is listed in `THIRD_PARTY_NOTICES.md`.

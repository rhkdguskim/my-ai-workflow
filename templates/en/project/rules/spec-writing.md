# Spec writing rules

`aiwf check` enforces these rules. Errors block a merge; warnings are only reported.

## What goes where

| Content | Format | Location |
|---|---|---|
| Requirements | OpenSpec `spec.md` | `openspec/specs/<phase>/<app>/<capability>/spec.md` |
| Interface behavior rules | OpenSpec `spec.md` | `openspec/specs/<phase>/interfaces/<interface>/spec.md` |
| Test scenarios | Gherkin `.feature` | `openspec/tests/<same path as the spec>/` |
| Machine contracts | OpenAPI, AsyncAPI | `openspec/contracts/<phase>/<interface>/` |
| App responsibility and boundary | Markdown | `openspec/specs/<phase>/<app>/app.md` |
| Times and limits | YAML | `openspec/specs/<phase>/constants.yaml` |
| Decision records | Markdown | `openspec/project/decisions/D-0xx-<title>.md` |
| Terms | Markdown | `openspec/project/glossary/` |

Projects without phases drop `<phase>/` from every path. A fact is written in one place; other places refer to it by id.

## Requirements

```markdown
### Requirement: ORD-FR-07 Hold order on payment failure
- Status: implemented
- Decisions: D-012

When payment authorization is declined, the system SHALL set the order to `on-hold`.

#### Scenario: Authorization declined
- **WHEN** the payment gateway returns a decline
- **THEN** the order status becomes `on-hold`
```

- The title starts with the id: `<PREFIX>-FR-NN` or `<PREFIX>-NFR-NN` for apps, `<IF-NN>-RNN` for interfaces.
- Get a new id with `aiwf next-id <app>`. A retired number is never used again.
- Status is one of `planned`, `implemented`, `withdrawn`.
- One requirement is one observable behavior. Do not join two behaviors with "and".
- Keep one or two scenarios as the pass condition. Value combinations and edge cases go in `.feature` files.
- A requirement keeps its id when it moves to another capability folder.

## Test scenarios

```gherkin
Feature: Payment failure handling

  @ORD-FR-07-T01
  Scenario: Order is held when the card limit is exceeded
    Given an order "A-100" waiting for payment
    When the payment gateway declines with "limit_exceeded"
    Then the status of order "A-100" is "on-hold"
```

- Each scenario carries one `@<requirement id>-Tnn` tag. That tag is the test id.
- A `.feature` file sits at the same path as the spec that owns its requirement.
- A requirement with status `implemented` has at least one scenario.
- Steps use concrete values. A scenario has at most 7 steps.
- An automated test names its test id in its name, an attribute or a comment.

## Contracts

- When an interface changes, edit the contract file before the code.
- When a file in a contract folder changes, bump `info.version`. A breaking change bumps the major version.
- Fields, types and ranges are written only in the contract file. Do not copy field tables into `spec.md`.
- A breaking change needs agreement from the owners of the `consumers` listed in `workflow.json`.

## Link to code

- A code comment carries only the id (`// ORD-FR-07`), never a document path or section number.
- Documents do not name source files. The source folders of an app live only in `source` in `workflow.json`.

## Approval

- The owner (`owner` in `workflow.json`) approves the proposal and spec changes before implementation starts.
- A human records approval with `aiwf approve <change> --by <name>`. An agent never runs this command on its own.
- Before implementing, an agent runs `aiwf check --gate <change>`; if it fails, the agent stops and reports.

## What not to write

- Anything unconfirmed. Leave a line starting with `Unverified:` instead of guessing.
- Wording that cannot be judged. The list is in `banned-phrases.txt`. Write "within 2 seconds", not "quickly".
- Introductions, summary sections, the same content as both table and prose.
- Change history. No strikethrough, dated notes or "previously". History lives in Git and `changes/archive`.
- Files over 300 lines. Split the capability instead.

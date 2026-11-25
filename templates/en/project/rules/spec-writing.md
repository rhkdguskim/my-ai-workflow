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

### Questions that find edge and error scenarios

For every new or changed requirement, draw candidates from these questions. Keep only situations that can actually happen; drop questions that do not apply.

| Question | Examples |
|---|---|
| Input | Value missing, malformed, out of range? |
| Target state | Target missing? Already in that state? Action not allowed in the current state? |
| Repeat and concurrency | Same request twice? Two at once? MQ message duplicated or out of order? |
| Authorization | No token or no permission? |
| Dependencies | DB, external API or MQ fails or is slow? |
| Connection | Event while the WebSocket was down? Reconnect? |

- A case that is handled as defined and continues becomes a `.feature` scenario of the original requirement.
- A case that ends in a failure visible to the caller becomes its own requirement. Error codes and payloads live in the contract file.
- Do not add exceptions that were not confirmed in code or by the user.

## Changing requirements

- `## MODIFIED Requirements` repeats the whole requirement. Copy unchanged sentences character for character from the current spec; archive replaces the old requirement with this block.
- Before a decision changes existing behavior, find why it behaves that way now (code, commits, decision records) and write it in the decision record's `Context`.
- A decision record lists rejected options with reasons. Recommend the design you would build if this requirement had existed from the start, not a patch on the current design.

## Splitting work (tasks.md)

- A task group (`## ` section) is a narrow vertical slice through contract, scenario, code and test. A finished group can be checked on its own.
- Every ADDED or MODIFIED requirement id is written in exactly one group (the `tasks` check of `aiwf check`).
- The first line under a group title is `Blocked by: 1, 2` or `Blocked by: none`. Groups without a blocking relation that edit the same contract file or setting are merged or given one.
- Inside a group the order is contract edit, failing scenario and test, implementation, passing check. A bug fix starts with a failing test that reproduces the bug. A non-functional requirement starts with measuring the current value.
- A breaking contract change is split into three groups: add the new shape, move the callers (one group per consumer), delete the old shape.
- Completion conditions are real API responses, WebSocket or MQ messages, scenario runs. "Build succeeds" is not a completion condition.

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

## Style

Write sentences that have one meaning on first reading.

| Avoid | Write instead |
|---|---|
| Several names for one thing (order, purchase, request) | The single name from the glossary |
| Passive voice that hides the actor | Name the actor: "The system SHALL retry 3 times" |
| Inflated verbs (leverage, utilize) | use |
| Two behaviors in one sentence | Split the requirement |
| Hedging ("may possibly") | State what was confirmed, otherwise an `Unverified:` line |
| Unexplained jargon (fan-out, kickoff) | Explain it in parentheses on first use, then keep the same word |
| A sentence that would fit any other project's document | A behavior or a number |

Wording a machine can catch is listed in `banned-phrases.txt`.

## What not to write

- Anything unconfirmed. Leave a line starting with `Unverified:` instead of guessing.
- Wording that cannot be judged. The list is in `banned-phrases.txt`. Write "within 2 seconds", not "quickly".
- Introductions, summary sections, the same content as both table and prose.
- Change history. No strikethrough, dated notes or "previously". History lives in Git and `changes/archive`.
- Files over 300 lines. Split the capability instead.

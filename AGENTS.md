# Working on my-ai-workflow

This repository is a Node.js CLI (`aiwf`) and a set of agent skills layered on OpenSpec. Its only dependency is the OpenSpec CLI, declared in `package.json` and resolved from PATH first.

## Module boundaries

| Path | Role |
|---|---|
| `src/openspec-adapter.mjs` | the only module that calls the OpenSpec CLI or knows the shape of `spec.md` and the `openspec/` folders |
| `src/config.mjs` | `openspec/workflow.json`: defaults, loading, mapping a spec path to its app or interface |
| `src/model.mjs` | reads the project once into the data all checks share |
| `src/gherkin.mjs` | minimal Gherkin reader (English and Korean keywords) |
| `src/checks/*.mjs` | one file per check; each exports `check<Name>(model, report, options)` |
| `src/messages.mjs` | finding messages in every supported language |
| `src/commands/*.mjs` | one file per CLI command |
| `templates/<lang>/` | files copied or rendered into a project; every language has the same file set |
| `skills/` | agent skills; they are also the Claude Code plugin content |

## Rules

- Keep OpenSpec knowledge inside the adapter. When OpenSpec changes its CLI output or Markdown format, change the adapter and `SUPPORTED`, then run `aiwf doctor` in a real project.
- Never copy OpenSpec's skills or templates into this repository. Project rules reach OpenSpec through `openspec/config.yaml` only.
- A new finding needs a code in `src/messages.mjs` with a message in every language and a test in `test/`.
- A new template file is added to every language folder.
- Commands never overwrite a user's file. `init` writes only missing files and the marked block in `openspec/config.yaml`.
- No VCS host, company or project names in templates and examples.

## Verify

```
npm test
```

Then, in a scratch project with `openspec init` done: `aiwf init`, `aiwf add app`, a change with a delta spec and a `.feature` file, `aiwf check`, `openspec archive`, `aiwf doctor`.

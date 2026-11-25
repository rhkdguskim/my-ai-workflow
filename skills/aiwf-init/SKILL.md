---
name: aiwf-init
description: Set up the my-ai-workflow spec structure in a project that uses OpenSpec - workflow.json, phase/app/capability folders, writing rules, Gherkin test tree and contract folders. Use when the user wants to adopt my-ai-workflow, scaffold spec folders, register an app or interface, or says "aiwf init".
---

# Set up my-ai-workflow

The CLI is `bin/aiwf.mjs` in the plugin root, two folders above this skill's base directory. Run it as `node "<plugin root>/bin/aiwf.mjs" <command>`, or as `aiwf <command>` when it is on PATH. Without a local copy use `npx -y github:rhkdguskim/my-ai-workflow <command>`.

## Steps

1. Run `aiwf doctor`. If OpenSpec is missing, tell the user to install it (`npm install -g @fission-ai/openspec`) and stop. If the project has no `openspec/` folder, ask the user before running `openspec init`.
2. If `openspec/workflow.json` does not exist, ask the user for:
   - language of the generated documents: `ko` or `en`
   - phases, if development is split into phases with different functionality (for example `phase1,phase2`); none otherwise
3. Run `aiwf init --lang <lang> [--phases <a,b>]`. It never overwrites existing files.
4. Ask the user for the apps: id, id prefix, owner, source folders. Register each with
   `aiwf add app <id> --prefix <PREFIX> [--phase <phase>] --owner <name> --source <dir,dir>`.
   Do not invent owners or prefixes. If the user does not know yet, leave the owner empty and say that approval checks will warn.
5. Ask for the interfaces between apps and register each with
   `aiwf add interface <id> --kinds <openapi|asyncapi[,..]> [--phase <phase>] --owner <name> --consumers <a,b>`.
   REST is `openapi`. WebSocket, RabbitMQ and other message channels are `asyncapi`.
6. Run `aiwf check` and report the result. A new project reports only missing content the user still has to write.

## Rules

- Specs are not created by this skill. Requirements enter `openspec/specs` through OpenSpec changes (`openspec-propose`, then archive). For existing code use the `aiwf-baseline` skill.
- Read `openspec/project/rules/spec-writing.md` after init; it is the project's copy of the writing rules and the user may have edited it.

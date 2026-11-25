#!/usr/bin/env node
import { findRoot, parseArgs, UserError } from '../src/util.mjs';
import { init } from '../src/commands/init.mjs';
import { add, nextId } from '../src/commands/add.mjs';
import { check } from '../src/commands/check.mjs';
import { approve } from '../src/commands/approve.mjs';
import { doctor } from '../src/commands/doctor.mjs';
import { openspec } from '../src/commands/openspec.mjs';
import { skills } from '../src/commands/skills.mjs';

const HELP = `aiwf - team spec workflow on top of OpenSpec

  aiwf init [--lang ko|en] [--phases phase1,phase2]   set up openspec/workflow.json, rules and folders
  aiwf add app <id> --prefix <PREFIX> [--phase p] [--owner name] [--source dir,dir]
  aiwf add interface <id> --kinds openapi,asyncapi [--phase p] [--owner name] [--consumers a,b]
  aiwf add decision <title>
  aiwf next-id <app-or-interface id> [--kind FR] [--phase p]
  aiwf check [--only structure,ids,trace,slop,approval,contracts] [--gate <change>] [--json]
  aiwf approve <change> --by <owner name>
  aiwf doctor                                         verify OpenSpec compatibility
  aiwf skills install [--dir <folder>]                copy skills for agents without plugin support (default ~/.agents/skills)
  aiwf openspec status                                installed / latest / tested OpenSpec versions
  aiwf openspec upgrade [--to <version>] [--force]    upgrade OpenSpec, refresh, verify
  aiwf openspec <any openspec arguments>              pass through to the OpenSpec CLI
`;

const [command, ...rest] = process.argv.slice(2);
const { flags, positional } = parseArgs(rest);
const root = findRoot();
const needRoot = () => {
  if (!root) throw new UserError('No openspec/ folder found. Run `openspec init` in the project root first.');
  return root;
};

try {
  let code;
  switch (command) {
    case 'init': code = init(root, flags); break;
    case 'add': code = add(needRoot(), positional, flags); break;
    case 'next-id': code = nextId(needRoot(), positional, flags); break;
    case 'check': code = check(needRoot(), flags); break;
    case 'approve': code = approve(needRoot(), positional, flags); break;
    case 'doctor': code = doctor(root); break;
    case 'skills': code = skills(root, positional, flags); break;
    case 'openspec': code = openspec(root, positional, flags, rest); break;
    case undefined:
    case 'help':
    case '--help':
    case '-h': console.log(HELP); code = 0; break;
    default: console.error(`Unknown command "${command}".\n\n${HELP}`); code = 2;
  }
  process.exitCode = code;
} catch (e) {
  if (!(e instanceof UserError)) throw e;
  console.error(e.message);
  process.exitCode = 2;
}

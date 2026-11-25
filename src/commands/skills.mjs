import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PKG_ROOT, UserError } from '../util.mjs';

/**
 * Copies the skills to a folder read by agents that do not load Claude Code plugins
 * (Codex and others read ~/.agents/skills). Existing copies are replaced.
 */
export function skills(_root, [sub], flags) {
  if (sub !== 'install') throw new UserError('Usage: aiwf skills install [--dir <skills folder>]');
  const target = path.resolve(typeof flags.dir === 'string' ? flags.dir : path.join(os.homedir(), '.agents', 'skills'));
  const source = path.join(PKG_ROOT, 'skills');
  for (const name of fs.readdirSync(source)) {
    fs.cpSync(path.join(source, name), path.join(target, name), { recursive: true, force: true });
    console.log(`installed ${path.join(target, name)}`);
  }
  return 0;
}

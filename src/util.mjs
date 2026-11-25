import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Nearest ancestor directory that contains an `openspec/` folder. */
export function findRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    const candidate = path.join(dir, 'openspec');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** All files under `dir` accepted by `accept(file)`. Directories rejected by `skipDir(dir)` are not entered. */
export function walk(dir, accept = () => true, skipDir = () => false) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        if (!skipDir(full, entry.name)) stack.push(full);
      } else if (entry.isFile() && accept(full, entry.name)) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

export const toPosix = (p) => p.split(path.sep).join('/');
export const rel = (root, file) => toPosix(path.relative(root, file));

export function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
}

/** Writes only when the file does not exist. Returns true when written. */
export function writeNew(file, content) {
  if (fs.existsSync(file)) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

export function render(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

/** Parses `--key value`, `--flag` and positionals. */
export function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) flags[key] = true;
      else {
        flags[key] = next;
        i++;
      }
    } else positional.push(arg);
  }
  return { flags, positional };
}

export class UserError extends Error {}

/** Full path of an executable on PATH, or null. Honors PATHEXT on Windows. */
export function findExecutable(name) {
  const win = process.platform === 'win32';
  // npm puts an extensionless shell script next to each .cmd shim; Windows cannot execute it,
  // so a bare name is matched only through PATHEXT there.
  const exts = win && !path.extname(name) ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';').filter(Boolean) : [''];
  const dirs = path.isAbsolute(name) ? [''] : (process.env.PATH ?? '').split(path.delimiter);
  for (const dir of dirs) {
    for (const ext of exts) {
      const full = path.join(dir, name + ext);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
    }
  }
  return null;
}

const quote = (arg) => (/^[\w@%+=:,./\\-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '\\"')}"`);

/**
 * Runs an executable and returns { found, status, stdout, stderr }.
 * `found: false` means the program is not installed; nothing was run.
 * Windows .cmd/.bat shims (npm, openspec) need a shell, so they are run as one quoted command line.
 */
export function run(name, args = [], options = {}) {
  const exe = findExecutable(name);
  if (!exe) return { found: false, status: null, stdout: '', stderr: '' };
  const viaShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(exe);
  const res = viaShell
    ? spawnSync([exe, ...args].map(quote).join(' '), { encoding: 'utf8', shell: true, ...options })
    : spawnSync(exe, args, { encoding: 'utf8', ...options });
  return { found: true, status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

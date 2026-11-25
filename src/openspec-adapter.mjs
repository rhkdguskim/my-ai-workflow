/**
 * The only module that knows about OpenSpec: its CLI, its folder names and the
 * Markdown shape of spec.md. When OpenSpec changes, this file (and the range
 * in SUPPORTED) is the place to adapt. `aiwf doctor` compares parseSpec with
 * `openspec show --json` to detect format drift after an OpenSpec upgrade.
 */
import fs from 'node:fs';
import path from 'node:path';
import { walk, rel, readText, run, findExecutable, PKG_ROOT } from './util.mjs';

export const SUPPORTED = { min: [2, 2, 0], belowMajor: 3 };

/**
 * The OpenSpec CLI to use: the one on PATH (the same one OpenSpec's own skills call),
 * otherwise the copy installed as this package's dependency.
 */
export function openspecExecutable() {
  return findExecutable('openspec') ?? findExecutable(path.join(PKG_ROOT, 'node_modules', '.bin', 'openspec'));
}

export function runOpenspec(args, cwd, options = {}) {
  const exe = openspecExecutable();
  if (!exe) return { ok: false, status: null, stdout: '', stderr: '', missing: true };
  const res = run(exe, args, { cwd: cwd ?? process.cwd(), ...options });
  return { ok: res.status === 0, status: res.status, stdout: res.stdout, stderr: res.stderr, missing: false };
}

export function openspecVersion(cwd) {
  const res = runOpenspec(['--version'], cwd);
  const m = res.stdout.match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? m.slice(1).map(Number) : null;
}

export function isSupported(version) {
  if (!version) return false;
  const [maj, min, pat] = version;
  const [a, b, c] = SUPPORTED.min;
  if (maj >= SUPPORTED.belowMajor) return false;
  return maj > a || (maj === a && (min > b || (min === b && pat >= c)));
}

export const specsRoot = (root) => path.join(root, 'openspec', 'specs');
export const changesRoot = (root) => path.join(root, 'openspec', 'changes');

/** [{ id, file }] for every spec.md under openspec/specs. id uses '/' separators. */
export function listSpecs(root) {
  const base = specsRoot(root);
  return walk(base, (_f, name) => name === 'spec.md').map((file) => ({ id: rel(base, path.dirname(file)), file }));
}

/** Names of active changes (the archive folder is excluded). */
export function listChanges(root) {
  const base = changesRoot(root);
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'archive')
    .map((e) => e.name)
    .sort();
}

/** [{ id, file }] for the delta specs of one change. */
export function listChangeSpecs(root, change) {
  const base = path.join(changesRoot(root), change, 'specs');
  return walk(base, (_f, name) => name === 'spec.md').map((file) => ({ id: rel(base, path.dirname(file)), file }));
}

export function changeFile(root, change, name) {
  return path.join(changesRoot(root), change, name);
}

/** True when tasks.md of the change has at least one checked task. */
export function changeStarted(root, change) {
  const file = changeFile(root, change, 'tasks.md');
  return fs.existsSync(file) && /^\s*-\s*\[[xX]\]/m.test(readText(file));
}

/**
 * Parses a spec.md or a delta spec.
 * Returns requirements as { name, line, op, body[], scenarios[{ name, line }] }.
 * `op` is ADDED | MODIFIED | REMOVED | RENAMED for delta specs, null for main specs.
 */
export function parseSpec(text) {
  const requirements = [];
  let cur = null;
  let op = null;
  let fence = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      cur?.body.push(line);
      return;
    }
    if (fence) {
      cur?.body.push(line);
      return;
    }
    let m;
    if ((m = line.match(/^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/))) {
      op = m[1];
      cur = null;
    } else if (/^##\s+/.test(line)) {
      op = null;
      cur = null;
    } else if ((m = line.match(/^###\s+Requirement:\s*(.+?)\s*$/))) {
      cur = { name: m[1], line: i + 1, op, body: [], scenarios: [] };
      requirements.push(cur);
    } else if (/^###\s+/.test(line)) {
      cur = null;
    } else if (cur && (m = line.match(/^####\s+Scenario:\s*(.+?)\s*$/))) {
      cur.scenarios.push({ name: m[1], line: i + 1 });
    } else {
      cur?.body.push(line);
    }
  });
  return { requirements };
}

/** Requirement and scenario names as OpenSpec itself reads them, or null when the CLI call fails. */
export function cliSpecOutline(root, id) {
  const res = runOpenspec(['show', id, '--type', 'spec', '--json'], root);
  if (!res.ok) return null;
  try {
    const json = JSON.parse(res.stdout);
    return json.requirements.map((r) => ({ name: r.name, scenarios: r.scenarios.map((s) => s.name) }));
  } catch {
    return null;
  }
}

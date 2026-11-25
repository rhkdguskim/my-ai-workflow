import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { contractsDir } from '../config.mjs';
import { rel, readText, run } from '../util.mjs';

const git = (root, args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });

export function contractVersion(text) {
  return text.match(/^info:[ \t]*\r?\n(?:[ \t]+.*\r?\n)*?[ \t]+version:[ \t]*['"]?([^'"\r\n#]+?)['"]?[ \t]*(?:#.*)?$/m)?.[1] ?? null;
}

const major = (v) => Number(String(v).match(/\d+/)?.[0] ?? NaN);

function runBreakingTool(command, baseText, headFile) {
  if (!Array.isArray(command) || command.length === 0) return { available: false };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwf-'));
  const baseFile = path.join(tmp, path.basename(headFile));
  fs.writeFileSync(baseFile, baseText, 'utf8');
  try {
    const [bin, ...args] = command.map((a) => a.replace('{base}', baseFile).replace('{head}', headFile));
    const res = run(bin, args);
    if (!res.found) return { available: false };
    return { available: true, breaking: res.status !== 0, output: `${res.stdout}${res.stderr}`.trim() };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Machine contracts: required files exist, any change since the base ref bumps info.version,
 * and a change the configured tool reports as breaking bumps the major version.
 */
export function checkContracts(model, report) {
  const { root, cfg } = model;
  const baseRef = cfg.contracts.baseRef;
  const baseOk = git(root, ['rev-parse', '--verify', '--quiet', `${baseRef}^{commit}`]).status === 0;
  let baseWarned = false;

  for (const iface of cfg.interfaces) {
    const dir = path.join(contractsDir(root), ...(cfg.phases.length ? [iface.phase] : []), iface.id);
    if (!fs.existsSync(dir)) {
      report.error('CONTRACT_DIR_MISSING', dir, 1, iface.id);
      continue;
    }
    for (const kind of iface.kinds ?? []) {
      const file = path.join(dir, `${kind}.yaml`);
      if (!fs.existsSync(file)) {
        report.error('CONTRACT_FILE_MISSING', file, 1, iface.id, kind);
        continue;
      }
      const head = readText(file);
      const headVersion = contractVersion(head);
      if (!headVersion) {
        report.error('CONTRACT_VERSION_MISSING', file, 1);
        continue;
      }
      if (!baseOk) {
        if (!baseWarned) report.warn('CONTRACT_BASE_UNRESOLVED', file, 1, baseRef);
        baseWarned = true;
        continue;
      }
      const shown = git(root, ['show', `${baseRef}:${rel(root, file)}`]);
      if (shown.status !== 0) continue; // new contract: nothing to compare with
      const baseVersion = contractVersion(shown.stdout);
      // This contract changed when its own file or a shared file (schemas, examples) changed.
      // The main file of another kind in the same folder is that kind's own contract.
      const otherMain = (iface.kinds ?? []).filter((k) => k !== kind).map((k) => `${rel(root, dir)}/${k}.yaml`);
      const changedFiles = git(root, ['diff', '--name-only', baseRef, '--', rel(root, dir)]).stdout.split(/\r?\n/).filter(Boolean);
      if (!changedFiles.some((f) => !otherMain.includes(f))) continue;
      if (baseVersion === headVersion) {
        report.error('CONTRACT_VERSION_NOT_BUMPED', file, 1, baseRef, headVersion);
        continue;
      }
      const tool = runBreakingTool(cfg.contracts.tools[`${kind}Breaking`], shown.stdout, file);
      if (!tool.available) report.warn('CONTRACT_TOOL_MISSING', file, 1, kind);
      else if (tool.breaking && !(major(headVersion) > major(baseVersion))) {
        report.error('CONTRACT_BREAKING', file, 1, baseRef, baseVersion, headVersion, tool.output.split(/\r?\n/).slice(0, 3).join(' | '));
      }
    }
  }
}

import { SUPPORTED, openspecVersion, runOpenspec } from '../openspec-adapter.mjs';
import { diagnose } from './doctor.mjs';
import { init } from './init.mjs';
import { UserError, run } from '../util.mjs';

const PACKAGE = '@fission-ai/openspec';
const npm = (args) => run('npm', args);

function latestVersion() {
  const res = npm(['view', PACKAGE, 'version']);
  return res.status === 0 ? res.stdout.trim() : null;
}

function status(root) {
  const installed = openspecVersion(root)?.join('.') ?? 'not installed';
  const latest = latestVersion() ?? 'unknown (npm registry not reachable)';
  console.log(`installed: ${installed}\nlatest:    ${latest}\ntested:    >=${SUPPORTED.min.join('.')} <${SUPPORTED.belowMajor}.0.0`);
  return 0;
}

/**
 * Upgrades the OpenSpec CLI, refreshes the files OpenSpec generates in the project,
 * re-applies the workflow block in openspec/config.yaml and verifies compatibility.
 * Prints the rollback command when verification fails.
 */
function upgrade(root, flags) {
  if (!root) throw new UserError('No openspec/ folder found. Run `openspec init` first.');
  const before = openspecVersion(root)?.join('.') ?? null;
  const target = typeof flags.to === 'string' ? flags.to : latestVersion();
  if (!target) throw new UserError('Cannot determine the target version. Pass --to <version>.');

  const targetMajor = Number(target.split('.')[0]);
  if (targetMajor >= SUPPORTED.belowMajor && !flags.force) {
    throw new UserError(`openspec ${target} is a new major version that aiwf has not been tested with. Re-run with --force to try it.`);
  }
  if (before === target) console.log(`openspec ${target} is already installed.`);
  else {
    console.log(`Installing ${PACKAGE}@${target} (was ${before ?? 'not installed'})...`);
    const res = npm(['install', '-g', `${PACKAGE}@${target}`]);
    if (res.status !== 0) throw new UserError(`npm install failed:\n${res.stderr}`);
  }

  const update = runOpenspec(['update'], root);
  console.log(update.ok ? 'openspec update: done' : `openspec update failed:\n${update.stdout}${update.stderr}`);

  init(root, {});
  const result = diagnose(root);
  console.log(`\n${result.lines.join('\n')}`);
  if (!result.ok && before && before !== target) console.log(`\nTo roll back: npm install -g ${PACKAGE}@${before}`);
  return result.ok && update.ok ? 0 : 1;
}

/**
 * `aiwf openspec status|upgrade` are handled here. Any other arguments are passed to the
 * OpenSpec CLI unchanged, so every OpenSpec command is reachable through aiwf.
 */
export function openspec(root, [sub], flags, rawArgs = []) {
  if (sub === 'status') return status(root);
  if (sub === 'upgrade') return upgrade(root, flags);
  const res = runOpenspec(rawArgs, process.cwd(), { stdio: 'inherit' });
  if (res.missing) throw new UserError('openspec CLI not found. Install with: npm install -g @fission-ai/openspec');
  return res.status ?? 1;
}

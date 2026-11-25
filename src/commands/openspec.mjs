import { SUPPORTED, openspecVersion, runOpenspec } from '../openspec-adapter.mjs';
import { diagnose } from './doctor.mjs';
import { init } from './init.mjs';
import { UserError, run } from '../util.mjs';
import { t } from '../i18n.mjs';

const PACKAGE = '@fission-ai/openspec';
const npm = (args) => run('npm', args);

function latestVersion() {
  const res = npm(['view', PACKAGE, 'version']);
  return res.status === 0 ? res.stdout.trim() : null;
}

function status(root) {
  const installed = openspecVersion(root)?.join('.') ?? t('OS_NOT_INSTALLED');
  const latest = latestVersion() ?? t('OS_UNKNOWN_LATEST');
  console.log(`${t('OS_INSTALLED')}: ${installed}\n${t('OS_LATEST')}: ${latest}\n${t('OS_TESTED')}: >=${SUPPORTED.min.join('.')} <${SUPPORTED.belowMajor}.0.0`);
  return 0;
}

/**
 * Upgrades the OpenSpec CLI, refreshes the files OpenSpec generates in the project,
 * re-applies the workflow block in openspec/config.yaml and verifies compatibility.
 * Prints the rollback command when verification fails.
 */
function upgrade(root, flags) {
  if (!root) throw new UserError(t('NO_OPENSPEC'));
  const before = openspecVersion(root)?.join('.') ?? null;
  const target = typeof flags.to === 'string' ? flags.to : latestVersion();
  if (!target) throw new UserError(t('OS_NO_TARGET'));

  const targetMajor = Number(target.split('.')[0]);
  if (targetMajor >= SUPPORTED.belowMajor && !flags.force) {
    throw new UserError(t('OS_MAJOR', target));
  }
  if (before === target) console.log(t('OS_ALREADY', target));
  else {
    console.log(t('OS_INSTALLING', `${PACKAGE}@${target}`, before ?? t('OS_NOT_INSTALLED')));
    const res = npm(['install', '-g', `${PACKAGE}@${target}`]);
    if (res.status !== 0) throw new UserError(t('OS_NPM_FAILED', res.stderr));
  }

  const update = runOpenspec(['update'], root);
  console.log(update.ok ? t('OS_UPDATE_DONE') : t('OS_UPDATE_FAILED', `${update.stdout}${update.stderr}`));

  init(root, {});
  const result = diagnose(root);
  console.log(`\n${result.lines.join('\n')}`);
  if (!result.ok && before && before !== target) console.log(`\n${t('OS_ROLLBACK', `npm install -g ${PACKAGE}@${before}`)}`);
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
  if (res.missing) throw new UserError(t('OS_CLI_MISSING'));
  return res.status ?? 1;
}

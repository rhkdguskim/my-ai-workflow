import { findExecutable, run, UserError } from '../util.mjs';
import { t } from '../i18n.mjs';

/**
 * External programs the checks call. Only tools installable with npm are installed by aiwf;
 * they are installed globally so that a plugin checkout without node_modules can use them.
 */
export const TOOLS = [{ bin: 'asyncapi', npm: '@asyncapi/cli', purpose: 'asyncapi' }];

/** Installs every missing tool. Returns true when all tools are present afterwards. */
export function installTools() {
  let ok = true;
  for (const tool of TOOLS) {
    if (findExecutable(tool.bin)) {
      console.log(t('TOOL_PRESENT', tool.bin));
      continue;
    }
    console.log(t('TOOL_INSTALLING', tool.npm));
    const res = run('npm', ['install', '-g', tool.npm]);
    if (res.found && res.status === 0 && findExecutable(tool.bin)) console.log(t('TOOL_INSTALLED', tool.bin));
    else {
      ok = false;
      console.log(t('TOOL_INSTALL_FAILED', tool.npm));
    }
  }
  return ok;
}

export function tools(_root, [sub]) {
  if (sub === 'install') return installTools() ? 0 : 1;
  if (sub === 'status') {
    for (const tool of TOOLS) console.log(findExecutable(tool.bin) ? t('TOOL_PRESENT', tool.bin) : t('TOOL_ABSENT', tool.bin, tool.npm));
    return 0;
  }
  throw new UserError(t('USAGE', 'aiwf tools <status|install>'));
}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PKG_ROOT, UserError } from '../util.mjs';
import { t, saveUserLanguage, userConfigPath, LANGUAGES } from '../i18n.mjs';

/**
 * Copies the skills to a folder read by agents that do not load Claude Code plugins
 * (Codex and others read ~/.agents/skills). Existing copies are replaced.
 */
export function skills(_root, [sub], flags) {
  if (sub !== 'install') throw new UserError(t('USAGE', 'aiwf skills install [--dir <skills folder>] [--lang ko|en]'));
  const target = path.resolve(typeof flags.dir === 'string' ? flags.dir : path.join(os.homedir(), '.agents', 'skills'));
  const source = path.join(PKG_ROOT, 'skills');
  for (const name of fs.readdirSync(source)) {
    fs.cpSync(path.join(source, name), path.join(target, name), { recursive: true, force: true });
    console.log(t('SKILL_INSTALLED', path.join(target, name)));
  }
  // --lang at install time becomes the user's display language for every project.
  if (typeof flags.lang === 'string') {
    if (!LANGUAGES.includes(flags.lang)) throw new UserError(t('LANG_INVALID', LANGUAGES.join(', ')));
    saveUserLanguage(flags.lang);
    console.log(t('LANG_SAVED', flags.lang, userConfigPath()));
  }
  return 0;
}

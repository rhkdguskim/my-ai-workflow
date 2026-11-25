#!/usr/bin/env node
import { findRoot, parseArgs, UserError } from '../src/util.mjs';
import { resolveLanguage, setLanguage, saveUserLanguage, userConfigPath, help, t, LANGUAGES } from '../src/i18n.mjs';
import { init } from '../src/commands/init.mjs';
import { add, nextId } from '../src/commands/add.mjs';
import { check } from '../src/commands/check.mjs';
import { approve } from '../src/commands/approve.mjs';
import { doctor } from '../src/commands/doctor.mjs';
import { openspec } from '../src/commands/openspec.mjs';
import { skills } from '../src/commands/skills.mjs';
import { tools } from '../src/commands/tools.mjs';

const [command, ...rest] = process.argv.slice(2);
const { flags, positional } = parseArgs(rest);
const root = findRoot();
setLanguage(resolveLanguage({ flag: typeof flags.lang === 'string' ? flags.lang : null, root }).language);

const needRoot = () => {
  if (!root) throw new UserError(t('NO_OPENSPEC'));
  return root;
};

/** `aiwf lang` shows the display language and where it came from; `aiwf lang ko|en` saves it for this user. */
function lang([value]) {
  if (value === undefined) {
    const { language, source } = resolveLanguage({ flag: typeof flags.lang === 'string' ? flags.lang : null, root });
    console.log(t('LANG_SHOW', language, source));
    return 0;
  }
  if (!LANGUAGES.includes(value)) throw new UserError(t('LANG_INVALID', LANGUAGES.join(', ')));
  saveUserLanguage(value);
  setLanguage(value);
  console.log(t('LANG_SAVED', value, userConfigPath()));
  return 0;
}

try {
  let code;
  switch (command) {
    case 'init': code = init(root, flags); break;
    case 'add': code = add(needRoot(), positional, flags); break;
    case 'next-id': code = nextId(needRoot(), positional, flags); break;
    case 'check': code = check(needRoot(), flags); break;
    case 'approve': code = approve(needRoot(), positional, flags); break;
    case 'doctor': code = doctor(root); break;
    case 'tools': code = tools(root, positional); break;
    case 'skills': code = skills(root, positional, flags); break;
    case 'lang': code = lang(positional); break;
    case 'openspec': code = openspec(root, positional, flags, rest); break;
    case undefined:
    case 'help':
    case '--help':
    case '-h': console.log(help()); code = 0; break;
    default: console.error(`${t('UNKNOWN_COMMAND', command)}\n\n${help()}`); code = 2;
  }
  process.exitCode = code;
} catch (e) {
  if (!(e instanceof UserError)) throw e;
  console.error(e.message);
  process.exitCode = 2;
}

import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_REL, LANGUAGES, configPath, defaultConfig, loadConfig, saveConfig, specsDir, testsDir, contractsDir, projectDir } from '../config.mjs';
import { PKG_ROOT, walk, rel, readText, writeNew, render, UserError } from '../util.mjs';

const BEGIN = '# >>> my-ai-workflow (managed block; re-run `aiwf init` to refresh)';
const END = '# <<< my-ai-workflow';
/** First line of templates/<lang>/config-rules.yaml; tells our rules apart from the project's own. */
const RULES_MARK = '# my-ai-workflow rules';

export const templateDir = (language) => path.join(PKG_ROOT, 'templates', language);
export const template = (language, name) => readText(path.join(templateDir(language), name));

/**
 * Puts the workflow context into openspec/config.yaml without parsing YAML:
 * the managed block lives inside the `context: |` block scalar and is replaced on re-run.
 * `rules:` is appended only when the file has no active `rules:` key.
 */
export function mergeOpenspecConfig(text, context, rules) {
  const block = [BEGIN, ...context.trimEnd().split(/\r?\n/), END].map((l) => (l ? `  ${l}` : '')).join('\n');
  const managed = new RegExp(`^[ \\t]*${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END}[ \\t]*$`, 'm');
  let out;
  let rulesNote = null;
  if (managed.test(text)) out = text.replace(managed, block);
  else if (/^context:\s*\|[^\n]*$/m.test(text)) out = text.replace(/^context:\s*\|[^\n]*$/m, (m) => `${m}\n${block}`);
  else if (/^context:/m.test(text)) return { text, contextNote: 'manual', rulesNote: 'manual' };
  else out = `${text.trimEnd()}\n\ncontext: |\n${block}\n`;

  if (!/^rules:/m.test(out)) out = `${out.trimEnd()}\n\n${rules.trimEnd()}\n`;
  else if (!out.includes(RULES_MARK)) rulesNote = 'manual';
  return { text: out, contextNote: null, rulesNote };
}

export function init(root, flags) {
  if (!root) throw new UserError('No openspec/ folder found. Run `openspec init` in the project root first.');
  const created = [];
  const note = (file) => created.push(rel(root, file));

  let cfg;
  if (fs.existsSync(configPath(root))) cfg = loadConfig(root);
  else {
    const language = typeof flags.lang === 'string' ? flags.lang : 'en';
    if (!LANGUAGES.includes(language)) throw new UserError(`--lang must be one of ${LANGUAGES.join(', ')}`);
    const phases = typeof flags.phases === 'string' ? flags.phases.split(',').map((p) => p.trim()).filter(Boolean) : [];
    cfg = defaultConfig(language, phases);
    saveConfig(root, cfg);
    note(configPath(root));
  }

  const projectTemplates = path.join(templateDir(cfg.language), 'project');
  for (const file of walk(projectTemplates)) {
    const target = path.join(projectDir(root), path.relative(projectTemplates, file));
    if (writeNew(target, readText(file))) note(target);
  }
  for (const dir of ['decisions']) fs.mkdirSync(path.join(projectDir(root), dir), { recursive: true });

  const phaseDirs = cfg.phases.length ? cfg.phases : [''];
  for (const phase of phaseDirs) {
    for (const base of [specsDir(root), testsDir(root), contractsDir(root)]) fs.mkdirSync(path.join(base, phase), { recursive: true });
    const vars = { phase: phase || 'project' };
    const readme = path.join(specsDir(root), phase, 'README.md');
    if (writeNew(readme, render(template(cfg.language, 'phase-readme.md'), vars))) note(readme);
    const constants = path.join(specsDir(root), phase, 'constants.yaml');
    if (writeNew(constants, render(template(cfg.language, 'constants.yaml'), vars))) note(constants);
  }

  const openspecConfig = path.join(root, 'openspec', 'config.yaml');
  const before = fs.existsSync(openspecConfig) ? readText(openspecConfig) : 'schema: spec-driven\n';
  const merged = mergeOpenspecConfig(before, template(cfg.language, 'config-context.txt'), template(cfg.language, 'config-rules.yaml'));
  if (merged.text !== before) {
    fs.writeFileSync(openspecConfig, merged.text, 'utf8');
    note(openspecConfig);
  }

  console.log(created.length ? `Created or updated:\n${created.map((f) => `  ${f}`).join('\n')}` : 'Nothing to do; everything already exists.');
  if (merged.contextNote || merged.rulesNote) {
    console.log(`\nopenspec/config.yaml already has its own ${merged.contextNote ? 'context' : 'rules'} section in a form aiwf does not edit.`);
    console.log(`Merge by hand from: ${rel(root, templateDir(cfg.language))}/config-${merged.contextNote ? 'context.txt' : 'rules.yaml'}`);
  }
  console.log(`\nNext: edit ${CONFIG_REL} or run \`aiwf add app <id> --prefix <PREFIX>\`.`);
  return 0;
}

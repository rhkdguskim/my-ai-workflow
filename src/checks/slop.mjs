import fs from 'node:fs';
import path from 'node:path';
import { projectDir } from '../config.mjs';
import { walk, readText } from '../util.mjs';

export const BANNED_REL = 'rules/banned-phrases.txt';

export function loadBannedPhrases(root) {
  const file = path.join(projectDir(root), BANNED_REL);
  if (!fs.existsSync(file)) return [];
  return readText(file)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

/** File length, banned phrases and scenario length. Rule documents themselves are not scanned. */
export function checkSlop(model, report) {
  const { root, cfg } = model;
  const openspecDir = path.join(root, 'openspec');
  const rulesDir = path.join(projectDir(root), 'rules');
  const banned = loadBannedPhrases(root).map((p) => ({ phrase: p, needle: p.toLowerCase() }));

  const files = walk(
    openspecDir,
    (_f, name) => name.endsWith('.md') || name.endsWith('.feature'),
    (dir, name) => name === 'archive' || dir === rulesDir,
  );

  for (const file of files) {
    const lines = readText(file).split(/\r?\n/);
    if (lines.at(-1) === '') lines.pop();
    if (lines.length > cfg.limits.maxFileLines) report.error('FILE_TOO_LONG', file, 1, lines.length, cfg.limits.maxFileLines);
    lines.forEach((line, i) => {
      const lower = line.toLowerCase();
      for (const { phrase, needle } of banned) {
        if (lower.includes(needle)) report.error('BANNED_PHRASE', file, i + 1, phrase);
      }
    });
  }

  for (const feature of model.features) {
    for (const sc of feature.scenarios) {
      if (sc.steps > cfg.limits.maxScenarioSteps) report.error('SCENARIO_TOO_LONG', feature.file, sc.line, sc.name, sc.steps, cfg.limits.maxScenarioSteps);
    }
  }
}

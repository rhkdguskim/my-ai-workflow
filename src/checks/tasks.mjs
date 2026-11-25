import fs from 'node:fs';
import { listChanges, changeFile } from '../openspec-adapter.mjs';
import { readText } from '../util.mjs';

const ID_TOKEN = /[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*-\d{2,}[a-z]?(?:-T\d{2,})?/g;
const TEST_SUFFIX = /-T\d{2,}$/;

/** Requirement ids per `## ` group of a tasks.md. A test id counts for its requirement. */
function idsPerGroup(text) {
  const groups = [];
  let cur = { line: 1, ids: new Set() };
  groups.push(cur);
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^##\s+/.test(line)) {
      cur = { line: i + 1, ids: new Set() };
      groups.push(cur);
    }
    for (const token of line.match(ID_TOKEN) ?? []) cur.ids.add(token.replace(TEST_SUFFIX, ''));
  });
  return groups;
}

/**
 * Each ADDED or MODIFIED requirement of a change is delivered by exactly one task group
 * (one vertical slice). Missing is an error; spread over several groups is a warning.
 * Changes without tasks.md are skipped.
 */
export function checkTasks(model, report) {
  const { root } = model;
  for (const change of listChanges(root)) {
    const file = changeFile(root, change, 'tasks.md');
    if (!fs.existsSync(file)) continue;
    const groups = idsPerGroup(readText(file));
    const ids = new Set(
      model.deltas
        .filter((d) => d.change === change)
        .flatMap((d) => d.requirements)
        .filter((r) => r.op === 'ADDED' || r.op === 'MODIFIED')
        .map((r) => r.id),
    );
    for (const id of ids) {
      const hits = groups.filter((g) => g.ids.has(id));
      if (hits.length === 0) report.error('TASK_REQ_MISSING', file, 1, id, change);
      else if (hits.length > 1) report.warn('TASK_REQ_DUPLICATE', file, hits[1].line, id, hits.map((g) => g.line).join(', '));
    }
  }
}

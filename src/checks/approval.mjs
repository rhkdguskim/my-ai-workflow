import fs from 'node:fs';
import { listChanges, changeFile, changeStarted } from '../openspec-adapter.mjs';
import { readText } from '../util.mjs';

export const APPROVAL_FILE = 'approval.json';

export function readApprovals(root, change) {
  const file = changeFile(root, change, APPROVAL_FILE);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(readText(file)).approvals ?? [];
  } catch {
    return [];
  }
}

/**
 * A change needs approval from the owner of every app or interface whose spec it touches.
 * Changes with a checked task are always checked. `gate` forces the check for one change
 * before implementation starts.
 */
export function checkApproval(model, report, { gate = null } = {}) {
  const { root } = model;
  const changes = listChanges(root);
  if (gate && !changes.includes(gate)) {
    report.error('CHANGE_UNKNOWN', changeFile(root, gate, 'proposal.md'), 1, gate);
    return;
  }
  for (const change of changes) {
    if (change !== gate && !changeStarted(root, change)) continue;
    const anchor = changeFile(root, change, 'proposal.md');
    const required = new Set();
    for (const delta of model.deltas.filter((d) => d.change === change && d.cls.ok)) {
      const owner = delta.cls.entry.owner;
      if (owner) required.add(owner);
      else report.warn('OWNER_UNSET', anchor, 1, change, delta.cls.entry.id);
    }
    const approved = new Set(readApprovals(root, change).map((a) => a.by));
    const missing = [...required].filter((o) => !approved.has(o));
    if (missing.length) report.error('APPROVAL_MISSING', anchor, 1, change, missing.join(', '));
  }
}

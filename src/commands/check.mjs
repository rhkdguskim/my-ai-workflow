import { loadConfig } from '../config.mjs';
import { buildModel } from '../model.mjs';
import { Report } from '../report.mjs';
import { checkStructure } from '../checks/structure.mjs';
import { checkIds } from '../checks/ids.mjs';
import { checkTrace } from '../checks/trace.mjs';
import { checkSlop } from '../checks/slop.mjs';
import { checkApproval } from '../checks/approval.mjs';
import { checkContracts } from '../checks/contracts.mjs';

export const CHECKS = {
  structure: checkStructure,
  ids: checkIds,
  trace: checkTrace,
  slop: checkSlop,
  approval: checkApproval,
  contracts: checkContracts,
};

/** Runs the selected checks (all by default) and returns the report. */
export function runChecks(root, { only = null, gate = null } = {}) {
  const cfg = loadConfig(root);
  const model = buildModel(root, cfg);
  const report = new Report(root, cfg.language);
  for (const [name, check] of Object.entries(CHECKS)) {
    if (only && !only.includes(name)) continue;
    check(model, report, { gate });
  }
  return report;
}

export function check(root, flags) {
  const only = typeof flags.only === 'string' ? flags.only.split(',') : null;
  const gate = typeof flags.gate === 'string' ? flags.gate : null;
  const report = runChecks(root, { only, gate });
  console.log(flags.json ? JSON.stringify(report.toJSON(), null, 2) : report.toText());
  return report.errors.length ? 1 : 0;
}

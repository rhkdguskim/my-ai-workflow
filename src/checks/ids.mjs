import { requirementIdPattern } from '../config.mjs';
import { rel } from '../util.mjs';

/** Requirement ids: format per app or interface, uniqueness, status line. */
export function checkIds(model, report) {
  const { root, cfg } = model;

  for (const spec of [...model.specs, ...model.deltas]) {
    if (!spec.cls.ok) continue;
    const pattern = requirementIdPattern(spec.cls, cfg);
    for (const req of spec.requirements) {
      if (req.op === 'REMOVED' || req.op === 'RENAMED') continue;
      if (!pattern.test(req.id)) report.error('ID_FORMAT', req.file, req.line, req.name, pattern.source);
      if (req.status === null) report.error('STATUS_MISSING', req.file, req.line, req.id);
      else if (!model.statuses.includes(req.status)) report.error('STATUS_INVALID', req.file, req.line, req.id, req.status);
    }
  }

  for (const { req, prev } of model.duplicates) {
    report.error('ID_DUPLICATE', req.file, req.line, req.id, `${rel(root, prev.file)}:${prev.line}`);
  }
}

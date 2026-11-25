import fs from 'node:fs';
import path from 'node:path';
import { specsDir, projectDir } from '../config.mjs';

/** Folder layout: spec paths, app.md, test folders mirroring specs, decision files. */
export function checkStructure(model, report) {
  const { root, cfg } = model;

  for (const spec of [...model.specs, ...model.deltas]) {
    const cls = spec.cls;
    if (cls.ok) continue;
    const shape = cfg.phases.length ? '<phase>/<app>/<capability>' : '<app>/<capability>';
    if (cls.reason === 'depth') report.error('SPEC_PATH_DEPTH', spec.file, 1, cls.expected, shape);
    else if (cls.reason === 'phase') report.error('SPEC_PATH_PHASE', spec.file, 1, cls.phase);
    else if (cls.reason === 'app') report.error('SPEC_PATH_APP', spec.file, 1, cls.name);
    else report.error('SPEC_PATH_INTERFACE', spec.file, 1, cls.name);
  }

  for (const app of cfg.apps) {
    const dir = path.join(specsDir(root), ...(cfg.phases.length ? [app.phase] : []), app.id);
    if (!fs.existsSync(path.join(dir, 'app.md'))) report.error('APP_DOC_MISSING', path.join(dir, 'app.md'), 1, app.id);
  }

  for (const feature of model.features) {
    if (!model.knownSpecIds.has(feature.specId)) report.error('TEST_ORPHAN_DIR', feature.file, 1, feature.specId);
  }

  const decisionsDir = path.join(projectDir(root), 'decisions');
  const decisionFiles = fs.existsSync(decisionsDir) ? fs.readdirSync(decisionsDir) : [];
  const hasDecision = (id) => decisionFiles.some((f) => f === `${id}.md` || f.startsWith(`${id}-`));
  for (const req of model.requirements.values()) {
    for (const id of new Set(req.decisions)) {
      if (!hasDecision(id)) report.error('DECISION_MISSING', req.file, req.line, id);
    }
  }
}

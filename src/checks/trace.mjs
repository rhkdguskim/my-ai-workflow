import path from 'node:path';
import { TEST_TAG } from '../model.mjs';
import { walk, rel, readText } from '../util.mjs';

const SKIP_DIRS = new Set(['node_modules', '.git', 'bin', 'obj', 'dist', 'build', 'out', 'target', '.vs']);

/** Every id-shaped token found in source files under the given folders. */
function collectCodeIds(root, dirs, extensions, idTokens) {
  const found = new Set();
  const exts = new Set(extensions);
  for (const dir of new Set(dirs)) {
    const files = walk(
      path.resolve(root, dir),
      (_f, name) => exts.has(path.extname(name)),
      (_d, name) => SKIP_DIRS.has(name),
    );
    for (const file of files) {
      for (const token of readText(file).match(idTokens) ?? []) found.add(token);
    }
  }
  return found;
}

/**
 * Requirement <-> test scenario links are errors.
 * Requirement/test <-> code links are warnings.
 */
export function checkTrace(model, report) {
  const { root, cfg } = model;
  const tested = new Set();
  const testIds = new Map();

  for (const feature of model.features) {
    for (const sc of feature.scenarios) {
      const ids = sc.tags.filter((t) => TEST_TAG.test(t));
      if (ids.length === 0) {
        report.error('TEST_ID_MISSING', feature.file, sc.line, sc.name);
        continue;
      }
      if (ids.length > 1) {
        report.error('TEST_ID_MULTIPLE', feature.file, sc.line, sc.name, ids.join(', '));
        continue;
      }
      const testId = ids[0];
      const reqId = testId.match(TEST_TAG)[1];
      const prev = testIds.get(testId);
      if (prev) report.error('TEST_ID_DUPLICATE', feature.file, sc.line, testId, `${rel(root, prev.file)}:${prev.line}`);
      else testIds.set(testId, { file: feature.file, line: sc.line });

      const req = model.requirements.get(reqId);
      if (!req) {
        report.error('TEST_REQ_UNKNOWN', feature.file, sc.line, testId, reqId);
        continue;
      }
      if (req.specId !== feature.specId) report.error('TEST_WRONG_DIR', feature.file, sc.line, testId, req.specId, feature.specId);
      tested.add(reqId);
    }
  }

  const implemented = [...model.requirements.values()].filter((r) => r.status === 'implemented');
  for (const req of implemented) {
    if (!tested.has(req.id)) report.error('REQ_NO_TEST', req.file, req.line, req.id);
  }

  const sourceDirs = cfg.apps.flatMap((a) => a.source ?? []);
  const allDirs = [...sourceDirs, ...(cfg.trace.testDirs ?? [])];
  if (allDirs.length === 0) {
    if (implemented.length) report.warn('TRACE_SOURCE_UNSET', path.join(root, 'openspec', 'workflow.json'), 1);
    return;
  }
  const idTokens = /[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*-\d{2,}[a-z]?(?:-T\d{2,})?/g;
  const inCode = collectCodeIds(root, allDirs, cfg.trace.codeExtensions, idTokens);
  for (const req of implemented) {
    if (req.cls.ok && req.cls.kind === 'app' && !(req.cls.entry.source ?? []).length) continue;
    const referenced = inCode.has(req.id) || [...inCode].some((t) => t.startsWith(`${req.id}-T`));
    if (!referenced) report.warn('REQ_NO_CODE', req.file, req.line, req.id);
  }
  for (const [testId, at] of testIds) {
    const req = model.requirements.get(testId.match(TEST_TAG)[1]);
    if (req?.status === 'implemented' && !inCode.has(testId)) report.warn('TEST_NO_CODE', at.file, at.line, testId);
  }
}

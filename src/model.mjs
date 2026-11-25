/**
 * Reads the project once and builds the data every check works on.
 * Requirements come from openspec/specs and from the delta specs of active
 * changes, so a change can be checked before it is archived.
 */
import path from 'node:path';
import { classify, testsDir, STATUSES } from './config.mjs';
import { listSpecs, listChanges, listChangeSpecs, parseSpec } from './openspec-adapter.mjs';
import { parseFeature } from './gherkin.mjs';
import { walk, rel, readText } from './util.mjs';

const STATUS_LINE = /^\s*-\s*(?:상태|Status)\s*:\s*(\S+)/i;
const DECISION_LINE = /^\s*-\s*(?:결정|Decisions?)\s*:\s*(.*)$/i;
export const TEST_TAG = /^(.+)-T\d{2,}$/;

function toRequirement(raw, spec, origin) {
  const id = raw.name.split(/\s+/)[0];
  let status = null;
  const decisions = [];
  for (const line of raw.body) {
    const s = line.match(STATUS_LINE);
    if (s && status === null) status = s[1];
    const d = line.match(DECISION_LINE);
    if (d) decisions.push(...(d[1].match(/D-\d+/g) ?? []));
  }
  return { id, name: raw.name, line: raw.line, op: raw.op, status, decisions, specId: spec.id, file: spec.file, cls: spec.cls, origin };
}

export function buildModel(root, cfg) {
  const makeSpec = (s, origin) => {
    const spec = { ...s, cls: classify(s.id, cfg), origin };
    spec.requirements = parseSpec(readText(s.file)).requirements.map((r) => toRequirement(r, spec, origin));
    return spec;
  };

  const specs = listSpecs(root).map((s) => makeSpec(s, 'spec'));
  const deltas = [];
  for (const change of listChanges(root)) {
    for (const s of listChangeSpecs(root, change)) deltas.push({ ...makeSpec(s, 'change'), change });
  }

  // Effective requirements: main specs, overlaid by MODIFIED and extended by ADDED deltas.
  const requirements = new Map();
  const duplicates = [];
  const put = (req, allowReplace) => {
    const prev = requirements.get(req.id);
    if (prev && !allowReplace) duplicates.push({ req, prev });
    else requirements.set(req.id, req);
  };
  for (const spec of specs) for (const req of spec.requirements) put(req, false);
  for (const delta of deltas) {
    for (const req of delta.requirements) {
      if (req.op === 'REMOVED' || req.op === 'RENAMED') continue;
      put(req, req.op === 'MODIFIED');
    }
  }

  const base = testsDir(root);
  const features = walk(base, (_f, name) => name.endsWith('.feature')).map((file) => ({
    file,
    specId: rel(base, path.dirname(file)),
    scenarios: parseFeature(readText(file)).scenarios,
  }));

  const knownSpecIds = new Set([...specs, ...deltas].map((s) => s.id));
  return { root, cfg, specs, deltas, requirements, duplicates, features, knownSpecIds, statuses: STATUSES };
}

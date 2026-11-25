import fs from 'node:fs';
import path from 'node:path';
import { readText, UserError } from './util.mjs';
import { t } from './i18n.mjs';

export const CONFIG_REL = 'openspec/workflow.json';
export const LANGUAGES = ['ko', 'en'];
export const STATUSES = ['planned', 'implemented', 'withdrawn'];

export function defaultConfig(language = 'en', phases = []) {
  return {
    version: 1,
    language,
    phases,
    idKinds: ['FR', 'NFR'],
    apps: [],
    interfaces: [],
    limits: { maxFileLines: 300, maxScenarioSteps: 7 },
    trace: {
      testDirs: [],
      codeExtensions: ['.c', '.cc', '.cpp', '.h', '.hpp', '.cs', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.go', '.java', '.kt', '.rs'],
    },
    contracts: {
      baseRef: 'origin/main',
      tools: {
        openapiBreaking: ['oasdiff', 'breaking', '{base}', '{head}', '--fail-on', 'ERR'],
        asyncapiBreaking: {
          classify: 'asyncapi-diff',
          command: ['asyncapi', 'diff', '{base}', '{head}', '--type', 'all', '--format', 'json'],
          // Used when the `asyncapi` binary is not installed (`aiwf tools install`).
          fallback: ['npx', '-y', '@asyncapi/cli', 'diff', '{base}', '{head}', '--type', 'all', '--format', 'json'],
        },
      },
    },
  };
}

export function configPath(root) {
  return path.join(root, CONFIG_REL);
}

export function loadConfig(root) {
  const file = configPath(root);
  if (!fs.existsSync(file)) throw new UserError(t('CONFIG_NOT_FOUND', CONFIG_REL));
  let raw;
  try {
    raw = JSON.parse(readText(file));
  } catch (e) {
    throw new UserError(t('CONFIG_BAD_JSON', CONFIG_REL, e.message));
  }
  const base = defaultConfig();
  const cfg = {
    ...base,
    ...raw,
    limits: { ...base.limits, ...raw.limits },
    trace: { ...base.trace, ...raw.trace },
    contracts: { ...base.contracts, ...raw.contracts, tools: { ...base.contracts.tools, ...raw.contracts?.tools } },
  };
  if (!LANGUAGES.includes(cfg.language)) throw new UserError(t('CONFIG_BAD_LANGUAGE', CONFIG_REL, LANGUAGES.join(', ')));
  for (const key of ['phases', 'apps', 'interfaces', 'idKinds']) {
    if (!Array.isArray(cfg[key])) throw new UserError(t('CONFIG_NOT_ARRAY', CONFIG_REL, key));
  }
  return cfg;
}

export function saveConfig(root, cfg) {
  fs.writeFileSync(configPath(root), JSON.stringify(cfg, null, 2) + '\n', 'utf8');
}

/**
 * Maps a spec id (path under openspec/specs) to its owner entry.
 * With phases: <phase>/<app>/<capability>. Without: <app>/<capability>.
 * The app segment `interfaces` is reserved: <phase>/interfaces/<interface-id>.
 */
export function classify(id, cfg) {
  const parts = id.split('/');
  const hasPhases = cfg.phases.length > 0;
  const expected = hasPhases ? 3 : 2;
  if (parts.length !== expected) return { ok: false, reason: 'depth', expected };
  const phase = hasPhases ? parts[0] : null;
  const [appId, capability] = hasPhases ? parts.slice(1) : parts;
  if (hasPhases && !cfg.phases.includes(phase)) return { ok: false, reason: 'phase', phase };
  const samePhase = (entry) => !hasPhases || entry.phase === phase;
  if (appId === 'interfaces') {
    const iface = cfg.interfaces.find((i) => i.id === capability && samePhase(i));
    if (!iface) return { ok: false, reason: 'interface', name: capability };
    return { ok: true, kind: 'interface', phase, entry: iface, capability };
  }
  const app = cfg.apps.find((a) => a.id === appId && samePhase(a));
  if (!app) return { ok: false, reason: 'app', name: appId };
  return { ok: true, kind: 'app', phase, entry: app, capability };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `IF-02-equipment-link` -> `IF-02`. Ids without that shape are used whole. */
export function interfaceShortId(id) {
  return id.match(/^[A-Za-z]+-\d+/)?.[0] ?? id;
}

/** Pattern a requirement id must match inside the given owner entry. */
export function requirementIdPattern(cls, cfg) {
  if (cls.kind === 'interface') return new RegExp(`^${escapeRe(interfaceShortId(cls.entry.id))}-R\\d{2,}$`);
  return new RegExp(`^${escapeRe(cls.entry.prefix)}-(?:${cfg.idKinds.map(escapeRe).join('|')})-\\d{2,}[a-z]?$`);
}

export function specsDir(root) {
  return path.join(root, 'openspec', 'specs');
}
export function testsDir(root) {
  return path.join(root, 'openspec', 'tests');
}
export function contractsDir(root) {
  return path.join(root, 'openspec', 'contracts');
}
export function projectDir(root) {
  return path.join(root, 'openspec', 'project');
}

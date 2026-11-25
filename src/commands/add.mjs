import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, saveConfig, specsDir, contractsDir, projectDir, requirementIdPattern, interfaceShortId } from '../config.mjs';
import { buildModel } from '../model.mjs';
import { template } from './init.mjs';
import { rel, writeNew, render, UserError } from '../util.mjs';

const CONTRACT_KINDS = ['openapi', 'asyncapi'];

function resolvePhase(cfg, flags) {
  if (!cfg.phases.length) return null;
  const phase = typeof flags.phase === 'string' ? flags.phase : cfg.phases.length === 1 ? cfg.phases[0] : null;
  if (!phase || !cfg.phases.includes(phase)) throw new UserError(`--phase is required; one of ${cfg.phases.join(', ')}`);
  return phase;
}

const str = (v) => (typeof v === 'string' ? v : '');
const list = (v) => str(v).split(',').map((s) => s.trim()).filter(Boolean);

function addApp(root, cfg, [id], flags) {
  if (!id || !str(flags.prefix)) throw new UserError('Usage: aiwf add app <id> --prefix <PREFIX> [--phase <phase>] [--owner <name>] [--source <dir,dir>]');
  if (id === 'interfaces') throw new UserError('"interfaces" is a reserved folder name.');
  const phase = resolvePhase(cfg, flags);
  if (cfg.apps.some((a) => a.id === id && (a.phase ?? null) === phase)) throw new UserError(`App "${id}" already exists.`);
  if (cfg.apps.some((a) => a.prefix === flags.prefix)) throw new UserError(`Prefix "${flags.prefix}" is already used.`);
  const app = { id, prefix: flags.prefix, ...(phase ? { phase } : {}), owner: str(flags.owner), source: list(flags.source) };
  cfg.apps.push(app);
  saveConfig(root, cfg);
  const file = path.join(specsDir(root), phase ?? '', id, 'app.md');
  writeNew(file, render(template(cfg.language, 'app.md'), { app: id, prefix: app.prefix, owner: app.owner, phase: phase ?? '' }));
  console.log(`Added app ${id} (${app.prefix}). Fill in ${rel(root, file)}.`);
}

function addInterface(root, cfg, [id], flags) {
  const kinds = list(flags.kinds);
  if (!id || !kinds.length || kinds.some((k) => !CONTRACT_KINDS.includes(k))) {
    throw new UserError(`Usage: aiwf add interface <id> --kinds <${CONTRACT_KINDS.join('|')}[,..]> [--phase <phase>] [--owner <name>] [--consumers <a,b>]`);
  }
  const phase = resolvePhase(cfg, flags);
  if (cfg.interfaces.some((i) => i.id === id && (i.phase ?? null) === phase)) throw new UserError(`Interface "${id}" already exists.`);
  cfg.interfaces.push({ id, ...(phase ? { phase } : {}), owner: str(flags.owner), consumers: list(flags.consumers), kinds });
  saveConfig(root, cfg);
  const dir = path.join(contractsDir(root), phase ?? '', id);
  for (const kind of kinds) writeNew(path.join(dir, `${kind}.yaml`), render(template(cfg.language, `${kind}.yaml`), { id }));
  console.log(`Added interface ${id}. Contract files: ${rel(root, dir)}`);
}

function addDecision(root, cfg, words) {
  const title = words.join(' ').trim();
  if (!title) throw new UserError('Usage: aiwf add decision <title>');
  const dir = path.join(projectDir(root), 'decisions');
  fs.mkdirSync(dir, { recursive: true });
  const numbers = fs.readdirSync(dir).map((f) => Number(f.match(/^D-(\d+)/)?.[1])).filter(Number.isFinite);
  const id = `D-${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`;
  const slug = title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  const file = path.join(dir, `${id}-${slug}.md`);
  writeNew(file, render(template(cfg.language, 'decision.md'), { id, title, date: new Date().toISOString().slice(0, 10) }));
  console.log(`${id} -> ${rel(root, file)}`);
}

export function add(root, [kind, ...rest], flags) {
  const cfg = loadConfig(root);
  if (kind === 'app') addApp(root, cfg, rest, flags);
  else if (kind === 'interface') addInterface(root, cfg, rest, flags);
  else if (kind === 'decision') addDecision(root, cfg, rest);
  else throw new UserError('Usage: aiwf add <app|interface|decision> ...');
  return 0;
}

/** Prints the next free requirement id for an app or interface, counting active changes too. */
export function nextId(root, [id], flags) {
  const cfg = loadConfig(root);
  const phase = cfg.phases.length ? resolvePhase(cfg, flags) : null;
  const match = (e) => e.id === id && (e.phase ?? null) === phase;
  const app = cfg.apps.find(match);
  const iface = cfg.interfaces.find(match);
  if (!app && !iface) throw new UserError(`Unknown app or interface "${id ?? ''}".`);
  const kind = str(flags.kind) || cfg.idKinds[0];
  const stem = app ? `${app.prefix}-${kind}-` : `${interfaceShortId(iface.id)}-R`;
  const pattern = requirementIdPattern(app ? { kind: 'app', entry: app } : { kind: 'interface', entry: iface }, cfg);
  let max = 0;
  for (const reqId of buildModel(root, cfg).requirements.keys()) {
    if (reqId.startsWith(stem) && pattern.test(reqId)) max = Math.max(max, Number(reqId.slice(stem.length).match(/^\d+/)[0]));
  }
  console.log(`${stem}${String(max + 1).padStart(2, '0')}`);
  return 0;
}

import { SUPPORTED, openspecVersion, isSupported, listSpecs, parseSpec, cliSpecOutline } from '../openspec-adapter.mjs';
import { loadConfig } from '../config.mjs';
import { readText, findExecutable } from '../util.mjs';

const has = (bin) => findExecutable(bin) !== null;

/**
 * Verifies that the installed OpenSpec still matches what the adapter assumes:
 * version range, and that our reading of spec.md equals `openspec show --json`.
 * Returns { ok, lines } so `aiwf openspec upgrade` can reuse it.
 */
export function diagnose(root, { sample = 5 } = {}) {
  const lines = [];
  let ok = true;
  const fail = (msg) => {
    ok = false;
    lines.push(`FAIL  ${msg}`);
  };

  const version = openspecVersion(root);
  const range = `>=${SUPPORTED.min.join('.')} <${SUPPORTED.belowMajor}.0.0`;
  if (!version) fail('openspec CLI not found. Install with: npm install -g @fission-ai/openspec');
  else if (!isSupported(version)) fail(`openspec ${version.join('.')} is outside the tested range ${range}.`);
  else lines.push(`ok    openspec ${version.join('.')} (tested range ${range})`);

  if (version && root) {
    const specs = listSpecs(root).slice(0, sample);
    let drift = 0;
    for (const spec of specs) {
      const cli = cliSpecOutline(root, spec.id);
      const own = parseSpec(readText(spec.file)).requirements.map((r) => ({ name: r.name, scenarios: r.scenarios.map((s) => s.name) }));
      if (!cli) fail(`openspec could not read spec "${spec.id}" (run: openspec validate ${spec.id} --type spec).`);
      else if (JSON.stringify(cli) !== JSON.stringify(own)) {
        drift++;
        fail(`spec "${spec.id}" is read differently by openspec and aiwf; src/openspec-adapter.mjs needs an update.`);
      }
    }
    if (specs.length && !drift) lines.push(`ok    spec format matches openspec for ${specs.length} sampled spec(s)`);
    if (!specs.length) lines.push('note  no specs yet; format comparison skipped');
  }

  if (root) {
    try {
      const cfg = loadConfig(root);
      lines.push(`ok    workflow.json (language ${cfg.language}, ${cfg.apps.length} app(s), ${cfg.interfaces.length} interface(s))`);
      const kinds = new Set(cfg.interfaces.flatMap((i) => i.kinds ?? []));
      for (const kind of kinds) {
        const cmd = cfg.contracts.tools[`${kind}Breaking`];
        if (!cmd) lines.push(`note  no breaking-change tool configured for ${kind} (contracts.tools.${kind}Breaking)`);
        else lines.push(`${has(cmd[0]) ? 'ok   ' : 'note '} ${kind} breaking-change tool: ${cmd[0]}${has(cmd[0]) ? '' : ' (not installed)'}`);
      }
    } catch (e) {
      fail(e.message);
    }
  } else fail('No openspec/ folder found. Run `openspec init` first.');

  lines.push(`${has('git') ? 'ok   ' : 'note '} git${has('git') ? '' : ' not found; contract comparison is skipped'}`);
  return { ok, lines, version };
}

export function doctor(root) {
  const result = diagnose(root);
  console.log(result.lines.join('\n'));
  return result.ok ? 0 : 1;
}

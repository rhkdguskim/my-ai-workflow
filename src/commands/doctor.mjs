import { SUPPORTED, openspecVersion, isSupported, listSpecs, parseSpec, cliSpecOutline } from '../openspec-adapter.mjs';
import { loadConfig } from '../config.mjs';
import { readText, findExecutable } from '../util.mjs';
import { t } from '../i18n.mjs';

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
  if (!version) fail(t('OS_CLI_MISSING'));
  else if (!isSupported(version)) fail(t('DR_OUT_OF_RANGE', version.join('.'), range));
  else lines.push(`ok    ${t('DR_VERSION_OK', version.join('.'), range)}`);

  if (version && root) {
    const specs = listSpecs(root).slice(0, sample);
    let drift = 0;
    for (const spec of specs) {
      const cli = cliSpecOutline(root, spec.id);
      const own = parseSpec(readText(spec.file)).requirements.map((r) => ({ name: r.name, scenarios: r.scenarios.map((s) => s.name) }));
      if (!cli) fail(t('DR_UNREADABLE', spec.id));
      else if (JSON.stringify(cli) !== JSON.stringify(own)) {
        drift++;
        fail(t('DR_DRIFT', spec.id));
      }
    }
    if (specs.length && !drift) lines.push(`ok    ${t('DR_FORMAT_OK', specs.length)}`);
    if (!specs.length) lines.push(`note  ${t('DR_NO_SPECS')}`);
  }

  if (root) {
    try {
      const cfg = loadConfig(root);
      lines.push(`ok    ${t('DR_WORKFLOW', cfg.language, cfg.apps.length, cfg.interfaces.length)}`);
      const kinds = new Set(cfg.interfaces.flatMap((i) => i.kinds ?? []));
      for (const kind of kinds) {
        const tool = cfg.contracts.tools[`${kind}Breaking`];
        const cmd = Array.isArray(tool) ? tool : tool?.command;
        if (!cmd) lines.push(`note  ${t('DR_NO_TOOL', kind)}`);
        else lines.push(`${has(cmd[0]) ? 'ok   ' : 'note '} ${t('DR_TOOL', kind, cmd[0])}${has(cmd[0]) ? '' : t('DR_NOT_INSTALLED')}`);
      }
    } catch (e) {
      fail(e.message);
    }
  } else fail(t('NO_OPENSPEC'));

  lines.push(has('git') ? 'ok    git' : `note  ${t('DR_GIT_MISSING')}`);
  return { ok, lines, version };
}

export function doctor(root) {
  const result = diagnose(root);
  console.log(result.lines.join('\n'));
  return result.ok ? 0 : 1;
}

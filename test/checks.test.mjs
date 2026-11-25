import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultConfig, saveConfig } from '../src/config.mjs';
import { runChecks } from '../src/commands/check.mjs';
import { parseSpec } from '../src/openspec-adapter.mjs';
import { parseFeature } from '../src/gherkin.mjs';
import { mergeOpenspecConfig } from '../src/commands/init.mjs';
import { contractVersion } from '../src/checks/contracts.mjs';

const SPEC = (reqs) => `# checkout Specification\n\n## Purpose\nCheckout behavior.\n\n## Requirements\n${reqs}`;
const REQ = (id, status = 'implemented', extra = '') =>
  `### Requirement: ${id} Hold order\n${status ? `- Status: ${status}\n` : ''}${extra}\nThe system SHALL hold the order.\n\n#### Scenario: Declined\n- **WHEN** declined\n- **THEN** held\n\n`;
const FEATURE = (tag, steps = 3) =>
  `Feature: Payment failure\n\n  @${tag}\n  Scenario: Limit exceeded\n${Array.from({ length: steps }, (_, i) => `    ${i ? 'And' : 'Given'} step ${i}`).join('\n')}\n`;

function project(files, mutate = () => {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwf-test-'));
  const cfg = defaultConfig('en', ['phase1']);
  cfg.apps.push({ id: 'order-service', prefix: 'ORD', phase: 'phase1', owner: 'kim', source: [] });
  mutate(cfg);
  fs.mkdirSync(path.join(root, 'openspec'), { recursive: true });
  saveConfig(root, cfg);
  const all = { 'openspec/specs/phase1/order-service/app.md': '# order-service\n', ...files };
  for (const [name, content] of Object.entries(all)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
  }
  return root;
}

// The fixture has no source folders, so the TRACE_SOURCE_UNSET notice is expected everywhere.
const codes = (root, opts) =>
  runChecks(root, { only: ['structure', 'ids', 'trace', 'slop', 'approval'], ...opts })
    .findings.map((f) => f.code)
    .filter((c) => c !== 'TRACE_SOURCE_UNSET')
    .sort();
const S = 'openspec/specs/phase1/order-service/checkout/spec.md';
const T = 'openspec/tests/phase1/order-service/checkout/payment.feature';

test('a consistent project has no findings', () => {
  const root = project({ [S]: SPEC(REQ('ORD-FR-07')), [T]: FEATURE('ORD-FR-07-T01') });
  assert.deepEqual(codes(root), []);
});

test('id format, missing status and duplicates are errors', () => {
  const root = project({
    [S]: SPEC(REQ('Hold', 'planned') + REQ('ORD-FR-08', '') + REQ('ORD-FR-09', 'done') + REQ('ORD-FR-10', 'planned') + REQ('ORD-FR-10', 'planned')),
  });
  assert.deepEqual(codes(root), ['ID_DUPLICATE', 'ID_FORMAT', 'STATUS_INVALID', 'STATUS_MISSING']);
});

test('implemented requirement without a scenario is an error; planned is not', () => {
  const root = project({ [S]: SPEC(REQ('ORD-FR-07') + REQ('ORD-FR-08', 'planned')) });
  const report = runChecks(root, { only: ['trace'] });
  assert.deepEqual(report.errors.map((f) => f.code), ['REQ_NO_TEST']);
  assert.match(report.errors[0].message, /ORD-FR-07/);
});

test('test tags must exist, be unique, point to a requirement and sit in the right folder', () => {
  const root = project({
    [S]: SPEC(REQ('ORD-FR-07')),
    'openspec/specs/phase1/order-service/refund/spec.md': SPEC(REQ('ORD-FR-20', 'planned')),
    [T]: FEATURE('ORD-FR-07-T01') + FEATURE('ORD-FR-07-T01').replace('Feature: Payment failure\n', '') + '\n  Scenario: untagged\n    Given x\n',
    'openspec/tests/phase1/order-service/checkout/other.feature': FEATURE('ORD-FR-99-T01'),
    'openspec/tests/phase1/order-service/refund/refund.feature': FEATURE('ORD-FR-07-T02'),
    'openspec/tests/phase1/order-service/ghost/ghost.feature': FEATURE('ORD-FR-07-T03'),
  });
  assert.deepEqual(codes(root), ['TEST_ID_DUPLICATE', 'TEST_ID_MISSING', 'TEST_ORPHAN_DIR', 'TEST_REQ_UNKNOWN', 'TEST_WRONG_DIR', 'TEST_WRONG_DIR']);
});

test('spec path must match phase and registered app', () => {
  const root = project({
    'openspec/specs/phase9/order-service/checkout/spec.md': SPEC(REQ('ORD-FR-01', 'planned')),
    'openspec/specs/phase1/unknown/checkout/spec.md': SPEC(REQ('ORD-FR-02', 'planned')),
    'openspec/specs/phase1/flat/spec.md': SPEC(REQ('ORD-FR-03', 'planned')),
  });
  assert.deepEqual(codes(root, { only: ['structure'] }), ['SPEC_PATH_APP', 'SPEC_PATH_DEPTH', 'SPEC_PATH_PHASE']);
});

test('banned phrases, long files, long scenarios and missing decisions are errors', () => {
  const root = project(
    {
      [S]: SPEC(REQ('ORD-FR-07', 'implemented', '- Decisions: D-012\n') + 'It works properly.\n'),
      [T]: FEATURE('ORD-FR-07-T01', 9),
      'openspec/project/rules/banned-phrases.txt': '# list\nproperly\n',
      'openspec/project/rules/spec-writing.md': 'Do not write "properly".\n',
      'openspec/project/glossary/long.md': 'line\n'.repeat(25),
    },
    (cfg) => (cfg.limits.maxFileLines = 20),
  );
  assert.deepEqual(codes(root), ['BANNED_PHRASE', 'DECISION_MISSING', 'FILE_TOO_LONG', 'SCENARIO_TOO_LONG']);
});

test('requirements added by an active change count before archive', () => {
  const delta = `## ADDED Requirements\n${REQ('ORD-FR-08')}`;
  const root = project({
    [S]: SPEC(REQ('ORD-FR-07')),
    [T]: FEATURE('ORD-FR-07-T01') + FEATURE('ORD-FR-08-T01').replace('Feature: Payment failure\n', ''),
    'openspec/changes/add-hold/specs/phase1/order-service/checkout/spec.md': delta,
  });
  assert.deepEqual(codes(root), []);
});

test('a started or gated change needs approval from each owner', () => {
  const files = {
    [S]: SPEC(REQ('ORD-FR-07', 'planned')),
    'openspec/changes/add-hold/specs/phase1/order-service/checkout/spec.md': `## MODIFIED Requirements\n${REQ('ORD-FR-07', 'planned')}`,
    'openspec/changes/add-hold/tasks.md': '- [ ] 1.1 do it\n',
  };
  const root = project(files);
  assert.deepEqual(codes(root, { only: ['approval'] }), []);
  assert.deepEqual(codes(root, { only: ['approval'], gate: 'add-hold' }), ['APPROVAL_MISSING']);
  fs.writeFileSync(path.join(root, 'openspec/changes/add-hold/tasks.md'), '- [x] 1.1 do it\n');
  assert.deepEqual(codes(root, { only: ['approval'] }), ['APPROVAL_MISSING']);
  fs.writeFileSync(path.join(root, 'openspec/changes/add-hold/approval.json'), JSON.stringify({ approvals: [{ by: 'kim' }] }));
  assert.deepEqual(codes(root, { only: ['approval'], gate: 'add-hold' }), []);
});

test('code traceability is a warning', () => {
  const root = project(
    { [S]: SPEC(REQ('ORD-FR-07') + REQ('ORD-FR-08')), [T]: FEATURE('ORD-FR-07-T01') + FEATURE('ORD-FR-08-T01').replace('Feature: Payment failure\n', ''), 'src/order.ts': '// ORD-FR-07\n', 'src/order.test.ts': '// ORD-FR-07-T01\n' },
    (cfg) => (cfg.apps[0].source = ['src']),
  );
  const report = runChecks(root, { only: ['trace'] });
  assert.equal(report.errors.length, 0);
  assert.deepEqual(report.warnings.map((f) => `${f.code} ${f.message.match(/ORD-FR-\d+(-T\d+)?/)[0]}`).sort(), ['REQ_NO_CODE ORD-FR-08', 'TEST_NO_CODE ORD-FR-08-T01']);
});

test('interface specs use <IF-NN>-RNN ids', () => {
  const root = project(
    { 'openspec/specs/phase1/interfaces/IF-02-order-events/spec.md': SPEC(REQ('IF-02-R01', 'planned') + REQ('ORD-FR-30', 'planned')) },
    (cfg) => cfg.interfaces.push({ id: 'IF-02-order-events', phase: 'phase1', owner: 'kim', consumers: [], kinds: ['asyncapi'] }),
  );
  assert.deepEqual(codes(root, { only: ['ids'] }), ['ID_FORMAT']);
});

test('parseSpec ignores headings inside code fences and reads delta sections', () => {
  const { requirements } = parseSpec('## ADDED Requirements\n### Requirement: A-FR-01 x\n```\n### Requirement: fake\n```\n#### Scenario: s\n## REMOVED Requirements\n### Requirement: A-FR-02 y\n');
  assert.deepEqual(requirements.map((r) => [r.name, r.op, r.scenarios.length]), [['A-FR-01 x', 'ADDED', 1], ['A-FR-02 y', 'REMOVED', 0]]);
});

test('parseFeature reads Korean keywords, inherited tags and step counts', () => {
  const { scenarios } = parseFeature('# language: ko\n@smoke\n기능: 결제\n  배경:\n    조건 공통\n  @ORD-FR-07-T01\n  시나리오 개요: 거절\n    조건 주문 "<id>"\n    만일 거절한다\n    그러면 보류된다\n    예:\n      | id |\n      | A |\n');
  assert.equal(scenarios.length, 1);
  assert.deepEqual(scenarios[0].tags, ['smoke', 'ORD-FR-07-T01']);
  assert.equal(scenarios[0].steps, 3);
});

test('mergeOpenspecConfig inserts the block once and replaces it on re-run', () => {
  const rules = '# my-ai-workflow rules\nrules:\n  specs:\n    - a\n';
  const first = mergeOpenspecConfig('schema: spec-driven\n\ncontext: |\n  Language: ko\n', 'line one\n', rules).text;
  assert.match(first, /context: \|\n  # >>> my-ai-workflow[^\n]*\n  line one\n  # <<< my-ai-workflow\n  Language: ko/);
  assert.match(first, /\nrules:\n  specs:/);
  const second = mergeOpenspecConfig(first, 'line two\n', rules).text;
  assert.ok(second.includes('  line two') && !second.includes('line one'));
  assert.equal(second.match(/^rules:/gm).length, 1);
  assert.equal(second.match(/>>> my-ai-workflow/g).length, 1);
});

test('contractVersion reads info.version', () => {
  assert.equal(contractVersion('openapi: 3.1.0\ninfo:\n  title: x\n  version: 1.2.0\npaths: {}\n'), '1.2.0');
  assert.equal(contractVersion("asyncapi: 3.0.0\ninfo:\n  version: '2.0.0' # note\n"), '2.0.0');
  assert.equal(contractVersion('openapi: 3.1.0\npaths: {}\n'), null);
});

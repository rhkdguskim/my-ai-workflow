import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/aiwf.mjs', import.meta.url));
const tmp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

/** Runs the CLI with a clean language environment: no AIWF_LANG, an empty user setting, the given locale. */
function aiwf(args, { cwd, env = {} }) {
  const clean = { ...process.env, AIWF_HOME: env.AIWF_HOME ?? tmp('aiwf-home-'), LANG: '', LC_ALL: '', LC_MESSAGES: '' };
  delete clean.AIWF_LANG;
  const res = spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8', env: { ...clean, AIWF_NO_TOOLS: '1', ...env } });
  return `${res.stdout}${res.stderr}`;
}

const scratch = () => {
  const root = tmp('aiwf-i18n-');
  fs.mkdirSync(path.join(root, 'openspec'));
  return root;
};

test('init without --lang follows the locale, and later commands follow workflow.json', () => {
  const root = scratch();
  assert.match(aiwf(['init'], { cwd: root, env: { LANG: 'ko_KR.UTF-8' } }), /만들거나 고친 파일/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'openspec/workflow.json'), 'utf8')).language, 'ko');
  assert.match(aiwf(['check'], { cwd: root, env: { LANG: 'en_US.UTF-8' } }), /오류 \d+개, 경고 \d+개/);
});

test('--lang and AIWF_LANG override the project language for display', () => {
  const root = scratch();
  aiwf(['init', '--lang', 'ko'], { cwd: root });
  assert.match(aiwf(['check', '--lang', 'en'], { cwd: root }), /\d+ error\(s\), \d+ warning\(s\)/);
  assert.match(aiwf(['check'], { cwd: root, env: { AIWF_LANG: 'en' } }), /\d+ error\(s\), \d+ warning\(s\)/);
});

test('aiwf lang saves a user setting used outside projects and by init', () => {
  const home = tmp('aiwf-home-');
  const outside = tmp('aiwf-outside-');
  assert.match(aiwf(['lang', 'ko'], { cwd: outside, env: { AIWF_HOME: home, LANG: 'en_US.UTF-8' } }), /표시 언어 ko/);
  assert.match(aiwf(['lang'], { cwd: outside, env: { AIWF_HOME: home, LANG: 'en_US.UTF-8' } }), /표시 언어: ko/);
  assert.match(aiwf(['help'], { cwd: outside, env: { AIWF_HOME: home } }), /팀 스펙 작업 방식/);
  const root = scratch();
  aiwf(['init'], { cwd: root, env: { AIWF_HOME: home, LANG: 'en_US.UTF-8' } });
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'openspec/workflow.json'), 'utf8')).language, 'ko');
});

test('skills install --lang stores the display language', () => {
  const home = tmp('aiwf-home-');
  const out = aiwf(['skills', 'install', '--dir', tmp('aiwf-skills-'), '--lang', 'ko'], { cwd: tmp('aiwf-outside-'), env: { AIWF_HOME: home } });
  assert.match(out, /설치함/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(home, 'config.json'), 'utf8')).language, 'ko');
});

test('errors are shown in the display language', () => {
  // A parent of the temp folder may hold an openspec/ folder, so either "no openspec/" or "no workflow.json" can come back.
  assert.match(aiwf(['add', 'app'], { cwd: tmp('aiwf-outside-'), env: { AIWF_LANG: 'ko' } }), /없습니다|사용법/);
  assert.match(aiwf(['nope'], { cwd: tmp('aiwf-outside-'), env: { AIWF_LANG: 'en' } }), /Unknown command "nope"/);
});

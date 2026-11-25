/**
 * Display language of the CLI. Resolved once per run, in this order:
 *   --lang flag > AIWF_LANG > openspec/workflow.json language > user setting
 *   (~/.aiwf/config.json, set by `aiwf lang <ko|en>`) > system locale > en.
 * Finding messages use the same language. Templates follow workflow.json only.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const LANGUAGES = ['ko', 'en'];

let current = null;

const supported = (v) => {
  const code = String(v ?? '').toLowerCase().slice(0, 2);
  return LANGUAGES.includes(code) ? code : null;
};

export const userConfigPath = () => path.join(process.env.AIWF_HOME || path.join(os.homedir(), '.aiwf'), 'config.json');

export function readUserLanguage() {
  try {
    return supported(JSON.parse(fs.readFileSync(userConfigPath(), 'utf8')).language);
  } catch {
    return null;
  }
}

export function saveUserLanguage(language) {
  const file = userConfigPath();
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {}
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ ...data, language }, null, 2) + '\n', 'utf8');
}

function projectLanguage(root) {
  if (!root) return null;
  try {
    return supported(JSON.parse(fs.readFileSync(path.join(root, 'openspec', 'workflow.json'), 'utf8')).language);
  } catch {
    return null;
  }
}

export function systemLanguage() {
  for (const v of [process.env.LC_ALL, process.env.LC_MESSAGES, process.env.LANG]) {
    if (v && v !== 'C' && v !== 'POSIX') return supported(v);
  }
  return supported(Intl.DateTimeFormat().resolvedOptions().locale);
}

/** Returns { language, source }. */
export function resolveLanguage({ flag = null, root = null } = {}) {
  const candidates = [
    ['--lang', supported(flag)],
    ['AIWF_LANG', supported(process.env.AIWF_LANG)],
    ['workflow.json', projectLanguage(root)],
    [userConfigPath(), readUserLanguage()],
    ['system locale', systemLanguage()],
  ];
  const hit = candidates.find(([, v]) => v);
  return hit ? { language: hit[1], source: hit[0] } : { language: 'en', source: 'default' };
}

export function setLanguage(language) {
  current = supported(language) ?? 'en';
}

/** The language set for this run, or null when none was set (library use, tests). */
export const currentLanguage = () => current;

const lang = () => current ?? resolveLanguage().language;

const STRINGS = {
  NO_OPENSPEC: { en: 'No openspec/ folder found. Run `openspec init` in the project root first.', ko: 'openspec/ 폴더가 없습니다. 프로젝트 루트에서 `openspec init`을 먼저 실행하세요.' },
  UNKNOWN_COMMAND: { en: 'Unknown command "{0}".', ko: '알 수 없는 명령 "{0}"입니다.' },
  CONFIG_NOT_FOUND: { en: '{0} not found. Run `aiwf init` first.', ko: '{0}이 없습니다. `aiwf init`을 먼저 실행하세요.' },
  CONFIG_BAD_JSON: { en: '{0} is not valid JSON: {1}', ko: '{0}이 올바른 JSON이 아닙니다: {1}' },
  CONFIG_BAD_LANGUAGE: { en: '{0}: language must be one of {1}', ko: '{0}: language는 {1} 중 하나여야 합니다' },
  CONFIG_NOT_ARRAY: { en: '{0}: {1} must be an array', ko: '{0}: {1}는 배열이어야 합니다' },
  LANG_INVALID: { en: '--lang must be one of {0}', ko: '--lang은 {0} 중 하나여야 합니다' },
  USAGE: { en: 'Usage: {0}', ko: '사용법: {0}' },
  PHASE_REQUIRED: { en: '--phase is required; one of {0}', ko: '--phase가 필요합니다. {0} 중 하나입니다' },
  RESERVED_NAME: { en: '"interfaces" is a reserved folder name.', ko: '"interfaces"는 예약된 폴더 이름입니다.' },
  APP_EXISTS: { en: 'App "{0}" already exists.', ko: '앱 "{0}"가 이미 있습니다.' },
  PREFIX_USED: { en: 'Prefix "{0}" is already used.', ko: '접두어 "{0}"는 이미 쓰고 있습니다.' },
  APP_ADDED: { en: 'Added app {0} ({1}). Fill in {2}.', ko: '앱 {0}({1})를 추가했습니다. {2}를 채우세요.' },
  INTERFACE_EXISTS: { en: 'Interface "{0}" already exists.', ko: '인터페이스 "{0}"가 이미 있습니다.' },
  INTERFACE_ADDED: { en: 'Added interface {0}. Contract files: {1}', ko: '인터페이스 {0}를 추가했습니다. 계약 파일: {1}' },
  UNKNOWN_OWNER_ENTRY: { en: 'Unknown app or interface "{0}".', ko: '앱 또는 인터페이스 "{0}"가 없습니다.' },
  CHANGE_MISSING: { en: 'Change "{0}" does not exist.', ko: '변경 "{0}"가 없습니다.' },
  APPROVED: { en: 'Recorded approval of "{0}" by {1}.', ko: '"{0}"에 대한 {1}의 승인을 기록했습니다.' },
  INIT_CREATED: { en: 'Created or updated:', ko: '만들거나 고친 파일:' },
  INIT_NOTHING: { en: 'Nothing to do; everything already exists.', ko: '할 일이 없습니다. 모두 이미 있습니다.' },
  INIT_MANUAL: { en: 'openspec/config.yaml already has its own {0} section in a form aiwf does not edit.', ko: 'openspec/config.yaml에 aiwf가 고치지 않는 형태의 {0} 절이 이미 있습니다.' },
  INIT_MERGE_FROM: { en: 'Merge by hand from: {0}', ko: '다음 파일을 보고 직접 합치세요: {0}' },
  INIT_NEXT: { en: 'Next: edit {0} or run `aiwf add app <id> --prefix <PREFIX>`.', ko: '다음: {0}을 고치거나 `aiwf add app <id> --prefix <PREFIX>`를 실행하세요.' },
  SKILL_INSTALLED: { en: 'installed {0}', ko: '설치함 {0}' },
  LANG_SHOW: { en: 'Display language: {0} (from {1})', ko: '표시 언어: {0} ({1}에서 정함)' },
  LANG_SAVED: { en: 'Saved display language {0} to {1}. A project workflow.json language or AIWF_LANG takes precedence.', ko: '표시 언어 {0}을 {1}에 저장했습니다. 프로젝트 workflow.json의 language나 AIWF_LANG이 있으면 그쪽이 먼저입니다.' },
  OS_INSTALLED: { en: 'installed', ko: '설치됨' },
  OS_LATEST: { en: 'latest', ko: '최신' },
  OS_TESTED: { en: 'tested', ko: '시험함' },
  OS_NOT_INSTALLED: { en: 'not installed', ko: '설치 안 됨' },
  OS_UNKNOWN_LATEST: { en: 'unknown (npm registry not reachable)', ko: '알 수 없음 (npm 레지스트리에 닿지 않음)' },
  OS_NO_TARGET: { en: 'Cannot determine the target version. Pass --to <version>.', ko: '대상 버전을 정할 수 없습니다. --to <버전>을 주세요.' },
  OS_MAJOR: { en: 'openspec {0} is a new major version that aiwf has not been tested with. Re-run with --force to try it.', ko: 'openspec {0}는 aiwf가 시험하지 않은 새 주 버전입니다. 시도하려면 --force를 붙여 다시 실행하세요.' },
  OS_ALREADY: { en: 'openspec {0} is already installed.', ko: 'openspec {0}가 이미 설치되어 있습니다.' },
  OS_INSTALLING: { en: 'Installing {0} (was {1})...', ko: '{0} 설치 중 (이전: {1})...' },
  OS_NPM_FAILED: { en: 'npm install failed:\n{0}', ko: 'npm install 실패:\n{0}' },
  OS_UPDATE_DONE: { en: 'openspec update: done', ko: 'openspec update: 완료' },
  OS_UPDATE_FAILED: { en: 'openspec update failed:\n{0}', ko: 'openspec update 실패:\n{0}' },
  OS_ROLLBACK: { en: 'To roll back: {0}', ko: '되돌리려면: {0}' },
  OS_CLI_MISSING: { en: 'openspec CLI not found. Install with: npm install -g @fission-ai/openspec', ko: 'openspec CLI가 없습니다. 설치: npm install -g @fission-ai/openspec' },
  DR_OUT_OF_RANGE: { en: 'openspec {0} is outside the tested range {1}.', ko: 'openspec {0}는 시험한 범위 {1} 밖입니다.' },
  DR_VERSION_OK: { en: 'openspec {0} (tested range {1})', ko: 'openspec {0} (시험한 범위 {1})' },
  DR_UNREADABLE: { en: 'openspec could not read spec "{0}" (run: openspec validate {0} --type spec).', ko: 'openspec이 스펙 "{0}"를 읽지 못했습니다 (실행: openspec validate {0} --type spec).' },
  DR_DRIFT: { en: 'spec "{0}" is read differently by openspec and aiwf; src/openspec-adapter.mjs needs an update.', ko: '스펙 "{0}"를 openspec과 aiwf가 다르게 읽습니다. src/openspec-adapter.mjs를 고쳐야 합니다.' },
  DR_FORMAT_OK: { en: 'spec format matches openspec for {0} sampled spec(s)', ko: '표본 스펙 {0}개의 형식이 openspec과 같습니다' },
  DR_NO_SPECS: { en: 'no specs yet; format comparison skipped', ko: '아직 스펙이 없어 형식 비교를 건너뜁니다' },
  DR_WORKFLOW: { en: 'workflow.json (language {0}, {1} app(s), {2} interface(s))', ko: 'workflow.json (언어 {0}, 앱 {1}개, 인터페이스 {2}개)' },
  DR_NO_TOOL: { en: 'no breaking-change tool configured for {0} (contracts.tools.{0}Breaking)', ko: '{0} 호환 검사 도구가 설정되지 않았습니다 (contracts.tools.{0}Breaking)' },
  DR_TOOL: { en: '{0} breaking-change tool: {1}', ko: '{0} 호환 검사 도구: {1}' },
  DR_NOT_INSTALLED: { en: ' (not installed)', ko: ' (설치 안 됨)' },
  TOOL_PRESENT: { en: 'ok    {0} is installed', ko: 'ok    {0} 설치됨' },
  TOOL_ABSENT: { en: 'note  {0} is not installed (aiwf tools install, or npm install -g {1})', ko: 'note  {0} 설치 안 됨 (aiwf tools install 또는 npm install -g {1})' },
  TOOL_INSTALLING: { en: 'Installing {0} globally with npm...', ko: 'npm으로 {0}를 전역 설치하는 중...' },
  TOOL_INSTALLED: { en: 'ok    {0} installed', ko: 'ok    {0} 설치 완료' },
  TOOL_INSTALL_FAILED: { en: 'FAIL  could not install {0}. Run: npm install -g {0}', ko: 'FAIL  {0} 설치에 실패했습니다. 직접 실행: npm install -g {0}' },
  DR_GIT_MISSING: { en: 'git not found; contract comparison is skipped', ko: 'git이 없어 계약 비교를 건너뜁니다' },
  SUMMARY: { en: '{0} error(s), {1} warning(s)', ko: '오류 {0}개, 경고 {1}개' },
};

export function t(key, ...args) {
  const entry = STRINGS[key];
  const template = entry ? entry[lang()] ?? entry.en : key;
  return template.replace(/\{(\d+)\}/g, (_m, i) => String(args[Number(i)] ?? ''));
}

export const HELP = {
  en: `aiwf - team spec workflow on top of OpenSpec

  aiwf init [--lang ko|en] [--phases phase1,phase2]   set up openspec/workflow.json, rules and folders
  aiwf add app <id> --prefix <PREFIX> [--phase p] [--owner name] [--source dir,dir]
  aiwf add interface <id> --kinds openapi,asyncapi [--phase p] [--owner name] [--consumers a,b]
  aiwf add decision <title>
  aiwf next-id <app-or-interface id> [--kind FR] [--phase p]
  aiwf check [--only structure,ids,trace,slop,approval,contracts,tasks] [--gate <change>] [--json]
  aiwf approve <change> --by <owner name>
  aiwf doctor                                         verify OpenSpec compatibility
  aiwf openspec status                                installed / latest / tested OpenSpec versions
  aiwf openspec upgrade [--to <version>] [--force]    upgrade OpenSpec, refresh, verify
  aiwf openspec <any openspec arguments>              pass through to the OpenSpec CLI
  aiwf tools status|install                           external check tools (AsyncAPI CLI); init installs them unless --no-tools
  aiwf skills install [--dir <folder>] [--lang ko|en] copy the skills for agents without plugin support
  aiwf lang [ko|en]                                   show or save the display language

  Every command accepts --lang ko|en. AIWF_LANG sets it for a whole session.
`,
  ko: `aiwf - OpenSpec 위에 얹는 팀 스펙 작업 방식

  aiwf init [--lang ko|en] [--phases phase1,phase2]   openspec/workflow.json, 규칙, 폴더 만들기
  aiwf add app <id> --prefix <접두어> [--phase p] [--owner 이름] [--source 폴더,폴더]
  aiwf add interface <id> --kinds openapi,asyncapi [--phase p] [--owner 이름] [--consumers a,b]
  aiwf add decision <제목>
  aiwf next-id <앱 또는 인터페이스 id> [--kind FR] [--phase p]
  aiwf check [--only structure,ids,trace,slop,approval,contracts,tasks] [--gate <change>] [--json]
  aiwf approve <change> --by <담당자 이름>
  aiwf doctor                                         OpenSpec 호환 확인
  aiwf openspec status                                설치 · 최신 · 시험한 OpenSpec 버전
  aiwf openspec upgrade [--to <버전>] [--force]       OpenSpec 업그레이드, 갱신, 확인
  aiwf openspec <openspec 인자>                       OpenSpec CLI로 그대로 전달
  aiwf tools status|install                           외부 검사 도구(AsyncAPI CLI). init이 설치하며 --no-tools로 건너뜀
  aiwf skills install [--dir <폴더>] [--lang ko|en]   플러그인을 지원하지 않는 에이전트용 스킬 복사
  aiwf lang [ko|en]                                   표시 언어 보기 또는 저장

  모든 명령은 --lang ko|en을 받습니다. AIWF_LANG으로 세션 전체 언어를 정할 수 있습니다.
`,
};

export const help = () => HELP[lang()] ?? HELP.en;

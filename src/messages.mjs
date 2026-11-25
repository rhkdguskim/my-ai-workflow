/** Finding messages. `{0}`, `{1}`… are replaced by the arguments of the finding. */
const MESSAGES = {
  SPEC_PATH_DEPTH: {
    en: 'Spec path must have {0} segments ({1}).',
    ko: '스펙 경로는 {0}단계여야 합니다 ({1}).',
  },
  SPEC_PATH_PHASE: { en: 'Phase "{0}" is not listed in workflow.json.', ko: 'Phase "{0}"가 workflow.json에 없습니다.' },
  SPEC_PATH_APP: { en: 'App "{0}" is not listed in workflow.json for this phase.', ko: '앱 "{0}"가 이 Phase의 workflow.json 목록에 없습니다.' },
  SPEC_PATH_INTERFACE: { en: 'Interface "{0}" is not listed in workflow.json for this phase.', ko: '인터페이스 "{0}"가 이 Phase의 workflow.json 목록에 없습니다.' },
  APP_DOC_MISSING: { en: 'App "{0}" has no app.md.', ko: '앱 "{0}"에 app.md가 없습니다.' },
  TEST_ORPHAN_DIR: { en: 'Test folder has no matching spec "{0}".', ko: '테스트 폴더에 대응하는 스펙 "{0}"가 없습니다.' },
  DECISION_MISSING: { en: 'Decision {0} has no file in openspec/project/decisions.', ko: '결정 {0}의 파일이 openspec/project/decisions에 없습니다.' },
  ID_FORMAT: { en: 'Requirement title must start with an id matching {1}; found "{0}".', ko: '요구사항 제목은 {1} 형식의 ID로 시작해야 합니다. 현재 "{0}".' },
  ID_DUPLICATE: { en: 'Requirement id {0} is already used in {1}.', ko: '요구사항 ID {0}는 {1}에서 이미 쓰고 있습니다.' },
  STATUS_MISSING: { en: 'Requirement {0} has no status line ("- Status: planned|implemented|withdrawn").', ko: '요구사항 {0}에 상태 줄이 없습니다 ("- 상태: planned|implemented|withdrawn").' },
  STATUS_INVALID: { en: 'Requirement {0} has unknown status "{1}".', ko: '요구사항 {0}의 상태 "{1}"는 허용되지 않습니다.' },
  TEST_ID_MISSING: { en: 'Scenario "{0}" has no test id tag (@<requirement id>-Tnn).', ko: '시나리오 "{0}"에 테스트 ID 태그(@<요구사항 ID>-Tnn)가 없습니다.' },
  TEST_ID_MULTIPLE: { en: 'Scenario "{0}" has more than one test id tag: {1}.', ko: '시나리오 "{0}"에 테스트 ID 태그가 둘 이상입니다: {1}.' },
  TEST_ID_DUPLICATE: { en: 'Test id {0} is already used in {1}.', ko: '테스트 ID {0}는 {1}에서 이미 쓰고 있습니다.' },
  TEST_REQ_UNKNOWN: { en: 'Test id {0} points to requirement {1}, which does not exist.', ko: '테스트 ID {0}가 가리키는 요구사항 {1}가 없습니다.' },
  TEST_WRONG_DIR: { en: 'Test {0} belongs to spec "{1}" but the file is under "{2}".', ko: '테스트 {0}는 스펙 "{1}" 소속인데 파일은 "{2}" 아래에 있습니다.' },
  REQ_NO_TEST: { en: 'Implemented requirement {0} has no test scenario.', ko: '구현된 요구사항 {0}에 테스트 시나리오가 없습니다.' },
  REQ_NO_CODE: { en: 'Implemented requirement {0} is not referenced in source code.', ko: '구현된 요구사항 {0}를 참조하는 소스 코드가 없습니다.' },
  TEST_NO_CODE: { en: 'Test {0} is not referenced by any automated test.', ko: '테스트 {0}를 참조하는 자동 테스트가 없습니다.' },
  TRACE_SOURCE_UNSET: { en: 'No source paths configured (apps[].source); code traceability was not checked.', ko: '소스 경로(apps[].source)가 설정되지 않아 코드 추적성은 검사하지 않았습니다.' },
  FILE_TOO_LONG: { en: 'File has {0} lines; the limit is {1}.', ko: '파일이 {0}줄입니다. 상한은 {1}줄입니다.' },
  BANNED_PHRASE: { en: 'Banned phrase "{0}".', ko: '금지 표현 "{0}".' },
  SCENARIO_TOO_LONG: { en: 'Scenario "{0}" has {1} steps; the limit is {2}.', ko: '시나리오 "{0}"가 {1}스텝입니다. 상한은 {2}스텝입니다.' },
  APPROVAL_MISSING: { en: 'Change "{0}" lacks approval from: {1}.', ko: '변경 "{0}"에 다음 담당자의 승인이 없습니다: {1}.' },
  OWNER_UNSET: { en: 'Change "{0}" touches "{1}", which has no owner in workflow.json.', ko: '변경 "{0}"가 건드리는 "{1}"에 workflow.json 담당자가 없습니다.' },
  CHANGE_UNKNOWN: { en: 'Change "{0}" does not exist.', ko: '변경 "{0}"가 없습니다.' },
  CONTRACT_DIR_MISSING: { en: 'Interface "{0}" has no contract folder.', ko: '인터페이스 "{0}"의 계약 폴더가 없습니다.' },
  CONTRACT_FILE_MISSING: { en: 'Interface "{0}" declares {1} but {1}.yaml is missing.', ko: '인터페이스 "{0}"는 {1}를 선언했지만 {1}.yaml이 없습니다.' },
  CONTRACT_VERSION_MISSING: { en: 'Contract has no info.version.', ko: '계약에 info.version이 없습니다.' },
  CONTRACT_VERSION_NOT_BUMPED: { en: 'Contract files changed since {0} but info.version is still {1}.', ko: '{0} 이후 계약 파일이 바뀌었는데 info.version이 {1} 그대로입니다.' },
  CONTRACT_BREAKING: { en: 'Breaking change since {0} without a major version bump ({1} -> {2}). {3}', ko: '{0} 이후 호환이 깨지는 변경인데 주 버전이 오르지 않았습니다 ({1} -> {2}). {3}' },
  CONTRACT_TOOL_MISSING: { en: 'Breaking-change tool for {0} is not configured or not installed; compatibility was not checked.', ko: '{0} 호환 검사 도구가 설정되지 않았거나 설치되지 않아 호환성은 검사하지 않았습니다.' },
  CONTRACT_BASE_UNRESOLVED: { en: 'Git ref "{0}" cannot be resolved; contract changes were not compared.', ko: 'Git 기준 "{0}"를 찾을 수 없어 계약 변경을 비교하지 않았습니다.' },
};

export function format(code, args, language) {
  const entry = MESSAGES[code];
  const template = entry ? entry[language] ?? entry.en : code;
  return template.replace(/\{(\d+)\}/g, (_m, i) => String(args[Number(i)] ?? ''));
}

export const codes = () => Object.keys(MESSAGES);

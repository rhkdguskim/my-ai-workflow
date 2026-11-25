# 스펙 작성 규칙

`aiwf check`가 이 규칙을 검사한다. 오류는 병합을 막고 경고는 보고만 한다.

## 어디에 무엇을 쓰는가

| 내용 | 형식 | 위치 |
|---|---|---|
| 요구사항 | OpenSpec `spec.md` | `openspec/specs/<phase>/<app>/<capability>/spec.md` |
| 인터페이스 동작 규칙 | OpenSpec `spec.md` | `openspec/specs/<phase>/interfaces/<interface>/spec.md` |
| 테스트 시나리오 | Gherkin `.feature` | `openspec/tests/<스펙과 같은 경로>/` |
| 기계 계약 | OpenAPI · AsyncAPI | `openspec/contracts/<phase>/<interface>/` |
| 앱의 책임과 경계 | Markdown | `openspec/specs/<phase>/<app>/app.md` |
| 시간 · 한계 값 | YAML | `openspec/specs/<phase>/constants.yaml` |
| 결정 기록 | Markdown | `openspec/project/decisions/D-0xx-<제목>.md` |
| 용어 | Markdown | `openspec/project/glossary/` |

phase가 없는 프로젝트는 경로에서 `<phase>/`를 뺀다. 사실 하나는 한 곳에만 쓰고 다른 곳은 ID로 가리킨다.

## 요구사항

```markdown
### Requirement: ORD-FR-07 결제 실패 시 주문 보류
- 상태: implemented
- 결정: D-012

결제 승인이 거절되면 시스템은 주문을 `on-hold` 상태로 바꿔야 한다(SHALL).

#### Scenario: 승인 거절
- **WHEN** 결제 게이트웨이가 거절 응답을 보낸다
- **THEN** 주문 상태가 `on-hold`가 된다
```

- 제목은 ID로 시작한다. 앱은 `<접두어>-FR-NN` · `<접두어>-NFR-NN`, 인터페이스는 `<IF-NN>-RNN`이다.
- 새 ID는 `aiwf next-id <app>`로 받는다. 폐기한 번호도 다시 쓰지 않는다.
- 상태는 `planned`(계획) · `implemented`(구현됨) · `withdrawn`(철회) 중 하나다.
- 요구사항 하나는 관찰할 수 있는 동작 하나다. "그리고"로 두 동작을 잇지 않는다.
- Scenario는 판정 조건 한두 개만 둔다. 값의 조합과 경계 사례는 `.feature`에 쓴다.
- 요구사항을 다른 기능 폴더로 옮겨도 ID는 그대로 둔다.

## 테스트 시나리오

```gherkin
# language: ko
기능: 결제 실패 처리

  @ORD-FR-07-T01
  시나리오: 한도 초과로 거절되면 주문이 보류된다
    조건 결제 대기 중인 주문 "A-100"이 있다
    만일 결제 게이트웨이가 "limit_exceeded"로 거절한다
    그러면 주문 "A-100"의 상태는 "on-hold"이다
```

- 시나리오마다 `@<요구사항 ID>-Tnn` 태그를 하나 단다. 이 태그가 테스트 ID다.
- `.feature`는 그 요구사항이 속한 스펙과 같은 경로에 둔다.
- 상태가 `implemented`인 요구사항에는 시나리오가 하나 이상 있어야 한다.
- 스텝에는 구체적인 값을 쓴다. 시나리오 하나는 7스텝 이하다.
- 자동 테스트는 테스트 ID를 이름 · 속성 · 주석 중 하나에 적는다.

## 계약

- 인터페이스가 바뀌면 코드보다 계약 파일을 먼저 고친다.
- 계약 폴더의 파일이 바뀌면 `info.version`을 올린다. 호환이 깨지면 주 버전을 올린다.
- 필드 · 타입 · 범위는 계약 파일에만 쓴다. `spec.md`에 필드 표를 복제하지 않는다.
- 호환이 깨지는 변경은 `workflow.json`의 `consumers` 담당자와 합의한 뒤 진행한다.

## 코드와의 연결

- 코드 주석에는 ID만 적는다 (`// ORD-FR-07`). 문서 경로나 절 번호는 적지 않는다.
- 문서에는 소스 파일 경로를 적지 않는다. 앱의 소스 폴더는 `workflow.json`의 `source`에만 둔다.

## 승인

- 담당자(`workflow.json`의 `owner`)가 proposal과 스펙 변경을 승인해야 구현을 시작한다.
- 승인은 사람이 `aiwf approve <change> --by <이름>`으로 기록한다. 에이전트는 이 명령을 스스로 실행하지 않는다.
- 에이전트는 구현을 시작하기 전에 `aiwf check --gate <change>`를 실행하고, 실패하면 멈추고 알린다.

## 쓰지 않는 것

- 확인하지 못한 내용. 확인이 필요하면 `미확인:`으로 시작하는 줄을 남기고, 추측으로 채우지 않는다.
- 판정할 수 없는 표현. 목록은 `banned-phrases.txt`에 있다. "빠르게" 대신 "2초 안에"라고 쓴다.
- 서두, 요약 절, 같은 내용의 표와 산문 병기.
- 변경 이력. 취소선, 날짜 메모, "이전에는"은 본문에 쓰지 않는다. 이력은 Git과 `changes/archive`에 있다.
- 300줄을 넘는 파일. 넘으면 기능을 나눈다.

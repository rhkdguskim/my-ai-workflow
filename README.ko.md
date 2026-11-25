# my-ai-workflow

[OpenSpec](https://github.com/Fission-AI/OpenSpec) 위에 얹는 팀 스펙 작업 방식이다. 요구사항과 변경 절차는 OpenSpec이 맡고, 이 패키지는 고정된 폴더 구조, 요구사항 ID, Gherkin 테스트 시나리오, OpenAPI · AsyncAPI 계약, 그리고 이들이 어긋나지 않게 하는 검사를 더한다.

English: [README.md](README.md)

## OpenSpec에 더하는 것

| 영역 | OpenSpec | my-ai-workflow |
|---|---|---|
| 요구사항 | `openspec/specs/<capability>/spec.md` | 같은 파일을 `<phase>/<app>/<capability>`로 배치하고 요구사항마다 ID와 상태를 붙인다 |
| 변경 절차 | propose, apply, archive | 그대로 쓴다. apply 전에 담당자 승인 관문을 더한다 |
| 테스트 시나리오 | 없음 | `openspec/tests/`의 Gherkin 파일. 태그로 요구사항과 잇는다 |
| 인터페이스 계약 | 없음 | `openspec/contracts/`의 OpenAPI · AsyncAPI 파일과 버전 규칙 |
| 검사 | `openspec validate` | `aiwf check`: 구조, ID, 추적성, 표현, 승인, 계약 |

OpenSpec을 복제하거나 고쳐 쓰지 않는다. OpenSpec의 스킬 · 템플릿 · CLI를 배포된 그대로 쓰고, OpenSpec 명령은 모두 그대로 동작한다. 프로젝트 규칙은 OpenSpec이 제공하는 확장 지점인 `openspec/config.yaml`로 전달한다.

## 구조

```
openspec/
├─ config.yaml                 OpenSpec 설정. aiwf는 표시된 블록 하나만 관리한다
├─ workflow.json               언어, phase, 앱, 인터페이스, 담당자, 상한
├─ project/
│  ├─ rules/                   spec-writing.md, banned-phrases.txt
│  ├─ glossary/
│  └─ decisions/               D-0xx-<제목>.md
├─ specs/<phase>/
│  ├─ README.md  constants.yaml
│  ├─ <app>/app.md
│  ├─ <app>/<capability>/spec.md
│  └─ interfaces/<interface>/spec.md
├─ tests/<phase>/<app>/<capability>/*.feature
├─ contracts/<phase>/<interface>/{openapi,asyncapi}.yaml
└─ changes/                    OpenSpec 변경
```

phase가 없는 프로젝트는 `<phase>` 단계를 뺀다.

## 설치

Node.js 20 이상과 OpenSpec CLI(`npm install -g @fission-ai/openspec`)가 필요하다. OpenSpec은 이 패키지의 npm 의존성으로도 선언되어 있어, PATH에 `openspec`이 없으면 `npx` 실행은 그 사본을 쓴다. OpenSpec의 스킬은 PATH의 `openspec`을 부르므로 에이전트로 쓸 때는 전역 설치가 필요하다.

Claude Code:

```
/plugin marketplace add rhkdguskim/my-ai-workflow
/plugin install my-ai-workflow@my-ai-workflow
```

Codex 등 `~/.agents/skills`를 읽는 에이전트:

```
npx -y github:rhkdguskim/my-ai-workflow skills install
```

CLI만 쓸 때 (예: CI):

```
npx -y github:rhkdguskim/my-ai-workflow check
```

## 시작

```
openspec init
aiwf init --lang ko --phases phase1,phase2
aiwf add app order-service --prefix ORD --phase phase1 --owner kim --source src/order
aiwf add interface IF-01-order-events --kinds asyncapi --phase phase1 --owner kim --consumers billing
aiwf check
```

요구사항은 OpenSpec 변경을 거쳐 `openspec/specs`에 들어간다. 변경 안의 요구사항은 이렇게 쓴다.

```markdown
### Requirement: ORD-FR-07 결제 실패 시 주문 보류
- 상태: implemented
- 결정: D-012

결제 승인이 거절되면 시스템은 주문을 `on-hold` 상태로 바꿔야 한다(SHALL).

#### Scenario: 승인 거절
- **WHEN** 결제 게이트웨이가 거절 응답을 보낸다
- **THEN** 주문 상태가 `on-hold`가 된다
```

테스트 시나리오는 `openspec/tests/phase1/order-service/checkout/payment.feature`에 쓴다.

```gherkin
# language: ko
기능: 결제 실패 처리

  @ORD-FR-07-T01
  시나리오: 한도 초과로 거절되면 주문이 보류된다
    조건 결제 대기 중인 주문 "A-100"이 있다
    만일 결제 게이트웨이가 "limit_exceeded"로 거절한다
    그러면 주문 "A-100"의 상태는 "on-hold"이다
```

## 명령

| 명령 | 용도 |
|---|---|
| `aiwf init [--lang ko\|en] [--phases a,b]` | `workflow.json`, 규칙, 폴더 생성. 기존 파일은 덮어쓰지 않는다 |
| `aiwf add app\|interface\|decision ...` | 앱 · 인터페이스 등록, 결정 기록 생성 |
| `aiwf next-id <앱 또는 인터페이스>` | 다음 요구사항 ID. 진행 중인 변경도 센다 |
| `aiwf check [--only ...] [--gate <change>] [--json]` | 검사 실행. 오류가 있으면 종료 코드 1 |
| `aiwf approve <change> --by <담당자>` | 담당자 승인 기록 (사람이 실행) |
| `aiwf doctor` | 설치된 OpenSpec이 aiwf의 가정과 맞는지 확인 |
| `aiwf openspec status` | 설치 · 최신 · 시험한 OpenSpec 버전 |
| `aiwf openspec upgrade [--to <v>] [--force]` | OpenSpec 업그레이드, `openspec update`, 설정 블록 갱신, doctor 실행 |
| `aiwf openspec <인자>` | OpenSpec CLI로 그대로 전달 |
| `aiwf skills install [--dir <폴더>]` | 플러그인을 지원하지 않는 에이전트용으로 스킬 복사 |

## 검사

| 검사 | 오류 | 경고 |
|---|---|---|
| `structure` | 스펙 경로가 phase · 앱과 맞지 않음, `app.md` 없음, 스펙 없는 테스트 폴더, 결정 파일 없음 | |
| `ids` | ID 형식, ID 중복, 상태 없음 또는 허용되지 않는 상태 | |
| `trace` | 테스트 ID 없는 시나리오, 중복되거나 대상 없는 테스트 ID, 다른 폴더에 놓인 테스트, 시나리오 없는 구현 요구사항 | 소스 코드 · 자동 테스트에 ID 없음 |
| `slop` | 금지 표현, 줄 수 상한 초과 파일, 스텝 상한 초과 시나리오 | |
| `approval` | 시작했거나 관문을 지정한 변경에 담당자 승인 없음 | 건드린 앱에 담당자 없음 |
| `contracts` | 계약 파일 또는 `info.version` 없음, 버전을 올리지 않은 변경, 주 버전을 올리지 않은 호환 깨짐 | 비교 도구 또는 Git 기준 없음 |

호환 깨짐은 `workflow.json`의 `contracts.tools`에 지정한 외부 도구로 판정한다. OpenAPI 기본값은 [oasdiff](https://github.com/oasdiff/oasdiff)이다. AsyncAPI는 기본값이 없다. `{base}`와 `{head}`를 파일 자리로 쓰고, 호환이 깨지면 0이 아닌 코드로 끝나는 명령을 지정한다. 도구가 없으면 버전 올림 규칙만 강제하고 경고로 알린다.

## 스킬

| 스킬 | 용도 |
|---|---|
| `aiwf-init` | 구조를 만들고 앱 · 인터페이스를 등록 |
| `aiwf-authoring` | 스펙 · 시나리오 · 계약을 쓸 때마다 적용하는 규칙 |
| `aiwf-check` | 검사 실행, 지적 해결, OpenSpec 업그레이드 |
| `aiwf-baseline` | 기존 앱의 코드에서 스펙을 추출해 baseline 변경으로 작성 |

## OpenSpec 업데이트 대응

- OpenSpec의 CLI와 파일 형식을 아는 모듈은 `src/openspec-adapter.mjs` 하나다.
- `aiwf doctor`는 표본 `spec.md`를 aiwf가 읽은 결과와 `openspec show --json` 결과를 비교하고, 다르면 실패한다. 새 OpenSpec 버전에서 형식이 바뀌면 잘못 읽는 대신 실패로 드러난다.
- `aiwf openspec upgrade`는 `--force` 없이는 새 주 버전을 거부하고, 업그레이드 뒤 doctor가 실패하면 되돌리는 명령을 출력한다.
- OpenSpec 2.2.0으로 시험했다. 지원 범위는 어댑터의 `SUPPORTED`에 있다.

## 한계

- `aiwf check`는 진행 중인 변경의 델타 스펙에서 요구사항 ID를 읽지만 변경 자체는 검증하지 않는다. 그 검증은 `openspec validate --all --strict`로 한다.
- 코드 추적성은 `apps[].source`와 `trace.testDirs` 폴더에서 ID 문자열을 찾는 방식이다.
- 승인은 변경 폴더의 파일이다. 누가 승인했는지 기록할 뿐 본인 확인은 하지 않는다. 강제하려면 브랜치 보호나 코드 소유자 설정을 함께 쓴다.
- Gherkin은 영어와 한국어 키워드를 읽는다.

## 라이선스

MIT

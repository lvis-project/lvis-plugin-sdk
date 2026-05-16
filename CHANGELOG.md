# Changelog

All notable changes to `@lvis/plugin-sdk` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.9.2] - 2026-05-17

> **Version slot note**: tags `v5.9.0` (df6bacc) and `v5.9.1` (0ccc887)
> were cut on commits with stale `package.json` (still 5.8.0) before this
> bump. Per the README "Tag policy" rule (immutable release points), we
> skip those slots and ship as 5.9.2.

### Added — `notificationEvents[*].bypassFocusGate` (optional boolean) [#151]

플러그인 manifest 의 `notificationEvents[i]` 에 `bypassFocusGate?: boolean`
필드 추가. host (lvis-app PR #875) 의 multi-window focus gate + cooldown
gate 를 우회하는 *critical alert* opt-in. 예: meeting plugin 의
`meeting.starting-soon` — 사용자 attention 이 다른 window 에 있어도
정상 표시되어야 하는 알림.

- **Schema**: `schemas/plugin-manifest.schema.json` 의
  `notificationEvents.items.properties` 에 `bypassFocusGate: { type: "boolean" }`
  추가. AJV strict (`additionalProperties: false`) 와 호환.
- **Types**: `src/index.ts` 의 `PluginManifest.notificationEvents[i]` +
  `PluginMarketplaceItem.notificationEvents[i]` 양쪽 모두 동일한 optional
  field 노출 (marketplace 카드 표시 일관성).
- **Host contract**: host 가 `bypassFocusGate=true` 이면 focus gate +
  cooldown gate + (manifest 가 허용한 경우) urgent flag 까지 함께 적용.
  기본값 `false` 또는 omitted — 기존 동작 그대로.
- **Cross-repo ordering**: host package.json 의 `@lvis/plugin-sdk` dep 이
  ≥5.9.2 으로 bump 되어야 manifest validation 통과. host PR #875 와 함께
  publish 필요.

### Added — `toolSchemas[*].writesToOwnSandbox` (optional boolean) [#150]

`toolSchemas[i]` 에 `writesToOwnSandbox?: boolean` 추가. plugin sandbox
디렉토리 (`~/.lvis/plugins/<pluginId>/`) 내부 쓰기만 한다고 *self-attest*
하면 host reviewer 가 LOW risk 로 routing — 매번 user prompt 안 띄움 (ms-graph
MSAL token cache 등 OAuth flow). runtime 이 path containment 를 invocation
시점에 verify — 실제 sandbox 밖이면 standard write rule 로 fallback.

---

## [5.8.0] - 2026-05-16

### Added — `runtime/network` shared DNS-probe primitive

ms-graph (advisory MSAL tenant routing) 와 lge-api (hard SSO pre-gate) 가
같은 사내망 감지 휴리스틱 (private-host DNS lookup) 을 각자 자기 패키지
안에 사본으로 들고 있었음. 세 번째 LGE-internal 플러그인이 같은 트릭을
재구현하기 전에 SDK 로 승격.

- **`detectViaPrivateDnsProbe(host, { timeoutMs? })`** —
  `node:dns/promises.lookup` 을 1.5s race 로 호출. private network = resolve,
  외부망 = ENOTFOUND. timeout fail-safe = `false`.
- **Dedup**: same-host concurrent caller 는 하나의 in-flight probe 를
  공유. dedup slot 의 lifetime 은 underlying lookup 이 settle 할 때까지
  유지 (timeout race 종료 시점이 아님) — slow DNS 에서 retry-loop 가
  fan-out 하는 문제 방어.
- **No cache**: 양방향 transition 을 자연스럽게 잡기 위해 매 호출이
  fresh probe. OS resolver 캐시가 perf 책임.
- **Open-source-clean**: SDK 는 mechanism 만, 사내 호스트명은 각 소비자
  plugin 의 상수 + 자체 도메인-특화 에러 클래스가 보유.
- **Subpath**: `@lvis/plugin-sdk/runtime/network` — `runtime/electron`
  패턴과 동일한 `runtime/*` 컨벤션.
- **Test seam**: `__resetPrivateDnsProbeInFlightForTests()` —
  `assertTestEnvironment` 가드 (NODE_ENV=production + !VITEST + !LVIS_TEST
  에서 throw). 공유 `_test-env.ts` 헬퍼로 추출하여 `runtime/electron`
  의 inline 사본 제거.

### Internal — runtime test-env helper extracted

- `runtime/electron.ts` 의 `assertTestEnvironment` 를 `runtime/_test-env.ts`
  로 추출. behavior unchanged — 다른 `runtime/*` 모듈에서도 동일 가드
  재사용.

### Notes

- 5.7.0 (PR #139, startupTools 제거) 의 CHANGELOG 누락은 본 PR scope 외 —
  추후 보정 PR.
- 에러 클래스 SDK 승격은 의도적으로 보류 — 두 소비자 중 하나만 throw
  하고 메시지/code 가 회사-특화라 generic 화 시 wrapping 필요.

---

## [5.6.0] - 2026-05-14

### Added — auth-window visibility + partition wipe

플러그인이 silent-SSO warmup 과 user-triggered sign-out 를 제대로 표현할 수
있도록 `openAuthWindow` 옵션 + `PluginHostApi` 메서드를 확장. 둘 다 additive,
breaking change 없음.

- **`OpenAuthWindowBaseOptions.show?: boolean`** — `false` 일 때 호스트가
  Electron `BrowserWindow` 를 `show: false` 로 생성, 페이지는 navigate 하지만
  사용자에게는 절대 노출하지 않음. silent-SSO warmup (LGenie / 근태 / 주차
  등) 이 IdP cookies 만 minted 하고 사라지는 케이스에 사용. `timeoutMs` 을
  함께 명시하지 않으면 hidden challenge page 가 영원히 hang 될 수 있어
  호스트가 권장.
- **`PluginHostApi.clearAuthPartition?(partition: string)`** —
  `persist:plugin-auth:<pluginId>[:<sub>]` 의 모든 cookie / storage / cache /
  credential 을 wipe. `lge_signout` 같은 user-triggered sign-out 후 다음
  `openAuthWindow` 호출이 IdP residual cookies 로 silent SSO 되는 것을 차단.
  Partition 이름은 `openAuthWindow.persistPartition` 과 동일한 allow-list
  검증. `external-auth-consumer` capability 게이트 필수. Optional —
  `typeof api.clearAuthPartition === "function"` 으로 guard.

### Migration notes

플러그인은 모든 silent warmup 호출에 `show: false` 를 추가하면 popup flash
가 사라짐. `lge_signout` / `auth-reset` 류 핸들러는 in-memory + on-disk
정리 직후 `await hostApi.clearAuthPartition?.(YOUR_PARTITION)` 을 호출해야
재로그인 시 사용자 자격증명 입력이 다시 요구됨. 두 surface 모두 optional
이라 hostApi 5.4.0 미만 호스트에서도 동작 (silent fallback).

---

## [5.4.0] - 2026-05-13

### Removed — fallback artefact teardown (`lvis-app#667`)

`initialThemeArgs` (host `lvis-app/src/main.ts` commit `1696f92`) ships a primed
`--lvis-*` token payload to every `BrowserWindow` via
`webPreferences.additionalArguments`, so plugins paint with the correct theme
from frame 0. The pre-broadcast SDK fallback stylesheet that compensated for
the now-closed race window is fully removed.

- Deleted source: `src/ui/tokens/fallback-dark.json`,
  `src/ui/tokens/_generated-fallback-css.ts`, `src/ui/tokens/fallback.ts`,
  `src/ui/tokens/lvis-tokens.css`, `scripts/generate-fallback-artifacts.mjs`,
  and the `src/ui/__tests__/fallback-sot.test.ts` lockstep guard.
- `injectTokenCss` no longer ensures a `<style id="lvis-tokens-fallback">`;
  the module-level `_fallbackEnsured` WeakSet and `ensureFallback()` export
  are gone. `injectTokenCss` now writes only the caller-supplied CSS.
- `src/ui/index.ts` no longer side-effect-imports `./tokens/fallback.js`.
- Removed package subpath exports: `./ui/tokens/fallback`,
  `./ui/tokens/fallback-dark.json`, `./ui/lvis-tokens.css`.
- Removed package scripts: `generate:fallback`, `check:fallback-drift`,
  `prebuild`.
- New regression tests in `src/ui/__tests__/inject.test.ts` lock the
  "no auto-fallback" contract: `injectTokenCss` writes only the caller's
  CSS, leaves any host-managed `#lvis-tokens-fallback` element untouched,
  and `ensureFallback` is no longer a consumer API.

### Migration notes

Plugins that previously relied on the SDK's offline fallback `<style>`
(rendered before the host's first `host.theme.changed`) now depend on the
host shipping primed tokens via `additionalArguments`. This is the case for
all `lvis-app` versions on/after the matching host bump PR (Track B Step 2).
Downstream plugin authors who consumed the JSON or CSS subpath exports
directly should switch to the live `host.theme.changed` payload (via
`primeTheme`) — there is no compile-time replacement, by design.

---

## [5.3.0] - 2026-05-12

### Added

#### `primeTheme(bridge, opts?)` — single entry for plugin theme sync

플러그인이 mount 시 호출하는 하나의 함수로 `getTheme()` pull + `host.theme.changed` subscribe + 토큰 paint 3 경로를 캡슐화. 이전에는 각 플러그인이 직접 조합해야 했음 (예: agent-hub `work-board-panel.tsx:600-684` 의 inline triple-prime). 자세한 배경은 `lvis-app` `docs/architecture/proposals/2026-05-12-plugin-theme-unification.md` 참조.

- `primeTheme(bridge, { target?, onPayload? }): { dispose }` — React/vanilla 양쪽에서 사용. `target` 은 `Document | HTMLElement` 로 detached `BrowserWindow` document / scoped sidebar root 까지 흡수. `onPayload` 콜백이 sidebar custom 토큰 매핑 같은 use-case 흡수 → 이전의 "useTheme + 별도 `bridge.onEvent` 두 번째 구독" 안티패턴 해소.
- `useTheme(bridge, opts?)` 가 `primeTheme` 의 React wrapper 로 재구현됨. 기존 1-arg 호출자 (`useTheme(bridge)`) 는 그대로 동작 — opts 미전달 시 default target = `document.documentElement`.

#### Token JSON SoT — `src/ui/tokens/fallback-dark.json`

이전 3-place lockstep (`inject.ts:_FALLBACK_CSS` ↔ `lvis-tokens.css :root` ↔ host `_DARK_BASE`) 을 단일 JSON SoT 로 통합.

- `scripts/generate-fallback-artifacts.mjs` 가 JSON 으로부터 `_generated-fallback-css.ts` 와 `lvis-tokens.css` 를 빌드타임 generate. 호스트 `lvis-app` 의 `_DARK_BASE` 는 JSON 을 직접 re-import (별 PR 로 연결).
- `bun run generate:fallback` 으로 수동 재생성, `bun run check:fallback-drift` 가 CI drift gate.
- `prebuild` hook 으로 `bun run build` 가 자동으로 generate 먼저 실행.
- 부수 효과: 직전 `_FALLBACK_CSS` 의 17 token 누락 (radius-xs / spacing / typography / motion 19 종) 회복.

### Changed

- `applyThemeTokens(tokens, target?)`, `applyThemeFromHostEvent(event, target?)`, `ensureFallback(targetDoc?)`, `injectTokenCss(id, css, targetDoc?)` 모두 optional target 인자 추가 — detached BrowserWindow document / scoped sub-tree 지원. 기존 무인자 호출은 `document.documentElement` / `document` 디폴트로 동일 동작.
- `_fallbackEnsured` 가 module-level boolean → `WeakSet<Document>` 로 — multi-document 환경 (detached window) 에서 각 document 가 자기 fallback `<style>` 을 받게.

### Subpath exports

- `@lvis/plugin-sdk/ui/hooks/primeTheme` 신규
- `@lvis/plugin-sdk/ui/tokens/fallback-dark.json` 신규 (host 의 `_DARK_BASE` re-import 용)

### Migration notes

기존 코드 변경 불필요 — 모든 SDK API 가 backward-compatible. 다만 새 통일 패턴 (lvis-app PR #660 design memo 참조) 적용 시 각 플러그인의 inline triple-prime / scoped helper 가 `primeTheme(bridge, { target })` 한 줄로 축소 가능. 권장 마이그 시퀀스는 design memo §5.

---

## [5.0.2] - 2026-05-10

### Fixed

- Published the manifest schema capability enum update from PR #125 so consumers can validate plugins declaring `host:overlay`.

## [5.0.1] - 2026-05-09

### Fixed

#### Modal aria fallback contract

`Modal` 의 accessible name 결정 로직 정합:

- `title` 가 string non-blank / number 이면 `aria-labelledby` 가 visible heading 을 가리킴.
- 그 외 ReactNode (element 등) / `undefined` / `null` / `false` (즉 `cond && "X"` 패턴에서 cond 가 false) / blank string 은 `ariaLabel` fallback 으로 자동 전환.
- `ariaLabel` 이 빈 문자열이거나 whitespace-only 인 경우 unnamed dialog 가 되지 않도록 "Dialog" 기본값으로 자동 전환 (strict `??` 형식이라면 빈 string 을 의도된 accessible name 으로 honour 했을 위험).
- `shouldRenderHeader` 가 빈 헤더 컨테이너를 렌더하지 않도록 정리.
- 신규 테스트 추가: `title={false}`, 공백 string title, number title, 비어있는 ReactNode, 빈 / whitespace-only `ariaLabel`.

#### `useFocusTrap.initialFocus` JSDoc 강화

훅이 항상 trap container 를 `fallbackFocus` 로 패스한다는 점, container 가 tabbable 하지 않으면 `focus-trap` 이 throw 하고 hook 이 `console.warn` 으로 surface 한다는 점, `tabIndex={-1}` 요구사항을 명시.

### Documentation

#### Public surface JSDoc — sync-from-host 카탈로그 확장

`scripts/sync-from-host.mjs` 의 `JSDOC_CATALOG` 에 다음 필드/메소드 JSDoc 추가:

- `PluginHostApi.openExternalUrl?` — 외부 URL host 정책 라우팅. runtime guard 의무 명시.
- `PluginHostApi.getAppPreference?` — host global preference 읽기. allowlist 정책 + runtime guard.
- `PluginHostApi.showOverlay?` — host-rendered overlay 라이프사이클. dismiss 핸들 의무, capability advisory, runtime guard.
- `ConversationTriggerSpec.title` / `summary` / `primaryActionLabel` — Q11 Overlay Runner 표시 필드. 플러그인 소유 텍스트 룰.
- `ConversationTriggerResult.eventId` — host-minted unique ID, 후속 audit/event 상관관계용.

이전엔 host SoT 에 JSDoc 이 있어도 `sanitizeForPublic` 에서 strip 된 뒤 `enrichWithJsDoc` 의 카탈로그에 entry 가 없으면 재주입 되지 않아 SDK public surface 에 누락. SDK API 자체 변경 없음 — 동일 surface 의 문서화 정합 패치.

#### `prepare` 스크립트 제거 — consumer 측 `bun install` 실패 회귀 차단

`package.json` 의 `prepare` 스크립트 (`tsup && tsc -p tsconfig.build.json`) 를 제거하고 동일 내용을 `prepublishOnly` 로 옮겼습니다.

##### 증상

v5.0.0 부터 `github:lvis-project/lvis-plugin-sdk#v5.0.0` 를 의존성으로 받는 모든 plugin (lvis-plugin-meeting, lvis-plugin-lge-api, lvis-plugin-local-indexer 등) 의 `bun install --frozen-lockfile` 이 다음 형태로 실패:

```
src/ui/components/Toggle.tsx(61,7): error TS7026: JSX element implicitly has type 'any' ...
src/ui/hooks/useTheme.ts(1,27): error TS7016: Could not find a declaration file for module 'react' ...
error: prepare script from "@lvis/plugin-sdk" exited with 2
```

##### 원인 — npm/bun lifecycle script 표준 동작

npm/yarn/bun 은 `git URL` 형식 (`github:org/repo#tag`) 으로 받은 패키지의 경우 clone 직후 자동으로 `prepare` 스크립트를 실행합니다 (npm spec — git 패키지는 published artifact 가 없다고 가정해서 컨슈머 측에서 빌드 단계 필요). 이는 `npm install` 표준 절차의 일부이지 SDK 측에서 끌 수 있는 옵션이 아닙니다.

v5.0.0 의 `prepare` 가 실행하는 `tsc` 는 SDK 의 `devDependencies` (`@types/react`, `@types/node` 등) 가 컨슈머 측 `node_modules` 에 있어야 합니다. 그러나 npm/bun 은 transitive 패키지의 devDeps 를 컨슈머 환경에 설치하지 않습니다 (의존 그래프 비대화 방지). 따라서:

1. 컨슈머 plugin 의 `bun install` 이 SDK clone
2. bun 이 SDK 의 `prepare` 자동 실행 (npm spec)
3. `tsc` 가 컨슈머 측 `node_modules` 에서 `@types/react` 를 찾지 못해 exit 2
4. 전체 `bun install --frozen-lockfile` 실패

같은 패턴은 v3.4.0 → 3.4.1 (PR #77) 에서 한 번 해결됐다가 v3.9.0 (PR #99 — dist 커밋 제거 + prepare 의존) 에서 재도입됐습니다. 이번 5.0.1 은 v3.4.1 과 동일한 방향으로 정리합니다.

##### 수정

| | 이전 | 이후 |
|---|---|---|
| `prepare` 스크립트 | `tsup && tsc -p tsconfig.build.json` | **제거** |
| `prepublishOnly` 스크립트 | (없음) | `bun run build` (npm publish 시에만 동작) |
| `dist/` git 추적 | committed (v5.0.0 부터) | committed (변동 없음) |
| `check:dist-drift` CI 가드 | 활성 | 활성 (변동 없음 — 메인테이너가 `bun run build` 후 dist 커밋한 PR 만 통과) |

`prepare` 가 사라져도 컨슈머 plugin 은 정상 동작합니다 — git clone 시점에 이미 dist (`.js` + `.d.ts`) 가 들어있고, `package.json` 의 `exports` 필드가 dist 를 가리키기 때문입니다. 컨슈머 환경 빌드 단계는 더 이상 필요 없습니다.

##### 컨슈머 측 영향

- SDK pin 만 `github:lvis-project/lvis-plugin-sdk#v5.0.0` → `#v5.0.1` 로 올리고 `bun install` 한 뒤 재생성된 `bun.lock` 을 커밋
- API 무변경 — runtime/타입 모두 v5.0.0 과 동일
- 컨슈머 plugin 에 `@types/react` 추가 필요 없음

##### 메인테이너 워크플로

- 코드 변경 후 release 전: `bun run build` 실행 → dist 자동 갱신 → `git add dist package.json` 같이 commit
- `check:dist-drift` CI 가 dist staleness 를 enforce 하므로 빌드 누락이 PR 단계에서 차단됨

---

## [5.0.0] - 2026-05-08

### ⚠️ BREAKING CHANGE — LvisHostThemeEvent v2 (atomic cutover, no alias)

**`LvisHostThemeEvent` v1 필드 전면 제거 — `theme`, `chatTheme`, `codeTheme`,
`colorScheme`, `reducedMotion`, `fonts.family` 모두 삭제.**

v1 shape 의 모든 필드가 삭제되었습니다. 하위호환 alias 없음 — 이 버전으로 올리면
v1 필드를 참조하는 모든 plugin 코드가 TypeScript 컴파일 에러를 냅니다.

제거된 필드:
- `theme: "light" | "dark" | "high-contrast"` → `bundleId` + `shell` 로 대체
- `chatTheme: "default" | "lg" | "purple" | "orange" | "blue"` → `bundleId` 로 대체
- `codeTheme: "light" | "dark"` → `bundleId` + `shell` 로 대체
- `colorScheme?: string` → `shell: "light" | "dark"` 로 대체
- `reducedMotion?: boolean` → OS-level `prefers-reduced-motion` CSS media query 사용 (SDK 책임 범위 아님)
- `fonts?: { family?: string }` → plugin 자체 폰트 관리 또는 향후 `--lvis-*` font token 예정

#### 제거된 v1 필드 전체 목록

다음 필드들이 `LvisHostThemeEvent` / `LvisThemePayload` 에서 **모두 삭제**되었습니다.
하위호환 alias 없음 — 참조 시 TypeScript 컴파일 에러 발생.

| 제거된 필드 | v1 타입 | v2 대체 |
|---|---|---|
| `theme` | `"light" \| "dark" \| "high-contrast"` | `bundleId` + `shell` |
| `chatTheme` | `"default" \| "lg" \| "purple" \| "orange" \| "blue"` | `bundleId` |
| `codeTheme` | `"light" \| "dark"` | `bundleId` + `shell` |
| `colorScheme` | `string` (optional) | `shell: "light" \| "dark"` |
| `reducedMotion` | `boolean` (optional) | OS-level CSS media query (`prefers-reduced-motion`) — SDK 책임 범위 아님 |
| `fonts?.family` | `string` | `tokens` 맵 내 `--lvis-*` font token (또는 미포함 시 plugin 자체 폰트 관리) |

#### v2 신규 shape

```typescript
interface LvisHostThemeEvent {
  bundleId: "tokyo-night" | "midnight" | "forest" | "lge-light" | "lge-dark" | "high-contrast";
  shell: "light" | "dark";
  tokens: LvisTokenMap;
}
```

#### Migration guide

```typescript
// v1 (제거됨 — 더 이상 동작하지 않음)
bridge.onEvent("host.theme.changed", (data) => {
  const e = data as LvisThemePayload; // was LvisThemePayload / LvisHostThemeEvent v1
  root.setAttribute("data-theme", e.theme);              // ❌ theme 제거
  root.setAttribute("data-chat-theme", e.chatTheme);     // ❌ chatTheme 제거
  root.setAttribute("data-code-theme", e.codeTheme);     // ❌ codeTheme 제거
  // e.colorScheme, e.reducedMotion, e.fonts?.family      // ❌ 모두 제거
});

// v2 (새 shape)
bridge.onEvent("host.theme.changed", (data) => {
  const e = data as LvisHostThemeEvent;
  root.setAttribute("data-theme-bundle", e.bundleId); // ✅ bundleId
  root.setAttribute("data-shell", e.shell);            // ✅ shell
  // tokens 의 key 는 이미 "--lvis-*" 형태 — prefix 추가 불필요
  Object.entries(e.tokens).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value); // ✅ key = "--lvis-bg" 등
  });
});

// v2 — SDK helper 사용 (권장, 보일러플레이트 제거)
import { applyThemeFromHostEvent } from "@lvis/plugin-sdk/ui";

bridge.onEvent("host.theme.changed", (data) => {
  applyThemeFromHostEvent(data as LvisHostThemeEvent); // ✅ 단일 호출로 전체 적용
});
```

**`useTheme` 훅 사용자**: `colorScheme` / `reducedMotion` / `fonts.family` 는 훅이
이전에 DOM에 직접 적용하던 v1 전용 처리입니다 — 훅은 이제 오직 `bundleId`, `shell`,
`tokens` 만 처리합니다. 해당 필드를 참조하는 코드가 있다면 제거하세요.

SDK `useTheme` 훅을 그대로 사용하는 plugin 은 훅 내부가 자동으로 v2 로 동작하므로
**훅 호출 코드 수정 불필요** — SDK 버전만 `5.0.0` 으로 올리면 됩니다.

#### 영향 범위

- `LvisHostThemeEvent` 타입을 직접 import 하거나 v1 필드(`theme`, `chatTheme`,
  `codeTheme`)를 참조하는 plugin 코드를 v2 형식으로 교체해야 합니다.
- `useTheme()` 훅은 내부적으로 이미 v2 로 갱신되었으므로 훅 사용자는 **코드 변경
  없이** SDK 버전 bump 만으로 완료됩니다.
- `LvisThemePayload` 는 `LvisHostThemeEvent` 의 type alias 로 유지됩니다 (빈 shim
  아님 — 완전히 동일한 v2 타입).

#### 동시 진행 중인 변경

- **lvis-app PR #613** — host 가 `bundleId` / `shell` 필드를 실제로 emit 하는 쪽
  변경. 이 SDK bump 와 pair.
- **7 plugin repo SDK bump** — 각 plugin 의 `@lvis/plugin-sdk` 의존성을 `5.0.0`
  으로 올리는 Track C PR 들이 동시 진행 중.

#### 결정 근거

사용자 결정: **atomic cutover** — deprecation alias 없이 즉시 제거. v1/v2 분기
코드가 장기간 공존하면 host emit 쪽과 plugin 수신 쪽의 field contract 가 영구
모호해지므로, breaking bump 로 모든 소비자가 한 번에 이행하도록 강제합니다.

---

## [4.3.0] - 2026-05-04

### Added

- **`PluginHostApi.openExternalUrl?(url: string): Promise<void>`** — 외부 URL 을 사용자 정책에 따라 표시. Host 가 routing 결정 (in-app webview vs system browser), plugin 은 정책에 무지각. 정책 SoT: settings 의 `webView.preferredFlow`. *호스트 SDK v4.3.0+ runtime 에서만 동작.*
- **`PluginHostApi.getAppPreference?<T>(key: string): T | undefined`** — 호스트 글로벌 preference 읽기. plugin 의 자체 분기 (예: OAuth 흐름이 in-app 인지 system-browser 인지) 가 필요할 때 사용. Plugin private namespace (`pluginConfigs.*`) 는 거부 — 호스트가 명시적 allowlist 로 노출 키 결정. *호스트 SDK v4.3.0+ runtime 에서만 동작.*

> ⚠️ **B3 (host) 머지 전 다른 plugin 의 dep bump 금지** — host runtime 이 아직 wiring 안 됐으면 method undefined 호출 시 silent failure. 정확한 sequencing 은 plan 의 §6 참조.

---

## [4.2.1] - 2026-05-06

### Fixed

- **`Icon` default color in dark themes** — Icon now applies a default
  `.lvis-icon { color: var(--lvis-fg) }` rule via `injectTokenCss`, so
  lucide's stroke `currentColor` resolves to the host theme's
  foreground. Plugin webviews that hadn't set body/root
  `color: var(--lvis-fg)` explicitly previously rendered icons in the
  browser default (black) — invisible on dark themes' near-black
  background. Plugins can still override via own className, inline
  `style.color`, or a wrapping element with `color: …` set explicitly.
- The `lvis-icon` className is merged with any consumer-supplied
  className so consumer-defined CSS still wins on specificity / cascade.
- Removed the explicit `import "../tokens/fallback.js"` shim added in
  4.2.0 — `injectTokenCss("lvis-icon", …)` itself triggers the v4.0.1
  fallback ensure, restoring the SDK's "any UI component import emits
  the `:root` fallback" invariant via the canonical path.

---

## [4.2.0] - 2026-05-06

### Added — Icon primitive + curated lucide subset (PR3 of SDK UI roadmap)

- **`Icon`** — `<Icon name="folder" size={16} />` with an 88-name
  allowlist curated from real plugin needs across all 5 LVIS plugin
  domains. The 10 names migrated 1:1 from lvis-plugin-local-indexer's
  hand-rolled ICONS dict (search / folder / document / refresh / play /
  stop / plus / trash / empty / spark) plus 78 forward-compat additions:
  - **Media controls**: play / pause / stop
  - **State / form**: check / x / edit / copy / download / upload /
    save / loader / warning / info / error / external-link /
    check-circle / x-circle / circle / circle-dot / minus / file / tag
  - **Navigation**: chevron-up / chevron-down / chevron-left /
    chevron-right / arrow-left / arrow-right
  - **Schedule + time**: calendar / clock / timer / bell / bell-off
  - **People / agent**: user / users / bot / briefcase / home / building
  - **Communication / share**: mail / send / share / link /
    message-square / at-sign / paperclip / reply / forward
  - **Settings + overflow + help**: settings (gear) /
    more-horizontal (kebab) / help-circle
  - **Visibility / security**: eye / eye-off / lock / unlock /
    shield-check
  - **Meeting / call (with mute/off variants)**: video / video-off /
    mic / mic-off / phone / volume-2 / volume-x / volume-off
    (volume-off is a LVIS-side alias for volume-x — name pairs follow
    `<base>-off` convention)
  - **Tables / KPI / data**: filter / trending-up / trending-down /
    bar-chart / activity
  - **Favorites / saved**: star / pin / bookmark
  - **Layout views**: list / layout-grid
  - **Location / system**: map-pin / power / zap / terminal / archive
  - **Feedback**: thumbs-up
- **A11y default** — `aria-hidden="true"` for decorative use; passing
  `aria-label` removes the implicit hidden state, matching lucide-react
  convention.
- **Subpath export** — `@lvis/plugin-sdk/ui/components/Icon` for tree-
  shaking (single component bundle pulls all 24 icon refs but no other
  SDK component CSS).

### Why

Implementation survey across LVIS plugins: 3/5 plugins
(meeting / local-indexer / lge-api) duplicate ~9 lucide-shaped SVGs as
inline `<svg>` strings in vanilla JS. Plus agent-hub / work-proactive
(React) inline their own SVGs case-by-case. Standard primitive removes
the duplication and locks the curated set to a maintained source.

### Dependencies

- `lucide-react@^1.14.0` (ISC) — full library imported but only the
  24 referenced icons survive tree-shaking on consumer bundlers.

### Consumer migration

Vanilla plugins (local-indexer, meeting, lge-api) cannot consume the
React `Icon` primitive directly — their migration to the SDK lands as
part of the vanilla → React + SDK track (project-plugin-theme-migration-plan
memo). Until then, the Icon primitive is consumed by React-native
plugins (work-proactive, agent-hub) on case-by-case need.

---

## [4.1.0] - 2026-05-06

### Added — Modal primitive + useFocusTrap (PR2 of SDK UI roadmap)

- **`Modal`** — `<Modal open onClose title>` with focus trap (via
  `focus-trap` MIT), Esc key, body scroll lock, click-outside dismiss,
  `disableDismiss` for busy states, three sizes (`sm`/`md`/`lg`),
  optional `caption` + `footer` slots, ARIA `role="dialog"` +
  `aria-modal="true"` + `aria-labelledby`/`aria-label` based on whether
  `title` is a plain string.
- **`useFocusTrap(ref, active, options?)`** — direct hook, exposed for
  future dropdown / popover primitives. Wraps `focus-trap` with safe
  defaults (`returnFocusOnDeactivate: true`, no auto-deactivate on
  Esc/click-outside — Modal handles those itself).
- **Subpath exports** — `@lvis/plugin-sdk/ui/components/Modal`,
  `@lvis/plugin-sdk/ui/hooks/useFocusTrap`. Tree-shake-friendly per
  v3.10.0 contract (Modal uses `injectTokenCss` so the 4.0.1 fallback
  ensure-on-inject path covers it automatically).

### Why

Implementation survey across LVIS plugins: 2 hand-rolled modals
(`local-indexer` folder-preview + `agent-hub` ConfirmModal), at least 4
more on the way. agent-hub's existing modal had no focus trap → a11y
hole. Standard primitive removes the duplication and closes the gap.
First consumer migration (agent-hub ConfirmModal) lands as companion PR.

### Dependencies

- `focus-trap@^8.2.0` (MIT) — direct wrap, no `focus-trap-react` shim.

### Companion PR

- `lvis-plugin-agent-hub` — replaces ConfirmModal internals with SDK Modal.

---

## [4.0.1] - 2026-05-05

### Added

- **`ensureFallback()`** — new public export from
  `@lvis/plugin-sdk/ui/tokens/inject`. Idempotent helper that lazily injects
  the `:root` fallback `<style id="lvis-tokens-fallback">` block. Plugins
  that mount custom React shells before any SDK component evaluates can
  pre-warm the fallback by calling `ensureFallback()` directly. Otherwise
  it runs automatically on the first `injectTokenCss` call.

### Refactored — fallback ensure-on-inject (architect P0 follow-up to PR #102)

- **`:root` fallback CSS moves into `inject.ts`** as an ensure-on-first-call
  side effect of `injectTokenCss`. The 10 `import "../tokens/fallback.js"`
  side-effect-import lines that PR #102 added to every component
  module are removed — the requirement collapses from "use injectTokenCss
  AND remember the fallback import" to just "use injectTokenCss" (which
  every component already does for its own CSS).
- `tokens/fallback.ts` becomes a backward-compat shim — it now imports
  the new `ensureFallback` export from `inject.ts` and calls it. Plugin
  authors who imported `@lvis/plugin-sdk/ui/tokens/fallback` directly
  (subpath added in 3.10.0 / re-published in 4.0.0) continue to work unchanged.
- `ensureFallback` is exported from `inject.ts` for advanced consumers
  who want to pre-warm the `<style>` block before any component
  evaluates (e.g., a custom plugin shell that wants tokens applied
  before its own React mount).

### Why

Architect self-review on PR #102 flagged the 10-line copy-paste as a
real maintenance smell — future contributors authoring a new component
have to remember the side-effect import or the fallback drops. Folding
it into `injectTokenCss` makes the contract automatic.

Pure refactor — runtime behavior identical. 201/201 tests pass (4 new
gate-coverage cases added in `inject.test.ts`).

---

## [3.10.0] - 2026-05-05

### Added — per-component subpath exports (tree-shaking optimization)

- **`@lvis/plugin-sdk/ui/components/<Name>`** — each of the 10 UI
  components (Badge, Button, Card, Checkbox, Input, Select, Spinner,
  Stack, Text, Toggle) now ships as its own dist entry with a
  dedicated subpath export. Plugins that import only a few primitives
  (e.g., work-proactive uses Card / Stack / Inline / Toggle / Text /
  Spinner / Badge — 7/10 components, plus useTheme + injectTokenCss
  helpers) can replace the barrel import:

  ```ts
  // before — pulls all 11 component CSS strings into the bundle
  import { Stack, Toggle } from "@lvis/plugin-sdk/ui";

  // after — only Stack + Toggle CSS bundled
  import { Stack, Inline } from "@lvis/plugin-sdk/ui/components/Stack";
  import { Toggle } from "@lvis/plugin-sdk/ui/components/Toggle";
  ```

  Expected impact: lvis-plugin-work-proactive currently bundles every
  UI component (~1 MB barrel output) but uses only 7/11 — switching
  the import sites to subpaths should drop bundle size meaningfully.
  Actual numbers will land with the consumer-side migration PR.
  React + react-dom remain external, host-provided.

- **`@lvis/plugin-sdk/ui/hooks/useTheme`** — direct hook subpath. Useful
  for plugins that consume tokens via DOM query without using SDK
  components.
- **`@lvis/plugin-sdk/ui/tokens/inject`** and **`@lvis/plugin-sdk/ui/tokens/fallback`** —
  helper / fallback subpaths for advanced plugin authors who want to
  invoke `injectTokenCss` directly or pre-load fallback :root tokens
  outside the standard component path.

### Changed

- Each component file now performs a side-effect `import "../tokens/fallback.js"`
  so per-component subpath imports automatically include the `:root`
  fallback (otherwise the fallback would only ship via the `./ui`
  barrel). The bundler dedupes the import when multiple components
  appear in the same plugin bundle.

### Backward compatibility

- The `./ui` barrel keeps working unchanged — existing plugins (like
  the meeting/local-indexer/ms-graph fleet pinned to v3.x) continue
  to receive all components via the barrel re-export. Subpath imports
  are an opt-in optimization, not a breaking change.

---

## [3.9.1] - 2026-05-05

### Fixed
- **`:root` token fallback now auto-injects on `@lvis/plugin-sdk/ui` import.**
  Plugin webviews previously rendered SDK components with `var(--lvis-*)`
  resolving to the CSS `initial` keyword (i.e. invisible — Toggle thumb
  white-on-white) during the brief window between mount and the host's
  first `host.theme.changed` broadcast. Observed when entering a plugin
  panel for the first time after app launch — toggling the theme reset
  unstuck it. The fallback module emits a `:root { --lvis-*: ... }`
  block via `injectTokenCss` at module load (matching the values in
  `lvis-tokens.css :root` and the host's `_DARK_BASE` token map) so
  components paint with sensible dark-mode tokens immediately. The
  host's broadcast still wins via inline `style.setProperty` once it
  arrives.

## [3.9.0] - 2026-05-05

### Added
- **`Stack` and `Inline` layout primitives** (PR #98) — first composite
  primitive in the SDK UI. Vertical / horizontal flex containers with
  `gap`, `align`, `justify`, `wrap`, and `as` props. Hardcoded rem
  spacing scale (xs/sm/md/lg/xl) — to be migrated to design tokens
  when a `--lvis-spacing-*` SoT lands.

### Changed (build path)
- **dist/ no longer committed** (PR #99). The `prepare` lifecycle script
  now runs `tsup && tsc -p tsconfig.build.json`, regenerating dist on
  every consumer `bun install`. Eliminates two recurring CI pain points:
  TypeScript-side `.d.ts.map` OS drift between Linux and macOS, and
  the rebase tax on PRs whenever main moved an exported type. Consumer
  install is ~1-2s slower; that cost is dwarfed by the saved PR cycles.

## [3.8.1] - 2026-05-05

### Removed (BREAKING)
- **`PluginHostApi.addTask`** removed from interface (PR #97). Host task
  system removed in lvis-app Phase 4 (PR #551). Plugins that created
  tasks via `addTask` (e.g. meeting plugin) must migrate to agent-hub
  task creation tools.

## [3.8.0] - 2026-05-05

### Added
- **`@lvis/plugin-sdk/ui/tokens/validate`** — new export path. Build-time
  validator for `--lvis-*` CSS-token usage. Pure string-scan (no postcss
  dep). Plugins import from their CI to fail PRs that introduce
  references outside the 17-name `LVIS_TOKEN_NAMES` allowlist or that
  redefine canonical tokens. Functions:
  `findLvisTokenReferences`, `findLvisTokenDefinitions`,
  `validateTokenUsage`, `validateTokenDefinitions`.
- **SDK self-test** (`src/ui/__tests__/sdk-self-token-allowlist.test.ts`)
  — locks every component CSS string against the allowlist, with a
  `validator-bypass guard` that compares raw vs stripped scan to catch
  references hidden inside JSX/JS string literals.
- **`.github/workflows/test.yml`** — first general test workflow on the
  SDK. Runs `bun run test`, `bunx tsc --noEmit`, and a dist-staleness
  guard (`bun run build` + `git status --porcelain -- dist/`) on every
  PR + push to main. Actions SHA-pinned to match `drift-check.yml`.
- `packageManager: bun@1.1.38` pin in `package.json` so local devs and
  CI emit byte-identical dist artifacts.

### Improved
- **Spinner.tsx** — moved `var(--lvis-primary)` from a JSX attribute
  string into a CSS template-literal block injected via
  `injectTokenCss`. JSX attribute strings are erased by the validator's
  `stripCommentsAndStrings` preprocessor, so the prior reference was
  invisible to validation. Behavior identical (same stroke color via
  CSS class).
- Validator regex hardened — case-sensitive allowlist check (CSS
  custom properties are case-sensitive per spec, so `var(--LVIS-bg)`
  is now flagged), declaration-context anchor on `_LVIS_DEF` to skip
  attribute-selector false matches, comment + string-literal stripping
  before scanning.

### Companion repos (recommended sweep after 3.8.0 publish)
- `lvis-plugin-template` — add `check-ui-tokens` script + CI step
  consuming `@lvis/plugin-sdk/ui/tokens/validate`.
- 7 plugin repos (`meeting`, `local-indexer`, `ms-graph`, `lge-api`,
  `work-proactive`, `agent-hub`, plus future ones) — same
  `check-ui-tokens` step. Current scan: zero `var(--lvis-*)` references
  across all plugins, so the validator's introduction is a clean
  forward-looking guard rather than a regression fix.
- `lvis-app` — `docs/references/plugin-tool-schema-design.md` already
  carries the `host.*` host-only-emit row added in PR #94; needs a
  matching "UI styling tokens" section pointing plugin authors at the
  validator (auditor follow-up).
- `lvis-app` — extend `drift-check.yml` to also watch
  `src/ipc/domains/plugins.ts:PLUGIN_TOKEN_NAMES` ↔ SDK
  `LVIS_TOKEN_NAMES` so a one-sided change can't silently diverge
  (architect follow-up).

---

## [3.7.0] - 2026-05-04

### Improved (synced from host SoT)
- bridge.config / bridge.storage / agentApproval namespace types now reflect v0.2.2 host hardening
- pluginAccess.agentApprovalScopes manifest field (added 3.6.0 schema, types in 3.7.0)
- ApprovalChoice union type explicit (was inline string union)

### Drift check
- `bun run sync:from-host` against `lvis-app` v0.2.2 SoT: **no drift** — src/index.ts already in sync

### Companion repos (require sdk dep ref bump after 3.7.0 publish)
- lvis-app
- lvis-plugin-meeting
- lvis-plugin-local-indexer
- lvis-plugin-ms-graph
- lvis-plugin-lge-api
- lvis-plugin-work-proactive
- lvis-plugin-agent-hub
- lvis-plugin-template

---

## [3.6.0] - 2026-05-04

### Added (synced from host SoT — `lvis-app/src/plugins/types.ts`)

- **`PluginHostApi.agentApproval`** — §8 ApprovalGate response channel for
  plugin-side approval round-trip. `respond(approvalId, choice, nonce?, hmac?)`
  closes a previously requested decision flow. Used by `agent-hub` v0.2.0+
  for the `agent_hub_decide_approval_with_host` tool.

- **`AuthWindowCookie`** / **`OpenAuthWindowBaseOptions`** /
  **`OpenAuthWindowWithFinalUrlOptions`** / **`OpenAuthWindowCookieOptions`** /
  **`OpenAuthWindowFinalUrlResult`** — Typed surface for `openAuthWindow` web
  auth flow (final URL or cookie capture mode).

- **`ApprovalChoice`** — Union type for the four-state approval decision
  (`"approved" | "rejected" | "approved-permanent" | "rejected-permanent"`).

### Notes

- Additive only — all existing 3.5.x consumers are unaffected.
- Generated by `bun run sync:from-host` against `lvis-app` v0.2.1 release SoT.
- Companion dep bump required for plugin repos after this release:
  - `lvis-plugin-agent-hub`
  - `lvis-plugin-meeting`
  - `lvis-plugin-local-indexer`
  - `lvis-plugin-ms-graph`
  - `lvis-plugin-lge-api`
  - `lvis-plugin-work-proactive`
  - `lvis-plugin-template`

Closes lvis-plugin-agent-hub#73.

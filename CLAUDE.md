# CLAUDE.md

Guidance for Claude Code in this repository.

## Project

Quaranta is a rummy card game. npm workspaces, no `packages/` folder:

- `shared/` (`@quaranta/shared`): rules engine + bots. Pure TypeScript, no React/Expo imports. `applyAction(state, action)` is the only way state changes; it throws `GameRuleError` for illegal moves. Keep `GameState` JSON-serializable (it's persisted to AsyncStorage and Firestore) and keep randomness on `state.rngState` so actions stay pure.
- `mobile/` (`@quaranta/mobile`): Expo Router app for Android, iOS and web. UI state and the game live in `src/stores/gameStore.ts`; components never call the engine's actions directly.

`mobile` imports `@quaranta/shared` from source (`main: src/index.ts`); there is no build step for `shared`.

## Conventions

- Size layout with `useLayout()` / `useWindowDimensions()`; breakpoints are `width >= 900` (large) and `width >= 600` (tablet), same as Lawnscapers. Never hardcode layout-critical pixel sizes.
- Colors come from `mobile/src/theme.ts`.
- Firebase is optional: every Firebase call goes through `src/services/` and must degrade to offline play when config or sign-in is missing.
- Rules changes go in `shared/` with tests in `shared/src/__tests__/`. Opening condition fixtures were ported from the original C# xUnit suite.

## Validation

Run before finishing a change:

```bash
npm run typecheck && npm run lint && npm test
```

For UI changes, also run the web build (`npm run build:web`) or play it via `npm run web`.

Jest configs use `testRegex` rather than `testMatch`: glob matching skips dot-directories, which breaks in `.claude/worktrees/...` checkouts.

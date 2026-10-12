# Online multiplayer plan

Status: Milestone 0 done (emulator setup moved to Milestone 1). Validation spike results below.

## Goal

Two to four people (any seats left over filled by bots) play a game together from their own devices, on Android, iOS or the web, with private hands and no way to cheat by reading the database.

## Recommendation

**Server-authoritative turns on Firebase: Cloud Functions apply moves with the existing `@quaranta/shared` engine; Firestore stores a public table document plus one private hand document per player.**

Why this shape:

- The engine is already a pure `applyAction(state, action)` over JSON state, so the server can run exactly the code the app runs today. No rules logic gets duplicated in Firestore security rules (which couldn't express it anyway).
- Hidden information stays hidden. The deck order and the RNG state never leave the server. With `rngState` and the shuffle code, a client could reproduce the deck, so it must be server-only.
- Firestore listeners give every device live updates without running a game server.

### Alternatives considered

| Option | Verdict |
| --- | --- |
| **Client-authoritative Firestore** (each client applies its own move and writes state) | Rejected. Any player can read the deck and other hands, and rules can't validate moves. |
| **Host device as dealer** (one player's app runs the engine) | Works on the free Spark plan, but the host can see every hand and the game stalls when the host leaves. Only acceptable as a friends-only stopgap. |
| **Realtime Database instead of Firestore** | Cheaper for many tiny writes and has built-in presence, but Spark caps it at 100 simultaneous connections and it has weaker queries. Use it only for presence (see Milestone 4). |
| **Dedicated game server** (Colyseus or Cloud Run with websockets) | Overkill for a turn-based game; more to run and pay for. |

### Requirement: the Blaze plan

Cloud Functions are not available on the free Spark plan. The project (`quaranta-f22d7`) currently has billing disabled, so it must be upgraded to **Blaze** (pay as you go) and linked to a billing account. Blaze keeps the same free allowances; set a budget alert (for example $5/month) when upgrading.

## Validation results (spike, October 2026)

A throwaway spike ran 20 four-player bot games through a prototype `getPlayerView(state, playerId)` and bundled it the way a Cloud Function would be deployed.

| Check | Result |
| --- | --- |
| Per-player view leaks hidden cards or `rngState` | **0 leaks**, checked for every player after every one of ~12,500 actions |
| Bundle the shared engine into one file (esbuild, `--platform=node --target=node22`) and run it outside the workspace | Works; 34 KB bundle. The Firebase CLI only uploads `functions/`, so bundling is how `@quaranta/shared` (consumed from source) gets deployed. |
| Full state size | ≤ 9.8 KB (well under Firestore's 1 MiB document limit) |
| Per-player view size | ≤ 6.7 KB |
| Actions per four-player game | ~620 (~260 turns) |

### Cost estimate

Naive model: one write set per action (public doc + acting player's hand doc + server-only doc), and each seated device reads the public doc and its own hand on every change.

| Per four-player game | Estimate |
| --- | --- |
| Firestore writes | ~1,900 |
| Firestore reads | ~3,100 |
| Function invocations | ~620 with four people (one per move); fewer with bots, whose moves run inside the human's call |

- **Free tier:** 20K writes and 50K reads per day cover roughly **10 multiplayer games a day**; 2M function invocations a month cover about 3,000 games.
- **Beyond the free tier:** Firestore is $0.03 per 100K reads and $0.09 per 100K writes in us-central1, and roughly double that in a multi-region like our `nam5`. That works out to **about half a cent per game** at worst.
- **Easy reductions:** apply a run of consecutive bot moves in one write, and skip the hand-document write when the hand didn't change (discards and table plays don't touch the deck doc). These should cut writes by more than half.

The current single-player app also saves the full state after every `open`, `discard` and `nextRound`, including bot turns: about 280 writes per game, or ~70 single-player games a day on the free quota. Saving only when the human's turn ends and at the end of each hand cuts that to ~70 writes per game. Worth doing before launch either way.

## Data model

```
games/{gameId}                      public table; seated players can read; no client writes
  status, version, hostUid, inviteCode, createdAt, turnDeadline
  seats[]: { uid | null, name, isBot, isOpen, handCount, connected }
  phaseIndex, dealerIndex, currentPlayerIndex, turnStage, openedThisTurn
  melds[], topDiscard, discardCount, deckCount, results[], log[]

games/{gameId}/hands/{uid}          { cards[] } — readable only by that uid; no client writes
games/{gameId}/server/state         full GameState JSON (deck, rngState) — no client access
games/{gameId}/actions/{autoId}     optional append-only move log for replays and debugging
invites/{code}                      { gameId } — lets a player join by a short code
```

Security rules for this are small: everything is read-only to clients except through Functions, and reads are gated on the caller holding a seat (or on the invite code during the lobby).

## Server API (callable Functions, v2, Node 22)

| Function | Does |
| --- | --- |
| `createGame({ seats, botFill })` | Creates the lobby and an invite code |
| `joinGame({ code, name })` | Takes an open seat |
| `startGame({ gameId })` | Host only. Fills empty seats with bots, deals, writes the public, hand and server docs |
| `submitAction({ gameId, action, expectedVersion })` | In a transaction: loads server state, checks the caller's uid equals `action.playerId` and the version matches, runs `applyAction`, then runs any bot turns that follow, and writes all three docs |
| `leaveGame({ gameId })` | Hands the seat to a bot |
| Turn timeout (Cloud Tasks per turn, or a scheduled sweep) | When `turnDeadline` passes, plays the turn with `chooseBotAction` |

## Engine changes (in `shared/`, no Blaze needed)

1. `getPlayerView(state, playerId)`: the redacted view, promoted from the spike, with tests asserting nothing hidden leaks.
2. `version` on `GameState`, incremented by every action, for optimistic concurrency and stale-move rejection.
3. Seats keyed by Firebase uid (`PlayerSetup.id` already allows custom ids).
4. **Buying**: the out-of-turn rule (README to-do). Needs a short "buy window" in the turn state and a priority order when several players want the same card. This is the rule most affected by network latency, so it should be designed for multiplayer from the start.
5. Keep time out of the engine; Functions own deadlines and timestamps.

## Milestones

### Milestone 0 progress

- [x] `getPlayerView` / `getPublicView` in `shared/src/playerView.ts`, with a whole-game leak test
- [x] `GameState.version`, incremented by every action
- [x] Unique player ids enforced, so seats can be keyed by Firebase uid
- [x] Single-player cloud saves cut to once per human turn plus hand start and end (`mobile/src/stores/gameStore.ts`), with a migration for games saved before `version` existed
- Firestore emulator and rules tests: moved to Milestone 1. Today's rules are trivial, and the emulator (which needs a JDK) earns its keep once Functions and the multiplayer rules exist. Can run in CI instead of locally.


| # | Scope | Needs Blaze |
| --- | --- | --- |
| 0 | Engine prep (the list above, minus buying); cut single-player save writes | No |
| 1 | Firestore emulator (needs a JDK locally, or CI only) with rules tests; `functions/` package: esbuild bundle of `@quaranta/shared`, `submitAction` with transactions, emulator tests, CI | Yes |
| 2 | Lobby UI: create, share code, join, seat list, start with bot fill | Yes |
| 3 | In-game sync: subscribe to the public doc and own hand; server-confirmed moves with pending states | Yes |
| 4 | Timeouts and bot takeover, reconnect, presence (Realtime Database `onDisconnect`) | Yes |
| 5 | Buying rule, turn notifications (Expo push / FCM), Google sign-in linked to the anonymous account for cross-device identity, App Check | Yes |

## Decisions needed

1. **Upgrade to Blaze** so Functions can run (needs a billing account; only the project owner can do this in the console).
2. **Live or asynchronous games?** Live (minutes-long turn timer, everyone online) is simpler. Async (hours to move, notifications) changes timers and makes push notifications essential.
3. **Identity:** stay anonymous for the first release, or add Google sign-in now so games follow players across devices?
4. **Buying rule details:** who gets priority, whether a buy costs a penalty card, and any limit per hand.
5. **Seat count online:** 2 to 4 (matches the app today) or up to 6 (the engine supports it).

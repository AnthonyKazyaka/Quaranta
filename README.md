# Quaranta

A rummy card game in eight hands, built with React Native (Expo) for Android, iOS and the web, with optional Firebase cloud saves.

## Layout

| Folder    | What it is |
| --------- | ---------- |
| `shared/` | `@quaranta/shared`: the rules engine and computer opponents, plain TypeScript with no React or platform dependencies. Every action is a pure function over a JSON-serializable `GameState`. |
| `mobile/` | `@quaranta/mobile`: the Expo Router app (Android, iOS and web from one codebase). State lives in a zustand store persisted to AsyncStorage. |

The original C# implementation (console game, xUnit tests) was ported into `shared/` and removed; it's in git history before this migration.

## Getting started

```bash
npm install
```

```bash
npm run web
```

`npm start` opens the Expo dev server for a device or emulator; `npm run android` / `npm run ios` open those directly.

Checks (CI runs all of these):

```bash
npm run typecheck && npm run lint && npm test && npm run build:web
```

## Firebase

Firebase is optional. Without config the game runs offline and saves the current game on the device. With it, every game is also saved to Firestore under an anonymous user.

The project is `quaranta-f22d7` (set as the default in `.firebaserc`), with anonymous sign-in enabled and Firestore in `nam5`. Its web app is named **Quaranta**.

1. Create `mobile/.env` from the web app's config (it's gitignored):

   ```bash
   npx firebase-tools apps:sdkconfig WEB 1:741147364469:web:dc2ab88aa2d4051d58bc3c
   ```

   Copy the values into the keys listed in `mobile/.env.example`, then restart the dev server with `--clear` so Metro picks up the new config.
2. After editing `firestore.rules` or `firestore.indexes.json`, deploy them with `npm run deploy:rules`.
3. Optional: `npm run deploy:hosting` publishes the web build (`mobile/dist`) to Firebase Hosting.

Data model: `users/{uid}/games/{gameId}` holds a summary (status, hand, players, scores) for listing plus the full engine state as a JSON string. Rules are in `firestore.rules`.

## Rules implemented

- 108-card deck (two standard decks plus four jokers); 13 cards each; 2 to 6 players (the app offers 1 to 3 computer opponents).
- Eight hands with their own opening requirements: High Pair, Two Pair, Three of a Kind, Full House, Forty, Four of a Kind, Straight Flush, All Down. The dealer rotates each hand.
- Draw from the deck or the discard pile, open once per hand, then (on later turns) lay runs or sets of 3+, add to any meld on the table and swap natural cards for jokers.
- Discard limits: no card that plays on the table, and no high cards in the first two hands until everyone has opened. If every card is blocked, any card may go.
- Scoring: 2 through 10 at face value, faces 10, Aces 1 (or 11 each if you hold more than one), jokers 25, capped at 100 per hand. In All Down, anyone holding cards takes 100.

Buying: when the current player draws from the deck instead of taking the top discard, the other players may buy that discard before play continues (never the first card turned up or a joker). The buyer takes just that card. If several players want it, whoever is closest to the current player's left wins; the player who threw it can't buy it back. There's no limit on how many times a player can buy.

Own pace mode (the alternative to Classic): each player works through the openings at their own pace. After a hand in which you opened you move on to your next opening; otherwise you try the same one again. The game ends after the hand in which someone opens with All Down (or after 20 hands), and whoever completed the most openings wins, with points breaking ties.

House rules added during the port (easy to change in `shared/src/game.ts`):

- Runs can play an Ace low or high but don't wrap (K-A-2).
- A player can also go out by melding their last card rather than discarding it.
- If the deck runs out a third time in one hand, the hand ends with nobody going out.

## Online play (demo)

Online play shows only in development builds (`__DEV__`), or in any build with `EXPO_PUBLIC_ENABLE_ONLINE_DEMO=true`, until the real backend replaces the mock.

The screens for online play are built and playable, but the network layer is a stand-in: `MockOnlineService` (`mobile/src/services/online/`) runs the real engine in memory and simulates latency, friends who join and play, turn timers with bot takeover, and dropped connections. From the home screen, **Play online** lets you host a table (2 to 4 seats, either mode, 15 s to 2 min per turn) or join with a code. Try these codes:

| Code | What happens |
| ---- | ------------ |
| `DEMO` | Joins a table hosted by a pretend friend, who starts the game a few seconds later |
| `FULL` | "That table is full" |
| `DONE` | "That game has already started" |

Inside a game, **Demo controls** drops your connection or freezes a friend so you can see the reconnect and bot-takeover flows. The real backend (Cloud Functions plus Firestore) is planned in [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md); it only has to implement the `OnlineService` interface in `mobile/src/services/online/types.ts`.

## To do

- [ ] Real online multiplayer backend: Cloud Functions and Firestore behind `OnlineService`, replacing the mock (needs the Blaze plan; see docs/MULTIPLAYER.md).
- [ ] Real Google sign-in linking and push notifications for turns (both are demo stand-ins today).
- [ ] Final art pass on the app icon and splash (first version is in `mobile/assets/`).
- [ ] Custom game variants, later. For example a configurable penalty-card count. That would mean a serializable `rules` object on `GameState`, set in `createGame`. The main game comes first.

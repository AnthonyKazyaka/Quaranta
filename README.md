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
- Buying: when the current player draws from the deck, anyone else (open or not) may buy the top discard they passed over, except jokers and the very first card turned up in the game. The offer stays open until that player discards; then the first requester in turn order after them gets the card. The buyer takes only that card. There's no limit.
- Stakes (play money): everyone antes 25¢ each hand and pays 10¢ per card bought; whoever goes out takes the pot. The game's winner collects 50¢ from every other player. Amounts are `STAKES` in `shared/src/game.ts`.

House rules added during the port (easy to change in `shared/src/game.ts`):

- Runs can play an Ace low or high but don't wrap (K-A-2).
- A player can also go out by melding their last card rather than discarding it.
- A hand only ends when someone goes out. Whenever the deck runs dry, the discards under the top card are shuffled into a new deck; if there's nothing to shuffle, the player takes the top discard.
- Players tied for first at the end of the game split the payout.

## To do

- [ ] Online multiplayer. The engine's action-based, serializable state is designed for it; hands would need to move out of the shared game document.
- [ ] Alternate mode where each player works through the openings at their own pace.
- [ ] App icon and splash art.

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

1. Create a Firebase project and add a **Web app**. Enable **Authentication → Anonymous** and create a **Firestore** database.
2. Copy `mobile/.env.example` to `mobile/.env` and fill in the web app's config.
3. Point the CLI at the project and deploy the rules: `npx firebase-tools use --add`, then `npm run deploy:rules`.
4. Optional: `npm run deploy:hosting` publishes the web build (`mobile/dist`) to Firebase Hosting.

Data model: `users/{uid}/games/{gameId}` holds a summary (status, hand, players, scores) for listing plus the full engine state as a JSON string. Rules are in `firestore.rules`.

## Rules implemented

- 108-card deck (two standard decks plus four jokers); 13 cards each; 2 to 6 players (the app offers 1 to 3 computer opponents).
- Eight hands with their own opening requirements: High Pair, Two Pair, Three of a Kind, Full House, Forty, Four of a Kind, Straight Flush, All Down. The dealer rotates each hand.
- Draw from the deck or the discard pile, open once per hand, then (on later turns) lay runs or sets of 3+, add to any meld on the table and swap natural cards for jokers.
- Discard limits: no card that plays on the table, and no high cards in the first two hands until everyone has opened. If every card is blocked, any card may go.
- Scoring: 2 through 10 at face value, faces 10, Aces 1 (or 11 each if you hold more than one), jokers 25, capped at 100 per hand. In All Down, anyone holding cards takes 100.

House rules added during the port (easy to change in `shared/src/game.ts`):

- Runs can play an Ace low or high but don't wrap (K-A-2).
- A player can also go out by melding their last card rather than discarding it.
- If the deck runs out a third time in one hand, the hand ends with nobody going out.

## To do

- [ ] Buying: other players may take the top discard when the current player draws from the deck (not on the first card or a joker).
- [ ] Online multiplayer. The engine's action-based, serializable state is designed for it; hands would need to move out of the shared game document.
- [ ] Alternate mode where each player works through the openings at their own pace.
- [ ] App icon and splash art.

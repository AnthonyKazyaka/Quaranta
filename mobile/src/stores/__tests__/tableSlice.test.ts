import { Card, GameAction, GameState, PlayerView, applyAction, createGame, getPlayerView, parseCards } from '@quaranta/shared';
import { TableUiState, createTableSlice, initialTableUi, reconcileSelection } from '../tableSlice';

/** A two-player game where p1 holds `hand`, with a run of 5H, a joker standing for 6H, and 7H on the table. */
function stateWith(hand: string): GameState {
  const tableRun = parseCards('5H J* 7H');
  tableRun[1] = { ...tableRun[1], joker: true, represents: { suit: 'hearts', rank: 6 } } as Card;
  const base = createGame({ seed: 2, players: [{ name: 'Ada', isBot: false }, { name: 'Bo', isBot: true }] });
  return {
    ...base,
    currentPlayerIndex: 0,
    turnStage: 'play',
    players: base.players.map((p) => (p.id === 'p1' ? { ...p, isOpen: true, hand: parseCards(hand) } : p)),
    melds: [{ id: 'm1', ownerId: 'p2', kind: 'run', cards: tableRun }],
  };
}

const viewWith = (hand: string): PlayerView => getPlayerView(stateWith(hand), 'p1');

/** A table slice wired to a plain object, recording every move it sends. */
function setup(view: PlayerView) {
  let ui: TableUiState = { ...initialTableUi };
  const sent: GameAction[] = [];
  const slice = createTableSlice(
    (partial) => {
      ui = { ...ui, ...partial };
    },
    () => ui,
    {
      getView: () => view,
      send: (action) => {
        sent.push(action);
        return true;
      },
    },
  );
  const select = (...ids: string[]) => ids.forEach((id) => slice.toggleCard(id));
  return { slice, sent, select, state: () => ui };
}

describe('playSelectionOnMeld', () => {
  it('swaps a joker out when the card is exactly the one it stands for', () => {
    const view = viewWith('6H 2C');
    const { slice, sent, select } = setup(view);
    select(view.hand[0].id);
    slice.playSelectionOnMeld('m1');
    expect(sent).toEqual([{ type: 'swapJoker', playerId: 'p1', meldId: 'm1', cardId: view.hand[0].id }]);
  });

  it('adds cards that extend the meld', () => {
    const view = viewWith('8H 2C');
    const { slice, sent, select } = setup(view);
    select(view.hand[0].id);
    slice.playSelectionOnMeld('m1');
    expect(sent).toEqual([{ type: 'addToMeld', playerId: 'p1', meldId: 'm1', cardIds: [view.hand[0].id] }]);
  });

  it('sends several selected cards as one addToMeld', () => {
    const view = viewWith('8H 9H 2C');
    const { slice, sent, select } = setup(view);
    select(view.hand[0].id, view.hand[1].id);
    slice.playSelectionOnMeld('m1');
    expect(sent).toEqual([{ type: 'addToMeld', playerId: 'p1', meldId: 'm1', cardIds: [view.hand[0].id, view.hand[1].id] }]);
  });

  it('sends a card that fits neither way as an add, so the engine explains why not', () => {
    const view = viewWith('2C 3C');
    const { slice, sent, select } = setup(view);
    select(view.hand[0].id);
    slice.playSelectionOnMeld('m1');
    expect(sent).toEqual([{ type: 'addToMeld', playerId: 'p1', meldId: 'm1', cardIds: [view.hand[0].id] }]);
  });

  it('asks for a selection first', () => {
    const { slice, sent, state } = setup(viewWith('8H 2C'));
    slice.playSelectionOnMeld('m1');
    expect(sent).toEqual([]);
    expect(state().message?.tone).toBe('info');
  });
});

describe('other table actions', () => {
  it('opens with the staged groups plus anything still selected', () => {
    const view = viewWith('KH KS 9D 9C');
    const { slice, sent, select } = setup(view);
    const [kh, ks, d9, c9] = view.hand.map((c) => c.id);
    select(kh, ks);
    slice.stageSelection();
    select(d9, c9);
    slice.openWithStaged();
    expect(sent).toEqual([{ type: 'open', playerId: 'p1', melds: [[kh, ks], [d9, c9]] }]);
  });

  it('only discards exactly one selected card', () => {
    const view = viewWith('8H 2C');
    const { slice, sent, select, state } = setup(view);
    slice.discardSelection();
    select(view.hand[0].id, view.hand[1].id);
    slice.discardSelection();
    expect(sent).toEqual([]);
    expect(state().message?.text).toMatch(/exactly one/);
  });

  it('tracks a move as pending until an async host answers', async () => {
    const view = viewWith('8H 2C');
    let release: (ok: boolean) => void = () => {};
    let ui: TableUiState = { ...initialTableUi };
    const slice = createTableSlice(
      (partial) => {
        ui = { ...ui, ...partial };
      },
      () => ui,
      { getView: () => view, send: () => new Promise<boolean>((resolve) => (release = resolve)) },
    );
    slice.buyDiscard();
    expect(ui.pending).toBe(true);
    release(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(ui.pending).toBe(false);
  });
});

describe('reconcileSelection', () => {
  const selection = (view: PlayerView) => ({
    selectedIds: [view.hand[0].id, 'gone'],
    stagedMelds: [[view.hand[1].id], ['gone']],
  });

  it('clears the selection when the turn changes, or when there is no earlier view', () => {
    const state = stateWith('8H 2C');
    const view = getPlayerView(state, 'p1');
    const next = applyAction(state, { type: 'discard', playerId: 'p1', cardId: view.hand[1].id });
    expect(reconcileSelection(selection(view), view, getPlayerView(next, 'p1'))).toEqual({ selectedIds: [], stagedMelds: [] });
    expect(reconcileSelection(selection(view), null, view)).toEqual({ selectedIds: [], stagedMelds: [] });
  });

  it('keeps only cards still in the hand while the turn carries on', () => {
    const view = viewWith('8H 2C 4D');
    expect(reconcileSelection(selection(view), view, view)).toEqual({
      selectedIds: [view.hand[0].id],
      stagedMelds: [[view.hand[1].id]],
    });
  });
});

using CardGameEngine.Cards;
using CardGameEngine.Decks;
using CardGameEngine.Game.PointEvaluators;
using Quaranta.GameLogic.Players;
using Quaranta.GameLogic.PointEvaluators;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Phases
{
    public class Phase : IPhase
    {
        public List<QuarantaPlayer> Players { get; private set; } = new();
        public Dictionary<QuarantaPlayer, int> ScoreByPlayer { get; } = new();
        public List<List<IPlayingCard>> DownCardGroups { get; set; } = new();
        public Stack<IPlayingCard> DiscardPile { get; private set; } = new();
        public Deck Deck { get; private set; }
        public IOpeningConditionStrategy OpeningConditionStrategy { get; private set; }
        public IDeckFactory DeckFactory { get; }

        private IPointEvaluator _pointEvaluator;
        
        public Phase(IOpeningConditionStrategy openingCondition, IDeckFactory deckFactory)
        {
            OpeningConditionStrategy = openingCondition;
            DeckFactory = deckFactory;

            // We want 2 extended decks (includes Jokers) to make up our full Quaranta deck
            Func<List<IPlayingCard>> createDeck = () => DeckFactory.GenerateDeck(DeckType.Extended).Cards;
            Deck = new Deck(createDeck().Concat(createDeck()).ToList());
        }

        public void SetupPointEvaluationLogic(IPointEvaluatorFactory pointEvaluatorFactory, PointEvaluatorType pointEvaluatorType)
        {
            _pointEvaluator = pointEvaluatorFactory.GetPointEvaluator(pointEvaluatorType.ToString());
        }

        // Play the round in turn order
        public void Start()
        {
            // Dealer deals the cards
            Deck.Shuffle();
            DealCards();

            // Has anyone gone out?
            while (!IsFinished())
            {
                foreach (var player in Players)
                {
                    // Play a card
                    var discard = player.TakeTurnAndDiscard(this);

                    // Add the card to the down card group
                    DiscardPile.Push(discard);
                }
            }
        }

        public bool IsFinished()
        {
            return Players.Count == 0 || Players.Any(player => player.Hand.Count == 0);
        }

        public void TabulateScore()
        {
            foreach (var player in Players)
            {
                ScoreByPlayer.Add(player, _pointEvaluator.EvaluatePoints(player.Hand));
            }
        }

        public void SetPlayers(List<QuarantaPlayer> players)
        {
            Players = players;
        }

        private void DealCards()
        {
            Players.ForEach(player => player.ResetHand());

            var cardCountForEachPlayer = 13;
            for(var i = 0; i < Players.Count * cardCountForEachPlayer; i++)
            {
                var card = Deck.DrawCard();
                var playerIndex = i % Players.Count;
                var player = Players[playerIndex];

                player.AddCard(card);
            }
        }
    }
}

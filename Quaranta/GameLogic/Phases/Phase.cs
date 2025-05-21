using CardGame.Cards;
using CardGame.Decks;
using CardGame.Game.PointEvaluators;
using CardGame.Players;
using Quaranta.CardCollections;
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
        public List<Meld> PlayedMelds { get; set; } = new();
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

            DiscardPile.Push(Deck.Draw());

            // Has anyone gone out?
            while (!IsFinished())
            {
                foreach (var player in Players)
                {
                    Console.WriteLine("~~~~~~");
                    Console.WriteLine($"{player.Name}'s turn. Everybody else look away lol");

                    // Play a card
                    var discard = player.TakeTurnAndDiscard(this);

                    Console.WriteLine($"{player.Name} discarded a _{discard}_ ");
                    Console.WriteLine($"{player.Name} has {player.Hand.Count} card{(player.Hand.Count == 1 ? string.Empty : "s")} remaining");

                    // Add the card to the down card group
                    DiscardPile.Push(discard);
                    Console.WriteLine("~~~~~~");
                    Console.WriteLine();
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

        protected void DealCards()
        {
            Players.ForEach(player => player.Reset());

            var cardCountForEachPlayer = 13;
            for(var i = 0; i < Players.Count * cardCountForEachPlayer; i++)
            {
                var card = Deck.Draw();
                var playerIndex = i % Players.Count;
                var player = Players[playerIndex];

                player.Hand.Add(card);
            }
        }

        public virtual bool IsDiscardValid(IPlayingCard playingCard)
        {
            if(playingCard == null)
            {
                return false;
            }

            if(playingCard is Joker)
            {
                return true;
            }

            var currentPhaseCondition = OpeningConditionStrategy.OpeningCondition;
            if(currentPhaseCondition == OpeningConditionType.HighPair || currentPhaseCondition == OpeningConditionType.TwoPair)
            {
                // Players aren't allowed to discard high cards during the first 2 rounds if somebody has not opened yet
                if(Players.Any(x=>!x.IsOpen))
                {
                    return playingCard.Rank != Rank.Ace && playingCard.Rank <= Rank.Ten;
                }
            }

            // A card that could be played on another set of down cards also cannot be discarded - it has to be played in some manner
            foreach(var downCardGroup in PlayedMelds)
            {
                var tempList = new List<IPlayingCard>(downCardGroup);
                
                // Check if the card can be played on the front of the group
                tempList.Insert(0, playingCard);
                var front = tempList.IsRun() || tempList.IsSet();
                
                tempList.RemoveAt(0);

                // Check if the card can be played on the back of the group
                tempList.Insert(tempList.Count - 1, playingCard);
                var back = tempList.IsRun() || tempList.IsSet();

                // If the card can be played on any down card group, then it's not a valid discard
                var canSwapWithJoker = false;
                if(downCardGroup.Any(x => x is Joker))
                {
                    canSwapWithJoker = downCardGroup.Any(x => x is Joker && x.Rank == playingCard.Rank && x.Suit == playingCard.Suit);
                }

                if(front || back || canSwapWithJoker)
                {
                    return false;
                }
            }

            return true;
        }

        public bool CanOpen(Player player, List<Meld> cardGroups)
        {
            return OpeningConditionStrategy.IsOpeningConditionMet(player, cardGroups);
        }
    }
}

using CardGameEngine.Cards;
using CardGameEngine.Decks;
using CardGameEngine.Game.PointEvaluators;
using Quaranta.GameLogic.PointEvaluators;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Phases
{
    public class Phase : IPhase
    {
        public List<QuarantaPlayer> Players { get; private set; }
        public Dictionary<QuarantaPlayer, int> ScoreByPlayer { get; }
        public List<List<IPlayingCard>> DownCardGroups { get; set; }
        public Stack<IPlayingCard> DiscardPile { get; private set; }
        public Deck Deck { get; private set; }
        public IOpeningConditionStrategy OpeningConditionStrategy { get; private set; }                
        private IPointEvaluator _pointEvaluator;
        
        public Phase(IOpeningConditionStrategy openingCondition)
        {
            OpeningConditionStrategy = openingCondition;
        }

        public void SetupPointEvaluationLogic(IPointEvaluatorFactory pointEvaluatorFactory, PointEvaluatorType pointEvaluatorType)
        {
            _pointEvaluator = pointEvaluatorFactory.GetPointEvaluator(pointEvaluatorType.ToString());
        }

        // Play the round in turn order
        public void Begin()
        {
            // Has anyone gone out?
            while (!IsFinished())
            {
                foreach (var player in Players)
                {
                    // Play a card
                    var discard = player.TakeTurnAndDiscard(this);

                    DiscardPile.Push(discard);
                    // Add the card to the down card group
                    // DownCardGroups[player.Id].Add(card);
                }
            }
        }

        public bool IsFinished()
        {
            return Players.Any(player => player.Hand.Count == 0);
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
    }
}

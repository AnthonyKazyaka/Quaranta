using CardGameEngine.Cards;
using CardGameEngine.Game.PointEvaluators;
using CardGameEngine.Players;
using Quaranta.GameLogic.PointEvaluators;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Phases
{
    public class Phase : IPhase
    {
        public List<Player> Players { get; private set; }
        public Dictionary<Player, int> ScoreByPlayer { get; }
        public List<List<IPlayingCard>> DownCardGroups { get; set; }
        public IOpeningConditionStrategy OpeningConditionStrategy { get; private set; }
        public PointEvaluatorType PointEvaluatorType { get; set; }
                
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
            while(!IsFinished())
            {
                foreach(var player in Players)
                {
                    // Play a card
                    var card = player.();

                    // Add the card to the down card group
                    DownCardGroups[player.Id].Add(card);
                }
            }

            TabulateScore();

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

        public void SetPlayers(List<Player> players)
        {
            Players = players;
        }
    }
}

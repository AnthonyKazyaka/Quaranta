using CardGameEngine.Cards;
using CardGameEngine.Game.PointEvaluators;
using CardGameEngine.Players;
using Quaranta.GameLogic.PointEvaluators;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;

namespace Quaranta.GameLogic.Phases
{
    public class Phase : IPhase
    {
        public Dictionary<Player, int> ScoreByPlayer { get; }
        public List<List<IPlayingCard>> DownCardGroups { get; set; }
        public IOpeningConditionStrategy OpeningConditionStrategy { get; private set; }

        private readonly IPointEvaluatorFactory _pointEvaluatorFactory;
        
        public Phase(IOpeningConditionStrategy openingCondition, IPointEvaluatorFactory pointEvaluatorFactory)
        {
            OpeningConditionStrategy = openingCondition;

            _pointEvaluatorFactory = pointEvaluatorFactory;
        }

        public void TabulateScore(List<Player> players)
        {
            IPointEvaluator pointEvaluator;
            if(OpeningConditionStrategy.OpeningCondition == OpeningConditionType.AllDown)
            {
                pointEvaluator = _pointEvaluatorFactory.GetPointEvaluator(PointEvaluatorType.AllDown.ToString());
            }
            else
            {
                pointEvaluator = _pointEvaluatorFactory.GetPointEvaluator(PointEvaluatorType.Standard.ToString());
            }

            foreach (var player in players)
            {
                ScoreByPlayer.Add(player, pointEvaluator.EvaluatePoints(player.Hand));
            }
        }
    }
}

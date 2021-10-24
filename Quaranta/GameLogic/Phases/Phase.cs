using CardGameEngine.Game.PointEvaluators;
using CardGameEngine.Players;
using Quaranta.GameLogic.PointEvaluators;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;

namespace Quaranta.GameLogic.Phases
{
    public class Phase : IPhase
    {
        private readonly IPointEvaluatorFactory _pointEvaluatorFactory;
        public Phase(IOpeningConditionStrategy openingCondition, IPointEvaluatorFactory pointEvaluatorFactory)
        {
            OpeningCondition = openingCondition;

            _pointEvaluatorFactory = pointEvaluatorFactory;
        }

        public Dictionary<Player, int> ScoreByPlayer { get; }

        public IOpeningConditionStrategy OpeningCondition { get; private set; }

        public void TabulateScore(List<Player> players)
        {
            IPointEvaluator pointEvaluator;
            if(OpeningCondition.GetType().Name == nameof(AllDownStrategy))
            {
                pointEvaluator = _pointEvaluatorFactory.GetPointEvaluator(nameof(AllDownPointEvaluator));
            }
            else
            {
                pointEvaluator = _pointEvaluatorFactory.GetPointEvaluator(nameof(PointEvaluator));
            }

            foreach (var player in players)
            {
                ScoreByPlayer.Add(player, pointEvaluator.EvaluatePoints(player.Hand));
            }
        }
    }
}

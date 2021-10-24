using CardGameEngine.Cards;
using CardGameEngine.Game.PointEvaluators;
using System.Collections.Generic;

namespace Quaranta.GameLogic.PointEvaluators
{
    public class AllDownPointEvaluator : IPointEvaluator
    {
        public int EvaluatePoints(List<Card> cards)
        {
            if (cards.Count == 0)
            {
                return 0;
            }

            return 100;
        }
    }
}

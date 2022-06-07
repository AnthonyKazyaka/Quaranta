using CardGame.Cards;
using System.Collections.Generic;

namespace Quaranta.GameLogic.PointEvaluators
{
    public class AllDownPointEvaluator : QuarantaPointEvaluator
    {
        public override PointEvaluatorType PointEvaluatorType => PointEvaluatorType.AllDown;
        
        public override int EvaluatePoints(List<IPlayingCard> cards)
        {
            if (cards.Count == 0)
            {
                return 0;
            }

            return 100;
        }
    }
}

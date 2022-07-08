using CardGame.Cards;
using System.Collections.Generic;

namespace CardGame.Game.PointEvaluators
{
    public interface IPointEvaluator
    {
        int EvaluatePoints(List<IPlayingCard> cards);
    }
}

using CardGame.Cards;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.PointEvaluators
{
    public class StandardPointEvaluator : QuarantaPointEvaluator
    {
        public override PointEvaluatorType PointEvaluatorType => PointEvaluatorType.Standard;

        public override int EvaluatePoints(List<IPlayingCard> cards)
        {
            int pointValue = 0;
            var playingCards = cards.Where(x => !(x is Joker));

            int aceCount = playingCards.Count(x => x.Rank == Rank.Ace);
            bool multipleAces = aceCount > 1;

            pointValue += 25 * cards.Count(x => x is Joker);
            pointValue += (multipleAces ? 11 : 1) * aceCount;
            pointValue += 10 * playingCards.Count(x => x.Rank > Rank.Ten);
            pointValue += playingCards.Where(x => x.Rank < Rank.Ten && x.Rank >= Rank.Two).Sum(x => (int)x.Rank);

            return pointValue;
        }
    }
}

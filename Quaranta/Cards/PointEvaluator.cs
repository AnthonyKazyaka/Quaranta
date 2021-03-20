using CardGameEngine.Cards;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.Cards
{
    public class PointEvaluator : IPointEvaluator
    {
        public int EvaluatePoints(List<Card> cards)
        {
			int pointValue = 0;
			var playingCards = cards.Where(x => !(x is Joker)).Cast<IPlayingCard>().ToList();

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

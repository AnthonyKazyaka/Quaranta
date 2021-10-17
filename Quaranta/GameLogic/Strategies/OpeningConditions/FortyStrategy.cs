using CardGameEngine.Cards;
using CardGameEngine.Players;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class FortyStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(Player player, List<List<Card>> cardGroups)
        {
            var areJokersPresent = cardGroups.Any(x => x.IsJokerPresent());
            var doesSumMeetScoreRequirement = cardGroups.Select(x => GetPointValue(x)).Sum() >= 40;
            var enoughCardsInEachGroup = cardGroups.All(x => x.Count() >= 3);

            return !areJokersPresent && doesSumMeetScoreRequirement && enoughCardsInEachGroup;
        }

        private int GetPointValue(List<Card> cards)
        {
            int pointValue = 0;

            var playingCards = cards.Cast<IPlayingCard>().ToList();

            pointValue += 11 * playingCards.Count(x => x.Rank == Rank.Ace);
            pointValue += 10 * playingCards.Count(x => x.Rank > Rank.Ten);
            pointValue += playingCards.Where(x => x.Rank < Rank.Ten && x.Rank >= Rank.Two).Sum(x => (int)x.Rank);

            return pointValue;
        }
    }
}

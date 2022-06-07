using CardGame.Cards;
using CardGame.Players;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class FortyStrategy : IOpeningConditionStrategy
    {
        public OpeningConditionType OpeningCondition => OpeningConditionType.Forty;

        public bool IsOpeningConditionMet(Player player, List<List<IPlayingCard>> cardGroups)
        {
            var areJokersPresent = cardGroups.Any(x => x.IsJokerPresent());
            var doesSumMeetScoreRequirement = cardGroups.Select(x => GetPointValue(x)).Sum() >= 40;
            var enoughCardsInEachGroup = cardGroups.All(x => x.Count() >= 3);

            return !areJokersPresent && doesSumMeetScoreRequirement && enoughCardsInEachGroup;
        }

        private int GetPointValue(List<IPlayingCard> cards)
        {
            int pointValue = 0;

            pointValue += 11 * cards.Count(x => x.Rank == Rank.Ace);
            pointValue += 10 * cards.Count(x => x.Rank > Rank.Ten);
            pointValue += cards.Where(x => x.Rank < Rank.Ten && x.Rank >= Rank.Two).Sum(x => (int)x.Rank);

            return pointValue;
        }
    }
}

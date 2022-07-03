using CardGame.Cards;
using CardGame.Players;
using Quaranta.CardCollections;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class FortyStrategy : IOpeningConditionStrategy
    {
        public OpeningConditionType OpeningCondition => OpeningConditionType.Forty;

        public bool IsOpeningConditionMet(Player player, List<Meld> melds)
        {
            var areJokersPresent = melds.Any(x => x.IsJokerPresent());
            var doesSumMeetScoreRequirement = melds.Select(x => GetMeldPointValue(x)).Sum() >= 40;
            var enoughCardsInEachGroup = melds.All(x => x.Count() >= 3);

            return !areJokersPresent && doesSumMeetScoreRequirement && enoughCardsInEachGroup;
        }

        private int GetMeldPointValue(Meld meld)
        {
            int pointValue = 0;

            pointValue += 11 * meld.Count(x => x.Rank == Rank.Ace);
            pointValue += 10 * meld.Count(x => x.Rank > Rank.Ten);
            pointValue += meld.Where(x => x.Rank < Rank.Ten && x.Rank >= Rank.Two).Sum(x => (int)x.Rank);

            return pointValue;
        }
    }
}

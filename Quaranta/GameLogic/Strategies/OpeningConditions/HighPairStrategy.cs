using CardGame.Cards;
using CardGame.Players;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class HighPairStrategy : IOpeningConditionStrategy
    {
        public OpeningConditionType OpeningCondition => OpeningConditionType.HighPair;

        public bool IsOpeningConditionMet(Player player, List<List<IPlayingCard>> cardGroups)
        {
            var containsCorrectNumberOfGroups = cardGroups.Count == 1;
            var isValidOpeningPair = cardGroups.All(x => !x.IsJokerPresent() && x.IsSetOfSize(2));
            var isHighPair = cardGroups.First().Any(x => x.Rank > Rank.Ten || x.Rank == Rank.Ace);

            return containsCorrectNumberOfGroups && isValidOpeningPair && isHighPair;
        }
    }
}

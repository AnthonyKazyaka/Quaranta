using CardGameEngine.Cards;
using CardGameEngine.Players;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class HighPairStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(Player player, List<List<Card>> cardGroups)
        {
            var containsCorrectNumberOfGroups = cardGroups.Count == 1;
            var isValidOpeningPair = cardGroups.All(x => !x.IsJokerPresent() && x.IsSetOfSize(2));
            var isHighPair = cardGroups.First().Cast<IPlayingCard>().Any(x => x.Rank > Rank.Ten || x.Rank == Rank.Ace);

            return containsCorrectNumberOfGroups && isValidOpeningPair && isHighPair;
        }
    }
}

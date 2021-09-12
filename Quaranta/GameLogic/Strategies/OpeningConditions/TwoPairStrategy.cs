using CardGameEngine.Cards;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class TwoPairStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(List<List<Card>> cardGroupings)
        {
            var containsCorrectNumberOfGroups = cardGroupings.Count == 2;
            var isValidOpeningPair = cardGroupings.All(x => !x.IsJokerPresent() && x.IsSetOfSize(2));
            var containsOneHighPair = cardGroupings.Cast<IPlayingCard>().Any(x => x.Rank > Rank.Ten || x.Rank == Rank.Ace);
            
            return containsCorrectNumberOfGroups && isValidOpeningPair && containsOneHighPair;
        }
    }
}

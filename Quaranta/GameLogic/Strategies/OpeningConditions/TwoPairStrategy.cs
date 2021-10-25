using CardGameEngine.Cards;
using CardGameEngine.Players;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class TwoPairStrategy : IOpeningConditionStrategy
    {
        public OpeningConditionType OpeningCondition => OpeningConditionType.TwoPair;

        public bool IsOpeningConditionMet(Player player, List<List<IPlayingCard>> cardGroups)
        {
            var containsCorrectNumberOfGroups = cardGroups.Count == 2;
            var isValidOpeningPair = cardGroups.All(x => !x.IsJokerPresent() && x.IsSetOfSize(2));
            var containsOneHighPair = cardGroups.Any(x=>x.All(x => x.Rank > Rank.Ten || x.Rank == Rank.Ace));
            
            return containsCorrectNumberOfGroups && isValidOpeningPair && containsOneHighPair;
        }
    }
}

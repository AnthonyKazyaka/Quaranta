using CardGame.Cards;
using CardGame.Players;
using Quaranta.CardCollections;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class TwoPairStrategy : IOpeningConditionStrategy
    {
        public OpeningConditionType OpeningCondition => OpeningConditionType.TwoPair;

        public bool IsOpeningConditionMet(Player player, List<Meld> meldsToOpen)
        {
            var containsCorrectNumberOfGroups = meldsToOpen.Count == 2;
            var isValidOpeningPair = meldsToOpen.All(x => !x.IsJokerPresent() && x.IsSetOfSize(2));
            var containsOneHighPair = meldsToOpen.Any(x=>x.All(x => x.Rank > Rank.Ten || x.Rank == Rank.Ace));
            
            return containsCorrectNumberOfGroups && isValidOpeningPair && containsOneHighPair;
        }
    }
}

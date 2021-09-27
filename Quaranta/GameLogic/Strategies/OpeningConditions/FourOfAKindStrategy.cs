using CardGameEngine.Cards;
using CardGameEngine.Players;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class FourOfAKindStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(Player player, List<List<Card>> cardGroups)
        {
            var containsCorrectNumberOfGroups = cardGroups.Count == 1;
            var isValidOpeningFourOfAKind = cardGroups.All(x => !x.IsJokerPresent() && x.IsSetOfSize(3));

            return containsCorrectNumberOfGroups && isValidOpeningFourOfAKind;
        }
    }
}

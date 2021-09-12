using CardGameEngine.Cards;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class ThreeOfAKindStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(List<List<Card>> cardGroupings)
        {
            var containsCorrectNumberOfGroups = cardGroupings.Count == 1;
            var isValidOpeningThreeOfAKind = cardGroupings.All(x => !x.IsJokerPresent() && x.IsSetOfSize(3));

            return containsCorrectNumberOfGroups && isValidOpeningThreeOfAKind;
        }
    }
}

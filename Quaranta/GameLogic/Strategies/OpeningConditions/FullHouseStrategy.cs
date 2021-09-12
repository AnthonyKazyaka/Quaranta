using CardGameEngine.Cards;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class FullHouseStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(List<List<Card>> cardGroupings)
        {
            var containsCorrectNumberOfGroups = cardGroupings.Count == 2;
            var containsOneOpeningPair = cardGroupings.Count(x => !x.IsJokerPresent() && x.IsSetOfSize(2)) == 1;
            var containsOneOpeningThreeOfAKind = cardGroupings.Count(x => !x.IsJokerPresent() && x.IsSetOfSize(3)) == 1;

            return containsCorrectNumberOfGroups && containsOneOpeningPair && containsOneOpeningThreeOfAKind;
        }
    }
}

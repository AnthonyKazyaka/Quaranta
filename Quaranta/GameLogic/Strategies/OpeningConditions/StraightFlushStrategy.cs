using CardGameEngine.Cards;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class StraightFlushStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(List<List<Card>> cardGroupings)
        {
            var containsCorrectNumberOfGroups = cardGroupings.Count == 1;
            var isValidOpeningStraight = cardGroupings.All(x => !x.IsJokerPresent() && x.IsRunOfSize(5));

            return containsCorrectNumberOfGroups && isValidOpeningStraight;
        }
    }
}

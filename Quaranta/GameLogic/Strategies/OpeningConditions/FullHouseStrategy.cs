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
            if (cardGroupings.Count != 2)
            {
                return false;
            }

            return cardGroupings.Any(x => x.Count == 2)     // && !x.IsJokerPresent())
                && cardGroupings.Any(x => x.Count == 3);    // && !x.IsJokerPresent());
        }
    }
}

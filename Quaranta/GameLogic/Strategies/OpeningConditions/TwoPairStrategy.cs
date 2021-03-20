using CardGameEngine.Collections;
using CardGameEngine.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class TwoPairStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(List<CardGrouping> cardGroupings)
        {
            if(cardGroupings.Count != 2 || cardGroupings.Any(x=>x.Count != 2 || x.IsJokerPresent()))
            {
                return false;
            }

            return cardGroupings.All(x => x.IsUniqueSetOfSize(2));
        }
    }
}

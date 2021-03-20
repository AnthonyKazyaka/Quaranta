using CardGameEngine.Collections;
using CardGameEngine.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class AllDownStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(List<CardGrouping> cardGroupings)
        {
            if(cardGroupings.Sum(x => x.Count) < 12)
            {
                return false;
            }


            // TODO: This just returns true if there are >=13 cards, need to check for valid sets and runs
            return true;
        }
    }
}

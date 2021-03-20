using CardGameEngine.Cards;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class StraightFlushStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(List<List<Card>> cardGroupings)
        {
            var cards = cardGroupings.SingleOrDefault();
            if(cards?.Count != 5) // || cards.IsJokerPresent())
            {
                return false;
            }

            return false;
            //return cards.IsRunOfSize(5);
        }
    }
}

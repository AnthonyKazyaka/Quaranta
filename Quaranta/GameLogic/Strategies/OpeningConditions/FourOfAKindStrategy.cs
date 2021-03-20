using CardGameEngine.Cards;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class FourOfAKindStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(List<List<Card>> cardSets)
        {
            var cards = cardSets.SingleOrDefault();
            if (cards?.Count != 4) // || cards.IsJokerPresent())
            {
                return false;
            }

            return false;
            //return cards.IsUniqueSetOfSize(4);
        }
    }
}

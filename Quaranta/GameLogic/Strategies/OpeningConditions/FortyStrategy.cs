using CardGameEngine.Cards;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class FortyStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(List<List<Card>> cardGroupings)
        {
            //if(cardGroupings.Any(x=>x.IsJokerPresent()))
            //{
            //    return false;
            //}

            return cardGroupings.Select(x => GetPointValue(x)).Sum() >= 40;
        }

        private int GetPointValue(List<Card> cards)
        {
            int pointValue = 0;
            
            pointValue += 11 * cards.Count(x => x.Rank == Rank.Ace);
            pointValue += 10 * cards.Count(x => x.Rank > Rank.Ten);
            pointValue += cards.Where(x => x.Rank < Rank.Ten && x.Rank >= Rank.Two).Sum(x => (int)x.Rank);

            return pointValue;
        }
    }
}

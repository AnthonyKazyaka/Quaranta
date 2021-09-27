using CardGameEngine.Cards;
using CardGameEngine.Players;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class AllDownStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(Player player, List<List<Card>> cardGroups)
        {
            if (cardGroups.Sum(x => x.Count) != player.Hand.Count - 1)
            {
                // If these groups don't account for every card in the player's hand (except for the discard),
                // then this is not a valid opening for All Down.
                return false;
            }

            foreach(var group in cardGroups)
            {
                bool isValidSize = group.Count >= 3;
                bool isRunOrSet = group.IsRun() || group.IsSet();
                bool containsOneOrZeroJokers = group.GetJokerCount() < 2;
                
                if(!isValidSize || !isRunOrSet || !containsOneOrZeroJokers)
                {
                    return false;
                }
            }

            return true;
        }
    }
}

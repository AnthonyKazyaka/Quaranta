using CardGame.Cards;
using CardGame.Players;
using Quaranta.CardCollections;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class StraightFlushStrategy : IOpeningConditionStrategy
    {
        public OpeningConditionType OpeningCondition => OpeningConditionType.StraightFlush;

        public bool IsOpeningConditionMet(Player player, List<Meld> melds)
        {
            var containsCorrectNumberOfGroups = melds.Count == 1;
            var isValidOpeningStraight = melds.All(x => !x.IsJokerPresent() && x.IsRunOfSize(5));

            return containsCorrectNumberOfGroups && isValidOpeningStraight;
        }
    }
}

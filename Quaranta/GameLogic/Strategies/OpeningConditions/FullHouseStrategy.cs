using CardGame.Cards;
using CardGame.Players;
using Quaranta.CardCollections;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class FullHouseStrategy : IOpeningConditionStrategy
    {
        public OpeningConditionType OpeningCondition => OpeningConditionType.FullHouse;

        public bool IsOpeningConditionMet(Player player, List<Meld> melds)
        {
            var containsCorrectNumberOfGroups = melds.Count == 2;
            var containsOneOpeningPair = melds.Count(x => !x.IsJokerPresent() && x.IsSetOfSize(2)) == 1;
            var containsOneOpeningThreeOfAKind = melds.Count(x => !x.IsJokerPresent() && x.IsSetOfSize(3)) == 1;

            return containsCorrectNumberOfGroups && containsOneOpeningPair && containsOneOpeningThreeOfAKind;
        }
    }
}

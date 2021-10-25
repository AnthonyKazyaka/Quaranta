using CardGameEngine.Cards;
using CardGameEngine.Players;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class FullHouseStrategy : IOpeningConditionStrategy
    {
        public OpeningConditionType OpeningCondition => OpeningConditionType.FullHouse;

        public bool IsOpeningConditionMet(Player player, List<List<IPlayingCard>> cardGroups)
        {
            var containsCorrectNumberOfGroups = cardGroups.Count == 2;
            var containsOneOpeningPair = cardGroups.Count(x => !x.IsJokerPresent() && x.IsSetOfSize(2)) == 1;
            var containsOneOpeningThreeOfAKind = cardGroups.Count(x => !x.IsJokerPresent() && x.IsSetOfSize(3)) == 1;

            return containsCorrectNumberOfGroups && containsOneOpeningPair && containsOneOpeningThreeOfAKind;
        }
    }
}

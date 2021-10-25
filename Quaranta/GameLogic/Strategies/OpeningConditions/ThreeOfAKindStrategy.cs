using CardGameEngine.Cards;
using CardGameEngine.Players;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class ThreeOfAKindStrategy : IOpeningConditionStrategy
    {
        public OpeningConditionType OpeningCondition => OpeningConditionType.ThreeOfAKind;

        public bool IsOpeningConditionMet(Player player, List<List<IPlayingCard>> cardGroups)
        {
            var containsCorrectNumberOfGroups = cardGroups.Count == 1;
            var isValidOpeningThreeOfAKind = cardGroups.All(x => !x.IsJokerPresent() && x.IsSetOfSize(3));

            return containsCorrectNumberOfGroups && isValidOpeningThreeOfAKind;
        }
    }
}

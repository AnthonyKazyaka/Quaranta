using CardGameEngine.Cards;
using CardGameEngine.Players;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class FourOfAKindStrategy : IOpeningConditionStrategy
    {
        public OpeningConditionType OpeningCondition => OpeningConditionType.FourOfAKind;
        
        public bool IsOpeningConditionMet(Player player, List<List<IPlayingCard>> cardGroups)
        {
            var containsCorrectNumberOfGroups = cardGroups.Count == 1;
            var isValidOpeningFourOfAKind = cardGroups.All(x => !x.IsJokerPresent() && x.IsSetOfSize(4));

            return containsCorrectNumberOfGroups && isValidOpeningFourOfAKind;
        }
    }
}

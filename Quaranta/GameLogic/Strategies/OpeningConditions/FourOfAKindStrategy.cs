using CardGame.Cards;
using CardGame.Players;
using Quaranta.CardCollections;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class FourOfAKindStrategy : IOpeningConditionStrategy
    {
        public OpeningConditionType OpeningCondition => OpeningConditionType.FourOfAKind;
        
        public bool IsOpeningConditionMet(Player player, List<Meld> melds)
        {
            var containsCorrectNumberOfGroups = melds.Count == 1;
            var isValidOpeningFourOfAKind = melds.All(x => !x.IsJokerPresent() && x.IsSetOfSize(4));

            return containsCorrectNumberOfGroups && isValidOpeningFourOfAKind;
        }
    }
}

using CardGame.Players;
using Quaranta.CardCollections;
using System.Collections.Generic;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public interface IOpeningConditionStrategy
    {
        OpeningConditionType OpeningCondition { get; }
        bool IsOpeningConditionMet(Player player, List<Meld> meldsToOpen);
    }
}

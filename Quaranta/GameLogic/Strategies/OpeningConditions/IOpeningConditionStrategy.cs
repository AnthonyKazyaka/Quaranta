using CardGameEngine.Cards;
using CardGameEngine.Players;
using System.Collections.Generic;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public interface IOpeningConditionStrategy
    {
        OpeningConditionType OpeningCondition { get; }
        bool IsOpeningConditionMet(Player player, List<List<IPlayingCard>> cardSets);
    }
}

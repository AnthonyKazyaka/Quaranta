using CardGame.Cards;
using CardGame.Players;
using System.Collections.Generic;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public interface IOpeningConditionStrategy
    {
        OpeningConditionType OpeningCondition { get; }
        bool IsOpeningConditionMet(Player player, List<List<IPlayingCard>> cardSets);
    }
}

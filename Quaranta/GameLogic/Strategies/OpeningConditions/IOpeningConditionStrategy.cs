using CardGameEngine.Cards;
using System.Collections.Generic;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public interface IOpeningConditionStrategy
    {
        bool IsOpeningConditionMet(List<List<Card>> cardSets);
    }
}

using CardGameEngine.Players;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;

namespace Quaranta.GameLogic.Phases
{
    public interface IPhase
    {
        Dictionary<Player, int> ScoreByPlayer { get; }
        IOpeningConditionStrategy OpeningCondition { get; }
        void TabulateScore(List<Player> players);
    }
}

using CardGameEngine.Players;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;

namespace Quaranta.GameLogic.Phases
{
    public interface IPhase
    {
        Dictionary<Player, int> ScoreByPlayer { get; }
        IOpeningConditionStrategy OpeningConditionStrategy { get; }
        void TabulateScore(List<Player> players);
    }
}

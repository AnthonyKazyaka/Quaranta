using Quaranta.GameLogic.Players;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;

namespace Quaranta.GameLogic.Phases
{
    public interface IPhase
    {
        List<QuarantaPlayer> Players { get; }
        Dictionary<QuarantaPlayer, int> ScoreByPlayer { get; }
        IOpeningConditionStrategy OpeningConditionStrategy { get; }
        void SetPlayers(List<QuarantaPlayer> players);
        void Start();
    }
}

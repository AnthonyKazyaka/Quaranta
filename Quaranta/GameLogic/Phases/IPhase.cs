using CardGameEngine.Players;
using CardGameEngine.Game.PointEvaluators;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;

namespace Quaranta.GameLogic.Phases
{
    public interface IPhase
    {
        List<Player> Players { get; }
        Dictionary<Player, int> ScoreByPlayer { get; }
        IOpeningConditionStrategy OpeningConditionStrategy { get; }
        IPointEvaluator PointEvaluator { get; }
        void SetPlayers(List<Player> players);
        void Begin();
    }
}

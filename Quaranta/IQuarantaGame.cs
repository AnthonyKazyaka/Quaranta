using CardGameEngine.Game;
using Quaranta.GameLogic.Phases;
using Quaranta.GameLogic.Players;
using System.Collections.Generic;

namespace Quaranta
{
    public interface IQuarantaGame : ICardGame
    {
        List<Phase> GetPhases();
        QuarantaPlayer GetDealer();
    }
}

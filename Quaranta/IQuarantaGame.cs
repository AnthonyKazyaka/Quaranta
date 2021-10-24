using CardGameEngine.Game;
using Quaranta.GameLogic.Phases;
using System.Collections.Generic;

namespace Quaranta
{
    public interface IQuarantaGame : ICardGame
    {
        List<Phase> GetPhases();
    }
}

using CardGameEngine.Cards;
using Quaranta;
using Quaranta.GameLogic.Phases;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ConsoleQuaranta.Player
{
    public class ConsoleQuarantaPlayer : QuarantaPlayer
    {
        public override IPlayingCard TakeTurnAndDiscard(Phase currentPhase)
        {
            Console.WriteLine($"{Name}'s turn. Everybody else look away lol");
            Console.WriteLine($"Here is your hand: {string.Join(", ", Hand.Select(x=>x.)}")
            return base.TakeTurnAndDiscard(currentPhase);
        }

    }
}

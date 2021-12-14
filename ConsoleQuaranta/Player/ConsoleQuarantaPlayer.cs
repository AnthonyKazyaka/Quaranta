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
            Console.WriteLine($"Here is your hand: {Hand}");
            Console.WriteLine($"Here are the down card piles: ({string.Join("), (", currentPhase.DownCardGroups.Select(x=>x.ToString()))})");
            return base.TakeTurnAndDiscard(currentPhase);
        }

        protected virtual string ToConsoleString(IEnumerable<IPlayingCard> cards) => string.Join(", ", cards.Select(x => x.ToString()));
    }
}

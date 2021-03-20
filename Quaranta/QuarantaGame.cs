using CardGameEngine;
using CardGameEngine.Collections;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;

namespace Quaranta
{
    public class QuarantaGame : Game
    {

        public QuarantaGame(int numberOfPlayers) : base(numberOfPlayers) { }

        public QuarantaGame(List<Player> players) : base(players) { }

        private Deck GetQuarantaDeck() => Deck.GenerateExtendedDeck();

        protected override List<Phase> GetPhases()
        {
            return new List<Phase>
            {
                new Phase(Players, GetQuarantaDeck(), new HighPairStrategy()),
                new Phase(Players, GetQuarantaDeck(), new TwoPairStrategy()),
                new Phase(Players, GetQuarantaDeck(), new ThreeOfAKindStrategy()),
                new Phase(Players, GetQuarantaDeck(), new FullHouseStrategy()),
                new Phase(Players, GetQuarantaDeck(), new FortyStrategy()),
                new Phase(Players, GetQuarantaDeck(), new FourOfAKindStrategy()),
                new Phase(Players, GetQuarantaDeck(), new StraightFlushStrategy()),
                new Phase(Players, GetQuarantaDeck(), new AllDownStrategy())
            };
        }
    }
}

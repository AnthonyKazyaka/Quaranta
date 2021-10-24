using CardGameEngine.Game.PointEvaluators;
using CardGameEngine.Players;
using Quaranta.GameLogic.Phases;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;

namespace Quaranta
{
    public class QuarantaGame : IQuarantaGame
    {
        public List<Player> Players { get; }
        public List<Phase> Phases { get; }
        private readonly IPointEvaluatorFactory _pointEvaluatorFactory;

        public QuarantaGame(List<Player> players, IPointEvaluatorFactory pointEvaluatorFactory)
        {
            Players = players;
            Phases = GetPhases();

            _pointEvaluatorFactory = pointEvaluatorFactory;            
        }

        //public QuarantaGame(List<IPhases>IPointEvaluator pointEvaluator)
        //{

        //}
        //public QuarantaGame(int numberOfPlayers) : base(numberOfPlayers) { }

        //public QuarantaGame(List<Player> players) : base(players) { }

        //private Deck GetQuarantaDeck() => Deck.GenerateExtendedDeck();

        public void Play()
        {
            foreach(var phase in Phases)
            {
                
            }
        }

        public List<Phase> GetPhases() => new List<Phase>
            {
                new Phase(new HighPairStrategy(), _pointEvaluatorFactory),
                new Phase(new TwoPairStrategy(), _pointEvaluatorFactory),
                new Phase(new ThreeOfAKindStrategy(), _pointEvaluatorFactory),
                new Phase(new FullHouseStrategy(), _pointEvaluatorFactory),
                new Phase(new FortyStrategy(), _pointEvaluatorFactory),
                new Phase(new FourOfAKindStrategy(), _pointEvaluatorFactory),
                new Phase(new FourOfAKindStrategy(), _pointEvaluatorFactory),
                new Phase(new StraightFlushStrategy(), _pointEvaluatorFactory),
                new Phase(new AllDownStrategy(), _pointEvaluatorFactory),
            };
    }
}

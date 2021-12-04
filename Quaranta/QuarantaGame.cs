using CardGameEngine.Game.PointEvaluators;
using CardGameEngine.Players;
using Quaranta.GameLogic.Phases;
using Quaranta.GameLogic.PointEvaluators;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System;
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
            
            SetPlayers();
            SetPointEvaluationLogic();
        }

        public void SetPointEvaluationLogic()
        {
            throw new NotImplementedException();
        }

        public void SetPlayers()
        {
            // TODO: Figure out QuarantaPlayer creation
            throw new NotImplementedException();
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
                // Once phase begins, it's responsible for the card logic until a player goes out
                phase.Begin();

                // Once a player goes out, tabulate score for all players
                phase.TabulateScore();
            }
        }

        public List<Phase> GetPhases() => new List<Phase>
            {
                new Phase(new HighPairStrategy()),
                new Phase(new TwoPairStrategy()),
                new Phase(new ThreeOfAKindStrategy()),
                new Phase(new FullHouseStrategy()),
                new Phase(new FortyStrategy()),
                new Phase(new FourOfAKindStrategy()),
                new Phase(new FourOfAKindStrategy()),
                new Phase(new StraightFlushStrategy()),
                new Phase(new AllDownStrategy()),
            };
    }
}

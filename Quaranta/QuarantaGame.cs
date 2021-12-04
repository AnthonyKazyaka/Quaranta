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
                phase.Begin();
            }
        }

        public List<Phase> GetPhases() => new List<Phase>
            {
                new Phase(new HighPairStrategy(), _pointEvaluatorFactory, PointEvaluatorType.Standard, PointEvaluatorType.Standard),
                new Phase(new TwoPairStrategy(), _pointEvaluatorFactory, PointEvaluatorType.Standard),
                new Phase(new ThreeOfAKindStrategy(), _pointEvaluatorFactory, PointEvaluatorType.Standard),
                new Phase(new FullHouseStrategy(), _pointEvaluatorFactory, PointEvaluatorType.Standard),
                new Phase(new FortyStrategy(), _pointEvaluatorFactory, PointEvaluatorType.Standard),
                new Phase(new FourOfAKindStrategy(), _pointEvaluatorFactory, PointEvaluatorType.Standard),
                new Phase(new FourOfAKindStrategy(), _pointEvaluatorFactory, PointEvaluatorType.Standard),
                new Phase(new StraightFlushStrategy(), _pointEvaluatorFactory, PointEvaluatorType.Standard),
                new Phase(new AllDownStrategy(), _pointEvaluatorFactory, PointEvaluatorType.AllDown),
            };
    }
}

using CardGameEngine.Game.PointEvaluators;
using Quaranta.GameLogic.Phases;
using Quaranta.GameLogic.PointEvaluators;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;

namespace Quaranta
{
    public class QuarantaGame : IQuarantaGame
    {
        public List<QuarantaPlayer> Players { get; }
        public List<Phase> Phases { get; }

        public QuarantaGame(List<QuarantaPlayer> players, IPointEvaluatorFactory pointEvaluatorFactory)
        {
            Players = players;

            Phases = GetPhases();
            foreach (var phase in Phases)
            {
                phase.SetPlayers(players);
                
                var pointEvaluatorType = phase.OpeningConditionStrategy.OpeningCondition != OpeningConditionType.AllDown
                    ? PointEvaluatorType.AllDown 
                    : PointEvaluatorType.Standard;
                phase.SetupPointEvaluationLogic(pointEvaluatorFactory, pointEvaluatorType);
            }
        }

        //public QuarantaGame(List<IPhases>IPointEvaluator pointEvaluator)
        //{

        //}
        //public QuarantaGame(int numberOfPlayers) : base(numberOfPlayers) { }

        //public QuarantaGame(List<Player> players) : base(players) { }

        //private Deck GetQuarantaDeck() => Deck.GenerateExtendedDeck();

        public override void Play()
        {
            foreach (var phase in Phases)
            {
                // Once phase begins, it's responsible for the card logic until a player goes out
                phase.Begin();

                // Once a player goes out, tabulate score for all players
                phase.TabulateScore();
            }
        }

        public virtual List<Phase> GetPhases() => new List<Phase>
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

        protected virtual PointEvaluatorType GetPointEvaluatorType(Phase phase) =>
            phase.OpeningConditionStrategy.OpeningCondition switch
            {
                OpeningConditionType.AllDown => PointEvaluatorType.AllDown,
                _ => PointEvaluatorType.Standard
            };
    }
}

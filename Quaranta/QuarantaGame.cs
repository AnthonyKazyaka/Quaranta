using CardGame.Decks;
using CardGame.Game.PointEvaluators;
using Quaranta.GameLogic.Phases;
using Quaranta.GameLogic.Players;
using Quaranta.GameLogic.PointEvaluators;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;

namespace Quaranta
{
    public class QuarantaGame : IQuarantaGame
    {
        public List<QuarantaPlayer> Players { get; }
        public QuarantaPlayer Dealer => GetDealer();
        public List<Phase> Phases { get; }
        public Phase CurrentPhase { get; private set; }

        private readonly IDeckFactory _deckFactory;

        public QuarantaGame(List<QuarantaPlayer> players, IPointEvaluatorFactory pointEvaluatorFactory, IDeckFactory deckFactory)
        {
            Players = players;
            _deckFactory = deckFactory;
            
            Phases = GetPhases();

            foreach (var phase in Phases)
            {
                phase.SetPlayers(players);
                
                var pointEvaluatorType = phase.OpeningConditionStrategy.OpeningCondition == OpeningConditionType.AllDown
                    ? PointEvaluatorType.AllDown 
                    : PointEvaluatorType.Standard;
                phase.SetupPointEvaluationLogic(pointEvaluatorFactory, pointEvaluatorType);
            }
        }

        public virtual void Play()
        {
            Players.ForEach(p => p.Reset());

            foreach (var phase in Phases)
            {
                CurrentPhase = phase;

                // Once phase begins, it's responsible for the card logic until a player goes out
                phase.Start();

                // Once a player goes out, tabulate score for all players
                phase.TabulateScore();
            }
        }

        public virtual List<Phase> GetPhases() => new()
        {
                new Phase(new HighPairStrategy(), _deckFactory),
                new Phase(new TwoPairStrategy(), _deckFactory),
                new Phase(new ThreeOfAKindStrategy(), _deckFactory),
                new Phase(new FullHouseStrategy(), _deckFactory),
                new Phase(new FortyStrategy(), _deckFactory),
                new Phase(new FourOfAKindStrategy(), _deckFactory),
                new Phase(new StraightFlushStrategy(), _deckFactory),
                new Phase(new AllDownStrategy(), _deckFactory),
            };

        protected virtual PointEvaluatorType GetPointEvaluatorType(Phase phase) =>
            phase.OpeningConditionStrategy.OpeningCondition switch
            {
                OpeningConditionType.AllDown => PointEvaluatorType.AllDown,
                _ => PointEvaluatorType.Standard
            };

        public QuarantaPlayer GetDealer()
        {
            var phaseNumber = Phases.IndexOf(CurrentPhase);
            if (phaseNumber == -1)
            {
                return null;
            }

            return Players[phaseNumber % 4];
        }
    }
}

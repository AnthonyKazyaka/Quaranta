using CardGame.Decks;
using CardGame.Game.PointEvaluators;
using Quaranta;
using Quaranta.GameLogic.Players;

namespace ConsoleQuaranta.Game
{
    public  class ConsoleQuarantaGame : QuarantaGame
    {
        public ConsoleQuarantaGame(List<QuarantaPlayer> players, IPointEvaluatorFactory pointEvaluatorFactory, IDeckFactory deckFactory) : base(players, pointEvaluatorFactory, deckFactory)
        {

        }

        public override void Play()
        {
            Console.WriteLine("Welcome! Let's play a game of Quaranta!");
            Console.WriteLine("How many players?");
            
            var playerCount = 4; // TODO: Replace this with console input
            Console.WriteLine($"{playerCount} players.");
            Console.WriteLine("Setting up game now.");

            // TODO: Setup game here.

            Console.WriteLine("Starting game.");
            base.Play();
        }
    }
}

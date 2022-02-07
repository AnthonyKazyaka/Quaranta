using CardGameEngine.Decks;
using CardGameEngine.Game.PointEvaluators;
using ConsoleQuaranta.Extensions;
using ConsoleQuaranta.Game;
using ConsoleQuaranta.Player;
using Microsoft.Extensions.DependencyInjection;
using Quaranta.GameLogic.Players;
using Quaranta.GameLogic.PointEvaluators;

namespace ConsoleQuaranta
{
    internal class Startup
    {
        internal static void StartConsoleQuaranta()
        {
            var serviceCollection = new ServiceCollection();
            serviceCollection.AddConsoleQuarantaServices();

            var serviceProvider = serviceCollection.BuildServiceProvider();
            var pointEvaluatorFactory = serviceProvider.GetService<IPointEvaluatorFactory>()
                ?? new PointEvaluatorFactory(
                    new List<IPointEvaluator>
                    {
                        new StandardPointEvaluator(),
                        new AllDownPointEvaluator()
                    });

            var players = GetPlayers();

            var deckFactory = serviceProvider.GetService<IDeckFactory>() ?? new DeckFactory(new IDeckGenerator[] { new StandardDeckGenerator(), new ExtendedDeckGenerator() });

            var quarantaGame = new ConsoleQuarantaGame(players, pointEvaluatorFactory, deckFactory);

            if (quarantaGame != null)
            {
                quarantaGame.Play();
            }
        }

        private static List<QuarantaPlayer> GetPlayers() =>
            new()
            {
                new ConsoleQuarantaPlayer("Anthony"),
                new VirtualQuarantaPlayer("Erin"),
                new VirtualQuarantaPlayer("EJ"),
                new VirtualQuarantaPlayer("Eryn")
            };
    }
}

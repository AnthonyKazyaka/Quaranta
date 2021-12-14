using CardGameEngine.Game;
using ConsoleQuaranta.Extensions;
using ConsoleQuaranta.Game;
using Microsoft.Extensions.DependencyInjection;
using Quaranta;
using CardGameEngine.Game.PointEvaluators;
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
            var pointEvaluatorFactory = serviceProvider.GetService<IPointEvaluatorFactory>();

            var quarantaGame = new ConsoleQuarantaGame(
                new List<QuarantaPlayer>
                {

                },
                pointEvaluatorFactory// ?? (IPointEvaluatorFactory)new PointEvaluatorFactory()
            );

            if(quarantaGame != null)
            {
                quarantaGame.Play();
            }
        }

        
    }
}

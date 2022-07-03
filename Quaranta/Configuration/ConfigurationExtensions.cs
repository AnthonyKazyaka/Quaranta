using CardGame.Configuration;
using CardGame.Game.PointEvaluators;
using Microsoft.Extensions.DependencyInjection;
using Quaranta.GameLogic.PointEvaluators;

namespace Quaranta.Configuration
{
    public static class ConfigurationExtensions
    {
        public static void ConfigureQuarantaServices(this IServiceCollection serviceCollection)
        {
            serviceCollection.AddTransient<IPointEvaluator, StandardPointEvaluator>();
            serviceCollection.AddTransient<IPointEvaluator, AllDownPointEvaluator>();
            serviceCollection.AddSingleton<IPointEvaluatorFactory, PointEvaluatorFactory>();

            serviceCollection.ConfigureCardGameDependencies();
        }
    }
}

using CardGameEngine.Configuration;
using CardGameEngine.Game.PointEvaluators;
using Microsoft.Extensions.DependencyInjection;
using Quaranta.GameLogic.PointEvaluators;

namespace Quaranta.Configuration
{
    public static class ConfigurationExtensions
    {
        public static void ConfigureQuarantaServices(this IServiceCollection serviceCollection)
        {
            serviceCollection.AddTransient<IPointEvaluator, PointEvaluator>();
            serviceCollection.AddTransient<IPointEvaluator, AllDownPointEvaluator>();
            serviceCollection.AddSingleton<IPointEvaluatorFactory, PointEvaluatorFactory>();

            serviceCollection.ConfigureCardGameEngineDependencies();
        }
    }
}

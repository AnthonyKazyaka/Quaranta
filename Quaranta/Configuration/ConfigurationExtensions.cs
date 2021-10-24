using CardGameEngine.Cards;
using CardGameEngine.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Quaranta.GameLogic.PointEvaluators;

namespace Quaranta.Configuration
{
    public static class ConfigurationExtensions
    {
        public static void ConfigureQuarantaServices(this IServiceCollection serviceCollection)
        {
            serviceCollection.AddTransient<IPointEvaluator, PointEvaluator>();
            serviceCollection.ConfigureCardGameEngineDependencies();
        }
    }
}

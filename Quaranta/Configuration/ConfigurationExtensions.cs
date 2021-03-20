using CardGameEngine.Cards;
using CardGameEngine.Configuration;
using CardGameEngine.Game;
using Microsoft.Extensions.DependencyInjection;
using Quaranta.Cards;

namespace Quaranta.Configuration
{
    public static class ConfigurationExtensions
    {
        public static void ConfigureQuarantaServices(this IServiceCollection serviceCollection)
        {
            serviceCollection.AddTransient<ICardGame, QuarantaGame>();
            serviceCollection.AddTransient<IPointEvaluator, PointEvaluator>();
            serviceCollection.ConfigureCardGameEngineDependencies();
        }
    }
}

using CardGame.Game;
using ConsoleQuaranta.Game;
using Microsoft.Extensions.DependencyInjection;
using Quaranta.Configuration;

namespace ConsoleQuaranta.Extensions
{
    public static class ConfigurationExtensions
    {
        public static void AddConsoleQuarantaServices(this IServiceCollection services)
        {
            services.ConfigureQuarantaServices();
            services.ConfigureConsoleQuaranta();
        }

        public static void ConfigureConsoleQuaranta(this IServiceCollection services)
        {
            services.AddTransient<ICardGame, ConsoleQuarantaGame>();
        }
    }
}

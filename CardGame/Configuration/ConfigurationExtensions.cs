using CardGame.Decks;
using Microsoft.Extensions.DependencyInjection;

namespace CardGame.Configuration
{
    public static class ConfigurationExtensions
    {
        public static void ConfigureCardGameDependencies(this IServiceCollection serviceCollection)
        {
            serviceCollection.AddTransient<IDeckGenerator, StandardDeckGenerator>();
            serviceCollection.AddTransient<IDeckGenerator, ExtendedDeckGenerator>();
            serviceCollection.AddTransient<IDeckFactory, DeckFactory>();
        }
    }
}

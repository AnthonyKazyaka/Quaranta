using CardGame.Cards;

namespace ConsoleQuaranta.Extensions
{
    public static class CardExtensions
    {
        public static string ToString(this IEnumerable<IPlayingCard> cards) => string.Join(", ", cards.Select(x => x.ToString()));
    }
}

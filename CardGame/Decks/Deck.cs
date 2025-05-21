using CardGame.Cards;
using CardGame.Extensions;

namespace CardGame.Decks
{
    public class Deck
    {
        public List<IPlayingCard> Cards { get; private set; }

        private static Random _random { get; } = new Random();

        public Deck(List<IPlayingCard> cards)
        {
            Cards = cards;
        }

        public void Shuffle()
        {
            Cards.Shuffle();
        }

        public IPlayingCard Draw()
        {
            var card = Cards.First();
            Cards.Remove(card);
            return card;
        }
    }
}

using CardGame.Cards;
using System;
using System.Linq;

namespace CardGame.Decks
{
    public class StandardDeckGenerator : IDeckGenerator
    {
        public DeckType TypeOfDeck => DeckType.Standard;

        public Deck GenerateDeck()
        {
            var suitNames = Enum.GetNames(typeof(Suit));
            var rankNames = Enum.GetNames(typeof(Rank));

            var suits = suitNames.Select(x => (Suit)Enum.Parse(typeof(Suit), x));
            var ranks = rankNames.Select(x => (Rank)Enum.Parse(typeof(Rank), x));

            var cards = suits.Join(ranks, (Suit x) => true, (Rank y) => true, (Suit x, Rank y) => new PlayingCard(x, y)).ToList();

            return new Deck(cards.Cast<IPlayingCard>().ToList());
        }
    }
}

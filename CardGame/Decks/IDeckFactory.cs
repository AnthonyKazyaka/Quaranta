namespace CardGame.Decks
{
    public interface IDeckFactory
    {
        Deck GenerateDeck(DeckType deckType);
    }
}

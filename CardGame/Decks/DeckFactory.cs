using System.Collections.Generic;
using System.Linq;

namespace CardGame.Decks
{
    public class DeckFactory : IDeckFactory
    {
        private List<IDeckGenerator> _deckGenerators;

        public DeckFactory(IEnumerable<IDeckGenerator> deckGenerators)
        {
            _deckGenerators = deckGenerators.ToList();
        }

        public Deck GenerateDeck(DeckType deckType)
        {
            var specifiedDeckTypeGenerator = _deckGenerators.FirstOrDefault(x => x.TypeOfDeck == deckType);
            if(specifiedDeckTypeGenerator != null)
            {
                return specifiedDeckTypeGenerator.GenerateDeck();
            }

            return null;
        }
    }
}

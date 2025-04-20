using CardGame.Cards;
using System;
using System.Collections.Generic;

namespace Quaranta.CardCollections
{
    // Source: https://en.wikipedia.org/wiki/Meld_(cards)
    public class Meld : List<IPlayingCard>
    {
        public Guid Id { get; private set; }

        public Meld()
        {
            Id = Guid.NewGuid();
        }

        public Meld(IEnumerable<IPlayingCard> cards)
        {
            Id = Guid.NewGuid();
            AddRange(cards);
        }
    }
}
using CardGameEngine.Cards;
using CardGameEngine.Players;
using System;

namespace Quaranta
{
    public class QuarantaPlayer : Player
    {
        public Guid PlayerId { get; } = Guid.NewGuid();

        public void TakeTurn()
        {
            // Player should draw a card, either from the discard pile or from the deck.
            // Player should, if possible, select a card (or set of cards) from their hand to open or play on other groups.
            // Player should select a card from their hand to discard.

            // TODO: Card selected by player somehow            
            // var validCardsToPlay = GET CARDS FROM PLAYER HAND TO PLAY
            // TODO: Play selected cards somehow
            // var discard = GET CARD FROM PLAYER HAND TO DISCARD
        }

        private void PlayCards(IPlayingCard card)
        {
            // TODO: Place card on a down group
        }

        //private void 
    }
}

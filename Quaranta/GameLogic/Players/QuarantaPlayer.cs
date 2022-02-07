using CardGameEngine.Cards;
using CardGameEngine.Players;
using Quaranta.GameLogic.Phases;
using System;
using System.Collections.Generic;

namespace Quaranta.GameLogic.Players
{
    public abstract class QuarantaPlayer : Player
    {
        public Guid PlayerId { get; } = Guid.NewGuid();
        public bool IsOpen { get; set; } = false;

        public QuarantaPlayer(string name) : base(name)
        {
        }

        public virtual IPlayingCard TakeTurnAndDiscard(Phase currentPhase)
        {
            // Player should draw a card, either from the discard pile or from the deck.
            // Player should, if possible, select a card (or set of cards) from their hand to open, play as a new card group, or play on other groups.
            // Player should select a card from their hand to discard.

            // TODO: Card selected by player somehow            
            // var validCardsToPlay = GET CARDS FROM PLAYER HAND TO PLAY
            // TODO: Play selected cards somehow
            // var discard = GET CARD FROM PLAYER HAND TO DISCARD

            // =====================================================


            // If player is not already open, can Player open with any cards in their hand?
            // if(!IsOpen && CanOpen())) // TODO: Implement opening card selection and game condition logic
            // {
            // Play opening cards
            // PlayCards();
            // return ChooseDiscard();
            // }
            // else
            // {
            // 



            return ChooseDiscard();
        }

        // Maybe if no target down card group (pile?) is provided, new group is created
        protected virtual void PlayCard(IPlayingCard card)//, TargetPile pile (?)
        {
            // TODO: Place card on a down group or create new down group
        }

        protected virtual void PlayCards(List<IPlayingCard> cards)//, TargetPile pile (?)
            => cards.ForEach(PlayCard);

        protected abstract IPlayingCard ChooseDiscard();

        protected abstract void PickupCard();
    }
}

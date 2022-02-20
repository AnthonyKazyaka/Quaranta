using CardGameEngine.Cards;
using CardGameEngine.Players;
using Quaranta.GameLogic.Phases;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Players
{
    public abstract class QuarantaPlayer : Player
    {
        public bool IsOpen { get; set; } = false;

        protected IPlayingCard _lastPickup = null;
        protected Phase _currentPhase { get; set; }

        public QuarantaPlayer(string name) : base(name)
        {
        }

        public virtual IPlayingCard TakeTurnAndDiscard(Phase currentPhase)
        {
            _currentPhase = currentPhase;

            // Player should draw a card, either from the discard pile or from the deck.
            // Player should, if possible, select a card (or set of cards) from their hand to open, play as a new card group, or play on other groups.
            // Player should select a card from their hand to discard.

            PickupCard();  

            if (IsOpen)
            {
                do
                {
                    // Play cards
                    //// You have to choose all of your down card groups before choosing cards to play on other card groups
                    //// It would be nice to not be so rigid; players could set a few cards down, play a card on somebody else's down cards,
                    //// and then set another group on the table. Otherwise it's a little rigid and unfriendly to players.
                    var cardsToPlay = GetCardGroupsToPlay();
                    PlayCardsOnTable(cardsToPlay);

                    //var cardGroupsToPlayOnTargetPiles = GetCardsToPlayOnDownCardGroups();
                    //foreach(var cardGroupToPlayOnTargetPile in cardGroupsToPlayOnTargetPiles)
                    //{
                    //    PlayCardsOnTable(cardGroupToPlayOnTargetPile.cardsToPlay, cardGroupToPlayOnTargetPile.targetPile);
                    //}
                }
                while (!IsFinishedSelectingCards());

            }
            else
            {
                do
                {
                    var openingCards = GetCardGroupsToPlay();
                    if (openingCards != null && openingCards.Any() && _currentPhase.CanOpen(this, openingCards))
                    {
                        PlayCardsOnTable(openingCards);
                        IsOpen = true;
                        break;
                    }
                    else
                    {
                        if (openingCards.Any())
                        {
                            Console.WriteLine("You can't open with those cards. Would you like to try selecting others? (Y/N)");
                            if (Console.ReadLine()?.ToUpper() != "Y")
                            {
                                break;
                            }
                        }
                        else break;
                    }
                }
                while (!IsFinishedSelectingCards());
            }

            while(true)
            {
                var chosenCard = ChooseDiscard();
                if (currentPhase.IsDiscardValid(chosenCard))
                {
                    var selectedCard = Hand.SelectCard(chosenCard);
                    Hand.Remove(selectedCard);
                    return selectedCard;
                }

                Console.WriteLine("That card can't be discarded at this time. Please select another card.");
            }
        }

        protected abstract IPlayingCard ChooseDiscard();

        protected abstract bool ShouldPickupFromDeck();

        protected virtual void PickupCardFromDeck()
        {
            var topCard = _currentPhase.Deck.Cards.First();
            Hand.Add(topCard);
            _currentPhase.Deck.Cards.RemoveAt(0);

            _lastPickup = topCard;
        }

        protected virtual void PickupCardFromDiscardPile()
        {
            var topCard = _currentPhase.DiscardPile.Pop();
            Hand.Add(topCard);

            _lastPickup = topCard;
        }

        protected virtual void PickupCard()
        {
            if(ShouldPickupFromDeck())
            {
                PickupCardFromDeck();
            }
            else
            {
                PickupCardFromDiscardPile();
            }
        }

        protected virtual List<List<IPlayingCard>> GetCardGroupsToPlay()
        {
            var cardGroups = new List<List<IPlayingCard>>();
            do
            {
                if (ShouldPlayCardsOnTable())
                {
                    cardGroups.Add(GetCardsToPlay());
                }
                else break;
            }
            while (!IsFinishedSelectingCards());

            return cardGroups;
        }

        protected abstract List<IPlayingCard> GetCardsToPlay();

        protected abstract bool IsFinishedSelectingCards();

        protected abstract bool ShouldPlayCardsOnTable();

        protected void PlayCardsOnTable(List<IPlayingCard> cardsToPlay, List<IPlayingCard> targetPile)
        {
            targetPile.AddRange(cardsToPlay);
            targetPile = targetPile.OrderBy(x => x.Rank).ThenBy(x => x.Suit).ToList();

            foreach (var card in cardsToPlay)
            {
                var cardInHand = Hand.SelectCard(card);
                Hand.Remove(cardInHand);
            }
        }

        protected void PlayCardsOnTable(List<List<IPlayingCard>> cardGroupsToPlay)
        {
            foreach (var cardGroup in cardGroupsToPlay)
            {
                _currentPhase.DownCardGroups.Add(cardGroup);
                
                foreach(var card in cardGroup)
                {
                    var cardInHand = Hand.SelectCard(card);
                    Hand.Remove(cardInHand);
                }
            }
        }

        protected abstract List<(List<IPlayingCard> cardsToPlay, List<IPlayingCard> targetPile)> GetCardsToPlayOnDownCardGroups();
    }
}

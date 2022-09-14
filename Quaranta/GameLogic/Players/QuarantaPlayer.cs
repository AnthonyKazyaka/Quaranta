using CardGame.Cards;
using CardGame.Players;
using Quaranta.CardCollections;
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

        public void Reset()
        {
            IsOpen = false;
            Hand = new List<IPlayingCard>();
            Score = 0;
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
                    var meldsToPlay = GetNewMeldsToPlay();
                    
                    if(meldsToPlay.All(x => x.Count >= 3) && meldsToPlay.All(x => x.IsRun() || x.IsSet()))
                    {
                        PlayCardsOnTable(meldsToPlay);
                    }
                    else
                    {
                        Console.WriteLine($"Sorry, those cards aren't playable.");
                    }

                    // Ask the player if they want to add cards to any of the melds on the table.
                    (Meld targetMeld, List<IPlayingCard> cardsToAdd) = GetCardsToAddToMeldOnTable();
                    foreach(var card in cardsToAdd)
                    {
                        targetMeld.Add(card);
                    }
                }
                while (!IsFinishedSelectingCards());
            }
            else
            {
                do
                {
                    var openingMelds = GetNewMeldsToPlay();
                    if (openingMelds != null && openingMelds.Any() && _currentPhase.CanOpen(this, openingMelds))
                    {
                        PlayCardsOnTable(openingMelds);
                        IsOpen = true;
                        break;
                    }
                    else
                    {
                        if (openingMelds.Any())
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

        protected abstract (Meld targetMeld, List<IPlayingCard> cardsToAdd) GetCardsToAddToMeldOnTable();

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

        protected virtual List<Meld> GetNewMeldsToPlay()
        {
            var cardGroups = new List<Meld>();
            do
            {
                if (ShouldPlayCardsOnTable())
                {
                    cardGroups.Add(GetMeldToPlay());
                }
                else break;
            }
            while (!IsFinishedSelectingCards());

            return cardGroups;
        }

        protected abstract Meld GetMeldToPlay();

        protected abstract bool IsFinishedSelectingCards();

        protected abstract bool ShouldPlayCardsOnTable();

        protected void AddCardsToPlayedMeld(List<IPlayingCard> cardsToAdd, Meld targetMeld)
        {
            targetMeld.AddRange(cardsToAdd);
            targetMeld = new Meld(targetMeld.OrderBy(x => x.Rank).ThenBy(x => x.Suit).ToList()); // No not this? (7/7/22 - when was this comment added? Is it still valid?)

            foreach (var card in cardsToAdd)
            {
                var cardInHand = Hand.SelectCard(card);
                Hand.Remove(cardInHand);
            }
        }

        protected Meld GetCardsToAddToMeld()
        {
            // Choose card(s) to play on the selected meld
            return GetMeldToPlay();
        }

        protected abstract Meld GetTargetMeld();
        
        protected void PlayCardsOnTable(List<Meld> meldsToPlay)
        {
            foreach (var meld in meldsToPlay)
            {
                _currentPhase.PlayedMelds.Add(meld);
                
                foreach(var card in meld)
                {
                    var cardInHand = Hand.SelectCard(card);
                    Hand.Remove(cardInHand);
                }
            }
        }
    }
}

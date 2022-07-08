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
                    var cardsToPlay = GetMeldsToPlay();
                    
                    if(cardsToPlay.All(x => x.Count >= 3) && cardsToPlay.All(x => x.IsRun() || x.IsSet()))
                    {
                        PlayCardsOnTable(cardsToPlay);
                    }
                    else
                    {
                        Console.WriteLine($"Sorry, those cards aren't playable.");
                    }
                }
                while (!IsFinishedSelectingCards());

            }
            else
            {
                do
                {
                    var openingMelds = GetMeldsToPlay();
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

        protected virtual List<Meld> GetMeldsToPlay()
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

        protected void AddMeldToPlayedMeld(Meld meldToPlay, Meld targetMeld)
        {
            targetMeld.AddRange(meldToPlay);
            targetMeld = new Meld(targetMeld.OrderBy(x => x.Rank).ThenBy(x => x.Suit).ToList()); // No not this

            foreach (var card in meldToPlay)
            {
                var cardInHand = Hand.SelectCard(card);
                Hand.Remove(cardInHand);
            }
        }

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

        protected abstract List<(Meld meldToAdd, Meld targetMeld)> GetMeldsToPlayOnPlayedMelds();
    }
}

using System.Text.RegularExpressions;
using CardGame.Cards;
using Quaranta.CardCollections;
using Quaranta.GameLogic.Phases;
using Quaranta.GameLogic.Players;

namespace ConsoleQuaranta.Player
{
    public class ConsoleQuarantaPlayer : QuarantaPlayer
    {
        public ConsoleQuarantaPlayer(string name) : base(name)
        {
        }

        public override IPlayingCard TakeTurnAndDiscard(Phase currentPhase)
        {
            WriteConsole("Input your discard. Max of 2 numbers (10) and min of 1 (also J,Q,K,A).");
            WriteConsole("Suits are [H]earts, [D]iamonds, [S]pades, [C]lubs (i.e. H,D,S,C). J* is used for Jokers.");
            WriteConsole("Examples: H7 is parsed as a 7 of Hearts, 8C is the 8 of Clubs, SA is the Ace of Spades (but so is AS), etc.)");
            WriteConsole($"Your current hand: {ToConsoleString(Hand)}");
            WriteConsole();

            return base.TakeTurnAndDiscard(currentPhase);
        }

        protected override void PickupCard()
        {
            base.PickupCard();
            WriteConsole($"{Name} picked up a {_lastPickup}");
        }

        protected virtual string ToConsoleString(IEnumerable<IPlayingCard> cards) => string.Join(", ", cards.ToList().Select(x => x.ToString()));
        
        protected IPlayingCard GetCardFromConsoleInput()
        {
            while (true)
            {
                try
                {
                    string? input = WriteThenReadConsole($"Current down card piles:({string.Join("), (", _currentPhase.PlayedMelds.Select(x => $"[{x.Id}] {ToConsoleString(x)}"))})");

                    return IPlayingCard.FromString(input);
                }
                catch (ArgumentOutOfRangeException)
                {
                    WriteConsole("That is not a valid input, please try again.");
                    WriteConsole();
                    continue;
                }
            }
        }

        protected override IPlayingCard ChooseDiscard()
        {
            while(true)
            {
                WriteConsole($"Choose a discard from your hand: {ToConsoleString(Hand)}");
                var chosenCard = GetCardFromConsoleInput();

                // Check if the card is in the hand
                try
                {
                    return Hand.SelectCard(chosenCard);
                }
                catch
                {
                    WriteConsole("That card isn't in your hand. Please select another card.");
                }
            }            
        }

        protected override bool ShouldPickupFromDeck()
        {
            WriteConsole($"Top card of discard pile: {_currentPhase.DiscardPile.Peek()}");
            return WriteThenReadConsole("Do you want to pick up from the Deck? ('Y' to pick up from the deck. 'N' to pick up from the discard pile.)") == "Y";
        }

        protected override Meld GetMeldToPlay()
        {
            // Format: (7H, 7S, 7C)  # comma-separated cards, group by parentheses
            var cardValueTexts = WriteThenReadConsole("Select a group of cards to play (comma-separated list e.g. '7H, 7D, 7C')")?.Split(",").Select(x => x.Trim());
            if(cardValueTexts == null)
            {
                return new Meld();
            }

            var cardValues = cardValueTexts.Select(IPlayingCard.FromString).ToList();
            var joker = cardValues.OfType<Joker>().FirstOrDefault();
            if(joker != null)
            {
                string? jokerValueText = WriteThenReadConsole("What value should the joker represent?");
                if (jokerValueText != null)
                {
                    IPlayingCard representedValue = IPlayingCard.FromString(jokerValueText);
                    joker.SetValue(representedValue.Suit, representedValue.Rank);
                }
            }

            Meld meld = new(cardValues.Select(x => Hand.SelectCard(x)));
            return meld;
        }

        protected override bool ShouldPlayCardsOnTable()
        {
            return WriteThenReadConsole("Do you have any cards you'd like to play on the table? (Y/N)") == "Y";
        }

        protected override bool IsFinishedSelectingCards()
        {
            return WriteThenReadConsole("Are you finished with your selection? (Y/N)") == "Y";
        }

        protected override (Meld targetMeld, List<IPlayingCard> cardsToAdd) GetCardsToAddToMeldOnTable()
        {
            // Format: (7H, 7S, 7C)  # comma-separated cards, group by parentheses
            var cardValueTexts = WriteThenReadConsole("Select a group of cards to play (comma-separated list e.g. '7H, 7D, 7C')")?.Split(",").Select(x => x.Trim());
            if (cardValueTexts == null)
            {
                return (new Meld(), new List<IPlayingCard>());
            }

            var cardValues = cardValueTexts.Select(IPlayingCard.FromString).ToList();
            var joker = cardValues.OfType<Joker>().FirstOrDefault();
            if (joker != null)
            {
                string? jokerValueText = WriteThenReadConsole("What value should the joker represent?");
                if (jokerValueText != null)
                {
                    IPlayingCard representedValue = IPlayingCard.FromString(jokerValueText);
                    joker.SetValue(representedValue.Suit, representedValue.Rank);
                }
            }

            var cardsToPlay = cardValues.Select(x => Hand.SelectCard(x)).ToList();

            // Format: (7H, 7S, 7C)  # comma-separated cards, group by parentheses
            var targetMeldText = WriteThenReadConsole("Select a meld to add the cards to (comma-separated list e.g. '7H, 7D, 7C')")?.Split(",").Select(x => x.Trim());
            if (targetMeldText == null)
            {
                return (new Meld(), new List<IPlayingCard>());
            }

            var targetMeldValues = targetMeldText.Select(IPlayingCard.FromString).ToList();
            var targetMeld = _currentPhase.PlayedMelds.FirstOrDefault(x => x.Select(y => y.ToString()).SequenceEqual(targetMeldValues.Select(y => y.ToString())));
            if(targetMeld == null)
            {
                return (new Meld(), new List<IPlayingCard>());
            }

            return (targetMeld, cardsToPlay);
        }

        protected string? WriteThenReadConsole(string message)
        {
            WriteConsole(message);

            return ReadConsole();
        }

        protected void WriteConsole()
            => WriteConsole(string.Empty);

        protected void WriteConsole(string message)
            => Console.WriteLine(message);

        protected string? ReadConsole()
            => Console.ReadLine()?.Trim().ToUpper();

        protected override Meld? GetTargetMeld()
        {
            WriteConsole($"Select a meld to target: ({string.Join("), (", _currentPhase.PlayedMelds.Select((Meld x, int i) => $"[{i}] {ToConsoleString(x)}"))})");
            string? input = WriteThenReadConsole("Enter the ID of the meld you'd like to target (e.g. '1' for the first meld, '2' for the second meld, etc.)");
            if (input == null)
            {
                return new Meld();
            }

            // Parse the input as an index of the displayed melds.
            if (int.TryParse(input, out int index))
            {
                return _currentPhase.PlayedMelds[index - 1];
            }

            return null;
        }

        private void DisplayPlayedMelds()
        {
            WriteConsole("Played melds:");
            foreach (var meld in _currentPhase.PlayedMelds)
            {
                WriteConsole($"[{meld.Id}] {ToConsoleString(meld)}");
            }
        }
    }
}

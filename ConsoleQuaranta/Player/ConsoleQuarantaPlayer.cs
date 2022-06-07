using System.Text.RegularExpressions;
using CardGame.Cards;
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
                    string? input = WriteReadConsole($"Current down card piles: ({string.Join("), (", _currentPhase.DownCardGroups.Select(x => ToConsoleString(x)))})");

                    return ParseCard(input);
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
            return WriteReadConsole("Do you want to pick up from the Deck? ('Y' to pick up from the deck. 'N' to pick up from the discard pile.)") == "Y";
        }

        protected override List<IPlayingCard> GetCardsToPlay()
        {
            // Format: (7H, 7S, 7C)  # comma-separated cards, group by parentheses
            var cardValueTexts = WriteReadConsole("Select a group of cards to play (comma-separated list e.g. '7H, 7D, 7C')")?.Split(",").Select(x => x.Trim());
            if(cardValueTexts == null)
            {
                return new List<IPlayingCard>();
            }

            var cardValues = cardValueTexts.Select(IPlayingCard.FromString).ToList();
            List<IPlayingCard> cardsInHand = cardValues.Select(x => Hand.SelectCard(x)).ToList();

            return cardsInHand;
        }

        protected override bool ShouldPlayCardsOnTable()
        {
            return WriteReadConsole("Do you have any cards you'd like to play on the table? (Y/N)") == "Y";
        }

        protected override bool IsFinishedSelectingCards()
        {
            return WriteReadConsole("Are you finished with your selection? (Y/N)") == "Y";
        }

        protected override List<(List<IPlayingCard> cardsToPlay, List<IPlayingCard> targetPile)> GetCardsToPlayOnDownCardGroups()
        {
            
            throw new NotImplementedException();
        }

        protected string? WriteReadConsole(string message)
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
    }
}

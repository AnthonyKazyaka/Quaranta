using System.Text.RegularExpressions;
using CardGameEngine.Cards;
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
            Console.WriteLine($"{Name}'s turn. Everybody else look away lol");
            Console.WriteLine($"Your current hand: {ToConsoleString(Hand)}");
            Console.WriteLine($"Current down card piles: ({string.Join("), (", currentPhase.DownCardGroups.Select(x => ToConsoleString(x)))})");

            return base.TakeTurnAndDiscard(currentPhase);
        }

        protected virtual string ToConsoleString(IEnumerable<IPlayingCard> cards) => string.Join(", ", cards.ToList().Select(x => x.ToString()));

        private IPlayingCard GetCardFromConsoleInput()
        {
            Console.WriteLine("Input your discard. Max of 2 numbers (10) and min of 1 (also J,Q,K,A).");
            Console.WriteLine("Suits are [H]earts, [D]iamonds, [S]pades, [C]lubs (i.e. H,D,S,C). J* is used for Jokers.");
            Console.WriteLine("Examples: H7 is parsed as a 7 of Hearts, 8C is the 8 of Clubs, SA is the Ace of Spades (but so is AS), etc.)");

            while (true)
            {
                try
                {
                    string? input = GetTrimmedInput(GetConsoleInput());

                    if (string.IsNullOrWhiteSpace(input) || input.Length < 2 || input.Length > 3)
                    {
                        throw new ArgumentOutOfRangeException();
                    }

                    if(input.Equals("J*"))
                    {
                        return new Joker();
                    }

                    Suit suit = GetSuitFromInputString(input);
                    Rank rank = GetRankFromInputString(input);

                    return new PlayingCard(suit, rank);
                }
                catch (ArgumentOutOfRangeException)
                {
                    Console.WriteLine("That is not a valid input, please try again.");
                    continue;
                }
            }
        }

        //Find the number in the input string and return it as a rank between 1 and 10
        private Rank GetRankFromInputString(string input)
        {
            var match = Regex.Match(input, "\\d+");
            if (match.Success)
            {
                return (Rank)int.Parse(match.Value);
            }

            var highCardValue = Regex.Match(input, "[JQKA]");

            return highCardValue.Value switch
            {
                "A" => Rank.Ace,
                "K" => Rank.King,
                "Q" => Rank.Queen,
                "J" => Rank.Jack,
                _ => throw new NotImplementedException()
            };
        }

        private Suit GetSuitFromInputString(string input)
        {
            var match = Regex.Match(input, "[HDSC]");
            if (match.Success)
            {
                return match.Value switch
                {
                    "H" => Suit.Hearts,
                    "D" => Suit.Diamonds,
                    "C" => Suit.Spades,
                    "S" => Suit.Clubs,
                    _ => throw new NotImplementedException()
                };
            }

            throw new ArgumentOutOfRangeException();
        }

        private string GetConsoleInput() => Console.ReadLine()?.ToUpper() ?? string.Empty;

        private string GetTrimmedInput(string input) => (input ?? string.Empty).Trim().Replace(" ", string.Empty);

        protected override IPlayingCard ChooseDiscard()
        {
            while(true)
            {
                var chosenCard = GetCardFromConsoleInput();

                // Check if the card is in the hand
                if (chosenCard != null && Hand.Contains(chosenCard))
                {
                    Hand.Remove(chosenCard);
                    return chosenCard;
                }
            }            
        }

        protected override void PickupCard()
        {
            throw new NotImplementedException();
        }
    }
}

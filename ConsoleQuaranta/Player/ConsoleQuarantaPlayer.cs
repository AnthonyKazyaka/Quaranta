using System.Text.RegularExpressions;
using CardGameEngine.Cards;
using Quaranta.GameLogic.Phases;
using Quaranta.GameLogic.Players;

namespace ConsoleQuaranta.Player
{
    public class ConsoleQuarantaPlayer : QuarantaPlayer
    {
        private Phase _phase; // It's helpful to keep this

        public ConsoleQuarantaPlayer(string name) : base(name)
        {
        }

        public override IPlayingCard TakeTurnAndDiscard(Phase currentPhase)
        {
            _phase = currentPhase;

            Console.WriteLine("Input your discard. Max of 2 numbers (10) and min of 1 (also J,Q,K,A).");
            Console.WriteLine("Suits are [H]earts, [D]iamonds, [S]pades, [C]lubs (i.e. H,D,S,C). J* is used for Jokers.");
            Console.WriteLine("Examples: H7 is parsed as a 7 of Hearts, 8C is the 8 of Clubs, SA is the Ace of Spades (but so is AS), etc.)");
            Console.WriteLine();

            return base.TakeTurnAndDiscard(currentPhase);
        }

        protected virtual string ToConsoleString(IEnumerable<IPlayingCard> cards) => string.Join(", ", cards.ToList().Select(x => x.ToString()));

        protected IPlayingCard GetCardFromConsoleInput()
        {
            while (true)
            {
                try
                {
                    Console.WriteLine($"Current down card piles: ({string.Join("), (", _phase.DownCardGroups.Select(x => ToConsoleString(x)))})");
                    Console.WriteLine($"Your current hand: {ToConsoleString(Hand)}");
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
                    Console.WriteLine(Environment.NewLine);
                    continue;
                }
            }
        }

        //Find the number in the input string and return it as a rank between 1 and 10
        protected Rank GetRankFromInputString(string input)
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

        protected Suit GetSuitFromInputString(string input)
        {
            var match = Regex.Match(input, "[HDSC]");
            if (match.Success)
            {
                return match.Value switch
                {
                    "H" => Suit.Hearts,
                    "D" => Suit.Diamonds,
                    "C" => Suit.Clubs,
                    "S" => Suit.Spades,
                    _ => throw new NotImplementedException()
                };
            }

            throw new ArgumentOutOfRangeException();
        }

        protected string GetConsoleInput() => Console.ReadLine()?.ToUpper() ?? string.Empty;

        protected string GetTrimmedInput(string input) => (input ?? string.Empty).Trim().Replace(" ", string.Empty);

        protected override IPlayingCard ChooseDiscard()
        {
            while(true)
            {
                var chosenCard = GetCardFromConsoleInput();

                // Check if the card is in the hand
                var matchingCardFromHand = Hand.FirstOrDefault(x => (x is Joker && chosenCard is Joker) || (x.Rank == chosenCard.Rank && x.Suit == chosenCard.Suit));
                if (matchingCardFromHand != null)
                {
                    return chosenCard;
                }

                Console.WriteLine("That card isn't in your hand. Please select another card.");
            }            
        }

        protected override void PickupCard()
        {
            throw new NotImplementedException();
        }
    }
}

namespace CardGame.Cards
{
    public interface IPlayingCard
    {
        Suit Suit { get; }
        Rank Rank { get; }
        void SetValue(Suit suit, Rank rank);
        
        static IPlayingCard FromString(string value)
        {
            IPlayingCard playingCard;
            switch(value)
            {
                case "J" : 
                case "J*" : playingCard = new Joker();
                    break;
                // Any other string with a length of 2 or 3 should be attempted to be parsed 
                case string s when s.Length == 2  || s.Length == 3 : 
                    var suitAndRank = GetSuitAndRank(s);
                    playingCard = new PlayingCard(suitAndRank.Item1, suitAndRank.Item2);
                    break;
                default: throw new ArgumentException("Invalid card value");
            }

            return playingCard;
        }

        static (Suit suit, Rank rank) GetSuitAndRank(string value)
        {
            // TODO: Make this method better
            var suitValue = value.Last().ToString().ToUpper();
            var rankValue = value.Substring(0, value.Length - 1);

            // Get suit from character representation in the string
            var suit = suitValue switch{
                "H" => Suit.Hearts,
                "D" => Suit.Diamonds,
                "S" => Suit.Spades,
                "C" => Suit.Clubs,
                _ => throw new ArgumentOutOfRangeException(nameof(suitValue), suitValue, "Invalid suit")
            };

            // Get rank from string representation
            var rank = rankValue switch
            {
                "A" => Rank.Ace,
                "J" => Rank.Jack,
                "Q" => Rank.Queen,
                "K" => Rank.King,
                // if value is 2 through 10, its rank is a number
                _ => (Rank)int.Parse(rankValue)
            };

            return (suit, rank);
        }
    }
}

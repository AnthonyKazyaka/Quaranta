namespace CardGame.Cards
{
    public class PlayingCard : IPlayingCard
    {
        public Suit Suit { get; private set; }
        public Rank Rank { get; private set; }

        public PlayingCard(Suit suit, Rank rank)
        {
            SetValue(suit, rank);
        }

        public void SetValue(Suit suit, Rank rank)
        {
            Suit = suit;
            Rank = rank;
        }

        public override bool Equals(object? obj)
        {
            if (obj is PlayingCard card)
            {
                return card.Suit == Suit && card.Rank == Rank;
            }
            
            return base.Equals(obj);
        }

        public override string ToString()
        {
            var suitRepresentation = Suit.ToString().First();
            var rankRepresentation = (Rank == Rank.Ace || Rank > Rank.Ten) ? Rank.ToString().First().ToString() : ((int)Rank).ToString();

            return $"{rankRepresentation}{suitRepresentation}";
        }
    }
}

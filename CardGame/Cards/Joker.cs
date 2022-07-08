namespace CardGame.Cards
{
    public class Joker : IPlayingCard
    {
        public PlayingCard RepresentedCard { get; private set; }

        public Suit Suit => RepresentedCard.Suit;

        public Rank Rank => RepresentedCard.Rank;

        public void SetValue(Suit suit, Rank rank)
        {
            RepresentedCard = new PlayingCard(suit, rank);
        }

        public override bool Equals(object? obj)
        {
            if (obj is Joker joker)
            {
                return true;
            }
            else if(obj is PlayingCard card)
            {
                return card.Equals(RepresentedCard);
            }

            return base.Equals(obj);
        }

        public override string ToString()
        {
            return "J*";
        }
    }
}

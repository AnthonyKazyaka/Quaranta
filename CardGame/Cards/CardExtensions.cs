namespace CardGame.Cards
{
    public static class CardExtensions
    {
        public static IPlayingCard SelectCard(this IEnumerable<IPlayingCard> cards, Suit suit, Rank rank)
        {
            return cards.First(c => c.Suit == suit && c.Rank == rank);
        }

        public static IPlayingCard SelectCard(this IEnumerable<IPlayingCard> cards, IPlayingCard card)
        {
            if(card is Joker joker)
            {
                var equivalentJoker = cards.OfType<Joker>().First();
                if (joker.RepresentedCard != null)
                {
                    equivalentJoker.SetValue(joker.RepresentedCard.Suit, joker.RepresentedCard.Rank);
                }

                return equivalentJoker;
            }
            
            return cards.First(c => c.Equals(card));
        }

        public static bool IsRun(this IList<IPlayingCard> cards)
        {
            var orderedCards = cards.OrderBy(x => x.Rank).ToList();

            if (cards.GroupBy(x => x.Suit).Count() != 1 || cards.GroupBy(x => x.Rank).Count() != cards.Count)
            {
                return false;
            }

            if (orderedCards.FirstOrDefault()?.Rank == Rank.Ace && !orderedCards.Any(x => x.Rank == Rank.Two))
            {
                orderedCards.Add(orderedCards.First());
                orderedCards.RemoveAt(0);
            }

            bool isMatch = true;
            for (int i = 1; i < orderedCards.Count; i++)
            {
                isMatch = isMatch && ((int)(orderedCards[i - 1].Rank + 1) % 13) == ((int)orderedCards[i].Rank) % 13;
            }

            return isMatch;
        }

        public static bool IsRunOfSize(this IList<IPlayingCard> cards, int size) => cards.Count == size && IsRun(cards);

        public static bool IsSet(this IList<IPlayingCard> cards)
        {
            return cards.All(x => x.Rank == cards.First().Rank) && cards.GroupBy(x=>x.Suit).Count() == cards.Count;
        }

        public static bool IsSetOfSize(this IList<IPlayingCard> cards, int size) => cards.Count == size && IsSet(cards);

        public static bool IsJokerPresent(this IList<IPlayingCard> cards) => GetJokerCount(cards) > 0;

        public static int GetJokerCount(this IList<IPlayingCard> cards) => cards.OfType<Joker>().Count();
    }
}

using CardGameEngine.Cards;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class FourOfAKindStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(List<List<Card>> cardSets)
        {
            var cards = cardSets.SingleOrDefault();

            var playingCards = cards.Cast<IPlayingCard>().ToList();

            if (playingCards?.Count != 4) // || cards.IsJokerPresent())
            {
                return false;
            }

            return playingCards.All(x => x.Rank == playingCards.First().Rank) && playingCards.GroupBy(x => x.Suit).All(x => x.Count() == 1);


            return false;
            //return cards.IsUniqueSetOfSize(4);
        }
    }
}

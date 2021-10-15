using CardGameEngine.Cards;
using CardGameEngine.Players;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace Quaranta.Tests
{
    public class OpeningConditionTests
    {
        private Player _player = new Player();

        [Theory]
        [InlineData(false, 8, 8)]
        [InlineData(false, 8, 8, true)]
        [InlineData(true, 11, 11)]
        [InlineData(false, 11, 11, true)]
        [InlineData(true, 12, 12)]
        [InlineData(false, 12, 12, true)]
        [InlineData(true, 13, 13)]
        [InlineData(false, 13, 13, true)]
        [InlineData(true, 1, 1)]
        [InlineData(false, 1, 1, true)]
        public void IsHighPair(bool expectedResult, int card1Rank, int card2Rank, bool sameSuit = false)
        {
            var suit1 = Suit.Clubs;
            var suit2 = sameSuit ? suit1 : Suit.Hearts;

            List<List<Card>> cardsToCheck = new()
            {
                new List<Card>
                {
                    new PlayingCard(suit1, (Rank)card1Rank),
                    new PlayingCard(suit2, (Rank)card2Rank)
                }
            };

            var openingStrategy = new HighPairStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardsToCheck);

            Assert.Equal(expectedResult, isConditionMet);
        }

        [Theory]
        [InlineData(false, 8, 8, 8, 8)]
        [InlineData(true, 11, 11, 11, 11)]
        [InlineData(false, 11, 11, 11, 11, true)]
        [InlineData(false, 11, 11, 11, 11, false, true)]
        [InlineData(true, 12, 12, 12, 12)]
        [InlineData(false, 12, 12, 12, 12, true)]
        [InlineData(false, 12, 12, 12, 12, false, true)]
        [InlineData(true, 13, 13, 13, 13)]
        [InlineData(false, 13, 13, 13, 13, true)]
        [InlineData(false, 13, 13, 13, 13, false, true)]
        [InlineData(true, 1, 1, 1, 1)]
        [InlineData(false, 1, 1, 1, 1, true)]
        [InlineData(false, 1, 1, 1, 1, false, true)]
        public void IsTwoPair(bool expectedResult, int card1Rank, int card2Rank, int card3Rank, int card4Rank, bool sameSuitInGroup1 = false, bool sameSuitInGroup2 = false)
        {
            var suit1 = Suit.Clubs;
            var suit2 = sameSuitInGroup1 ? suit1 : Suit.Hearts;

            var suit3 = Suit.Spades;
            var suit4 = sameSuitInGroup2 ? suit3 : Suit.Diamonds;

            List<List<Card>> cardsToCheck = new()
            {
                new List<Card>
                {
                    new PlayingCard(suit1, (Rank)card1Rank),
                    new PlayingCard(suit2, (Rank)card2Rank)
                },
                new List<Card>
                {
                    new PlayingCard(suit3, (Rank)card3Rank),
                    new PlayingCard(suit4, (Rank)card4Rank)
                }
            };

            var openingStrategy = new TwoPairStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardsToCheck);

            Assert.Equal(expectedResult, isConditionMet);
        }

        [Theory]
        [InlineData(true, 8, 8, 8)]
        [InlineData(false, 8, 8, 8, true)]
        [InlineData(true, 11, 11, 11)]
        [InlineData(false, 11, 11, 11, true)]
        [InlineData(true, 12, 12, 12)]
        [InlineData(false, 12, 12, 12, true)]
        [InlineData(true, 13, 13, 13)]
        [InlineData(false, 13, 13, 13, true)]
        [InlineData(true, 1, 1, 1)]
        [InlineData(false, 1, 1, 1, true)]
        public void IsThreeOfAKind(bool expectedResult, int card1Rank, int card2Rank, int card3Rank, bool sameSuit = false)
        {
            var suit1 = Suit.Clubs;
            var suit2 = sameSuit ? suit1 : Suit.Hearts;
            var suit3 = sameSuit ? suit1 : Suit.Diamonds;

            List<List<Card>> cardsToCheck = new()
            {
                new List<Card>
                {
                    new PlayingCard(suit1, (Rank)card1Rank),
                    new PlayingCard(suit2, (Rank)card2Rank),
                    new PlayingCard(suit3, (Rank)card3Rank)
                }
            };

            var openingStrategy = new ThreeOfAKindStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardsToCheck);

            Assert.Equal(expectedResult, isConditionMet);
        }

        [Theory]
        [InlineData(true, 8, 8, 8, 8, 8)]
        [InlineData(true, 11, 11, 8, 8, 8)]
        [InlineData(false, 11, 11, 8, 8, 8, true)]
        [InlineData(false, 11, 11, 2, 2, 2, false, true)]
        [InlineData(true, 12, 12, 8, 8, 8)]
        [InlineData(false, 12, 12, 5, 5, 5, true)]
        [InlineData(false, 12, 12, 8, 8, 12, false, true)]
        [InlineData(true, 13, 13, 4, 4, 4)]
        [InlineData(false, 13, 13, 7, 7, 7, true)]
        [InlineData(false, 13, 13, 9, 9, 9, false, true)]
        [InlineData(true, 1, 1, 1, 1, 1)]
        [InlineData(false, 1, 1, 1, 1, 1, true)]
        [InlineData(false, 1, 1, 1, 1, 1, false, true)]
        [InlineData(true, 8, 8, 13, 13, 13)]
        public void IsFullHouse(bool expectedResult, int card1Rank, int card2Rank, int card3Rank, int card4Rank, int card5Rank, bool sameSuitInGroup1 = false, bool sameSuitInGroup2 = false)
        {
            var suit1 = Suit.Clubs;
            var suit2 = sameSuitInGroup1 ? suit1 : Suit.Hearts;

            var suit3 = Suit.Spades;
            var suit4 = sameSuitInGroup2 ? suit3 : Suit.Diamonds;

            var suit5 = sameSuitInGroup2 ? suit3 : suit1;

            List<List<Card>> cardsToCheck = new()
            {
                new List<Card>
                {
                    new PlayingCard(suit1, (Rank)card1Rank),
                    new PlayingCard(suit2, (Rank)card2Rank)
                },
                new List<Card>
                {
                    new PlayingCard(suit3, (Rank)card3Rank),
                    new PlayingCard(suit4, (Rank)card4Rank),
                    new PlayingCard(suit5, (Rank)card5Rank)
                }
            };

            var openingStrategy = new FullHouseStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardsToCheck);

            Assert.Equal(expectedResult, isConditionMet);
        }
    }
}

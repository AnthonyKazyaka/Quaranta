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

        #region High Pair
        public static IEnumerable<object[]> LowPairs()
        {
            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Three),
                        new PlayingCard(Suit.Hearts, Rank.Three),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Five),
                        new PlayingCard(Suit.Diamonds, Rank.Five),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Six),
                        new PlayingCard(Suit.Diamonds, Rank.Six),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Seven),
                        new PlayingCard(Suit.Hearts, Rank.Seven),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Eight),
                        new PlayingCard(Suit.Hearts, Rank.Eight),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Nine),
                        new PlayingCard(Suit.Spades, Rank.Nine),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Ten),
                        new PlayingCard(Suit.Diamonds, Rank.Ten),
                    }
                }
            };
        }
        public static IEnumerable<object[]> HighPairs()
        {
            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Hearts, Rank.Jack)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Queen),
                        new PlayingCard(Suit.Hearts, Rank.Queen)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.King),
                        new PlayingCard(Suit.Spades, Rank.King)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Ace),
                        new PlayingCard(Suit.Diamonds, Rank.Ace)
                    }
                }
            };
        }


        [Theory]
        [MemberData(nameof(OpeningConditionTests.HighPairs))]
        public void IsHighPair(List<List<Card>> cardGroups)
        {
            var openingStrategy = new HighPairStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.True(isConditionMet);
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.LowPairs))]
        [MemberData(nameof(OpeningConditionTests.TwoLowPairs))]
        [MemberData(nameof(OpeningConditionTests.TwoPairs))]
        [MemberData(nameof(OpeningConditionTests.ThreeOfAKinds))]
        [MemberData(nameof(OpeningConditionTests.FullHouses))]
        [MemberData(nameof(OpeningConditionTests.Forties))]
        public void IsNotHighPair(List<List<Card>> cardGroups)
        {
            var openingStrategy = new HighPairStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.False(isConditionMet);
        }
        #endregion
        #region Two Pairs
        public static IEnumerable<object[]> TwoPairs()
        {
            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Hearts, Rank.Jack),
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Queen),
                        new PlayingCard(Suit.Spades, Rank.Queen),
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.King),
                        new PlayingCard(Suit.Hearts, Rank.King),
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Six),
                        new PlayingCard(Suit.Hearts, Rank.Six)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Ace),
                        new PlayingCard(Suit.Hearts, Rank.Ace),
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Eight),
                        new PlayingCard(Suit.Hearts, Rank.Eight)
                    }
                }
            };
        }

        public static IEnumerable<object[]> TwoLowPairs()
        {
            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two),
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Nine),
                        new PlayingCard(Suit.Spades, Rank.Nine),
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Seven),
                        new PlayingCard(Suit.Hearts, Rank.Seven),
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Six),
                        new PlayingCard(Suit.Hearts, Rank.Six)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Five),
                        new PlayingCard(Suit.Hearts, Rank.Five),
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Eight),
                        new PlayingCard(Suit.Hearts, Rank.Eight)
                    }
                }
            };

            yield return new object[]
{
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Three),
                        new PlayingCard(Suit.Hearts, Rank.Three),
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Ten),
                        new PlayingCard(Suit.Hearts, Rank.Ten)
                    }
                }
};
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.TwoPairs))]
        public void IsTwoPair(List<List<Card>> cardGroups)
        {
            var openingStrategy = new TwoPairStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.True(isConditionMet);
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.LowPairs))]
        [MemberData(nameof(OpeningConditionTests.TwoLowPairs))]
        [MemberData(nameof(OpeningConditionTests.HighPairs))]
        [MemberData(nameof(OpeningConditionTests.ThreeOfAKinds))]
        [MemberData(nameof(OpeningConditionTests.FullHouses))]
        [MemberData(nameof(OpeningConditionTests.Forties))]
        public void IsNotTwoPair(List<List<Card>> cardGroups)
        {
            var openingStrategy = new TwoPairStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.False(isConditionMet);
        }
        #endregion
        #region Three of a Kind
        public static IEnumerable<object[]> ThreeOfAKinds()
        {
            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two),
                        new PlayingCard(Suit.Diamonds, Rank.Two)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Three),
                        new PlayingCard(Suit.Hearts, Rank.Three),
                        new PlayingCard(Suit.Spades, Rank.Three)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Five),
                        new PlayingCard(Suit.Diamonds, Rank.Five),
                        new PlayingCard(Suit.Clubs, Rank.Five)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Six),
                        new PlayingCard(Suit.Diamonds, Rank.Six),
                        new PlayingCard(Suit.Hearts, Rank.Six)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Seven),
                        new PlayingCard(Suit.Hearts, Rank.Seven),
                        new PlayingCard(Suit.Diamonds, Rank.Seven)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Eight),
                        new PlayingCard(Suit.Hearts, Rank.Eight),
                        new PlayingCard(Suit.Clubs, Rank.Eight)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Nine),
                        new PlayingCard(Suit.Spades, Rank.Nine),
                        new PlayingCard(Suit.Hearts, Rank.Nine),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Ten),
                        new PlayingCard(Suit.Diamonds, Rank.Ten),
                        new PlayingCard(Suit.Hearts, Rank.Ten),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Jack),
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Hearts, Rank.Jack),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Queen),
                        new PlayingCard(Suit.Diamonds, Rank.Queen),
                        new PlayingCard(Suit.Clubs, Rank.Queen),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.King),
                        new PlayingCard(Suit.Diamonds, Rank.King),
                        new PlayingCard(Suit.Hearts, Rank.King),
                    }
                }
            };
            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Ace),
                        new PlayingCard(Suit.Clubs, Rank.Ace),
                        new PlayingCard(Suit.Hearts, Rank.Ace),
                    }
                }
            };
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.ThreeOfAKinds))]
        public void IsThreeOfAKind(List<List<Card>> cardGroups)
        {
            var openingStrategy = new ThreeOfAKindStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.True(isConditionMet);
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.LowPairs))]
        [MemberData(nameof(OpeningConditionTests.HighPairs))]
        [MemberData(nameof(OpeningConditionTests.TwoLowPairs))]
        [MemberData(nameof(OpeningConditionTests.TwoPairs))]
        [MemberData(nameof(OpeningConditionTests.FullHouses))]
        [MemberData(nameof(OpeningConditionTests.Forties))]
        public void IsNotThreeOfAKind(List<List<Card>> cardGroups)
        {
            var openingStrategy = new ThreeOfAKindStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.False(isConditionMet);
        }
        #endregion
        #region Full House
        public static IEnumerable<object[]> FullHouses()
        {
            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Hearts, Rank.Jack),
                        new PlayingCard(Suit.Diamonds, Rank.Jack)
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Queen),
                        new PlayingCard(Suit.Spades, Rank.Queen),
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Queen),
                        new PlayingCard(Suit.Spades, Rank.Queen),
                        new PlayingCard(Suit.Clubs, Rank.Queen)
                    },
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four)
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Six),
                        new PlayingCard(Suit.Hearts, Rank.Six)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Ace),
                        new PlayingCard(Suit.Hearts, Rank.Ace),
                        new PlayingCard(Suit.Diamonds, Rank.Ace)
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Eight),
                        new PlayingCard(Suit.Hearts, Rank.Eight)
                    }
                }
            };
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.FullHouses))]
        public void IsFullHouse(List<List<Card>> cardGroups)
        {
            var openingStrategy = new FullHouseStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.True(isConditionMet);
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.LowPairs))]
        [MemberData(nameof(OpeningConditionTests.HighPairs))]
        [MemberData(nameof(OpeningConditionTests.TwoPairs))]
        [MemberData(nameof(OpeningConditionTests.TwoLowPairs))]
        [MemberData(nameof(OpeningConditionTests.ThreeOfAKinds))]
        [MemberData(nameof(OpeningConditionTests.Forties))]
        public void IsNotFullHouse(List<List<Card>> cardGroups)
        {
            var openingStrategy = new FullHouseStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.False(isConditionMet);
        }
        #endregion
        #region Forty
        public static IEnumerable<object[]> Forties()
        {
            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Hearts, Rank.Jack),
                        new PlayingCard(Suit.Diamonds, Rank.Jack)
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Ace),
                        new PlayingCard(Suit.Spades, Rank.Ace),
                        new PlayingCard(Suit.Clubs, Rank.Ace)
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Queen),
                        new PlayingCard(Suit.Spades, Rank.Queen),
                        new PlayingCard(Suit.Clubs, Rank.Queen)
                    },
                }
            };

            yield return new object[]
{
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Seven),
                        new PlayingCard(Suit.Spades, Rank.Seven),
                        new PlayingCard(Suit.Clubs, Rank.Seven)
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Eight),
                        new PlayingCard(Suit.Spades, Rank.Eight),
                        new PlayingCard(Suit.Clubs, Rank.Eight)
                    },
                }
};

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four)
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Six),
                        new PlayingCard(Suit.Diamonds, Rank.Six),
                        new PlayingCard(Suit.Clubs, Rank.Six),
                        new PlayingCard(Suit.Hearts, Rank.Six)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two),
                        new PlayingCard(Suit.Diamonds, Rank.Two),
                        new PlayingCard(Suit.Clubs, Rank.Two)
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four)
                    },
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four)
                    },
                }
            };
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.Forties))]
        public void IsForty(List<List<Card>> cardGroups)
        {
            var openingStrategy = new FortyStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.True(isConditionMet);
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.LowPairs))]
        [MemberData(nameof(OpeningConditionTests.HighPairs))]
        [MemberData(nameof(OpeningConditionTests.TwoPairs))]
        [MemberData(nameof(OpeningConditionTests.TwoLowPairs))]
        [MemberData(nameof(OpeningConditionTests.ThreeOfAKinds))]
        [MemberData(nameof(OpeningConditionTests.FullHouses))]
        public void IsNotForty(List<List<Card>> cardGroups)
        {
            var openingStrategy = new FortyStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.False(isConditionMet);
        }
        #endregion
        #region FourOfAKind
        public static IEnumerable<object[]> FourOfAKinds()
        {
            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Hearts, Rank.Jack),
                        new PlayingCard(Suit.Diamonds, Rank.Jack),
                        new PlayingCard(Suit.Spades, Rank.Jack)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Ace),
                        new PlayingCard(Suit.Spades, Rank.Ace),
                        new PlayingCard(Suit.Clubs, Rank.Ace),
                        new PlayingCard(Suit.Hearts, Rank.Ace)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Seven),
                        new PlayingCard(Suit.Spades, Rank.Seven),
                        new PlayingCard(Suit.Clubs, Rank.Seven),
                        new PlayingCard(Suit.Hearts, Rank.Seven)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<Card>>
                {
                    new List<Card>
                    {
                        new PlayingCard(Suit.Spades, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two),
                        new PlayingCard(Suit.Diamonds, Rank.Two),
                        new PlayingCard(Suit.Clubs, Rank.Two)
                    }
                }
            };
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.FourOfAKinds))]
        public void IsFourOfAKind(List<List<Card>> cardGroups)
        {
            var openingStrategy = new FourOfAKindStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.True(isConditionMet);
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.LowPairs))]
        [MemberData(nameof(OpeningConditionTests.HighPairs))]
        [MemberData(nameof(OpeningConditionTests.TwoPairs))]
        [MemberData(nameof(OpeningConditionTests.TwoLowPairs))]
        [MemberData(nameof(OpeningConditionTests.ThreeOfAKinds))]
        [MemberData(nameof(OpeningConditionTests.FullHouses))]
        public void IsNotFourOfAKind(List<List<Card>> cardGroups)
        {
            var openingStrategy = new FourOfAKindStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.False(isConditionMet);
        }
        #endregion
        //[Theory]

        //[InlineData(false, 8, 8, 8, 8)]
        //[InlineData(true, 11, 11, 11, 11)]
        //[InlineData(false, 11, 11, 11, 11, true)]
        //[InlineData(false, 11, 11, 11, 11, false, true)]
        //[InlineData(true, 12, 12, 12, 12)]
        //[InlineData(false, 12, 12, 12, 12, true)]
        //[InlineData(false, 12, 12, 12, 12, false, true)]
        //[InlineData(true, 13, 13, 13, 13)]
        //[InlineData(false, 13, 13, 13, 13, true)]
        //[InlineData(false, 13, 13, 13, 13, false, true)]
        //[InlineData(true, 1, 1, 1, 1)]
        //[InlineData(false, 1, 1, 1, 1, true)]
        //[InlineData(false, 1, 1, 1, 1, false, true)]
        //public void IsTwoPair(bool expectedResult, int card1Rank, int card2Rank, int card3Rank, int card4Rank, bool sameSuitInGroup1 = false, bool sameSuitInGroup2 = false)
        //{
        //    var suit1 = Suit.Clubs;
        //    var suit2 = sameSuitInGroup1 ? suit1 : Suit.Hearts;

        //    var suit3 = Suit.Spades;
        //    var suit4 = sameSuitInGroup2 ? suit3 : Suit.Diamonds;

        //    List<List<Card>> cardsToCheck = new()
        //    {
        //        new List<Card>
        //        {
        //            new PlayingCard(suit1, (Rank)card1Rank),
        //            new PlayingCard(suit2, (Rank)card2Rank)
        //        },
        //        new List<Card>
        //        {
        //            new PlayingCard(suit3, (Rank)card3Rank),
        //            new PlayingCard(suit4, (Rank)card4Rank)
        //        }
        //    };

        //    var openingStrategy = new TwoPairStrategy();

        //    var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardsToCheck);

        //    Assert.Equal(expectedResult, isConditionMet);
        //}

        //[Theory]
        //[InlineData(true, 8, 8, 8)]
        //[InlineData(false, 8, 8, 8, true)]
        //[InlineData(true, 11, 11, 11)]
        //[InlineData(false, 11, 11, 11, true)]
        //[InlineData(true, 12, 12, 12)]
        //[InlineData(false, 12, 12, 12, true)]
        //[InlineData(true, 13, 13, 13)]
        //[InlineData(false, 13, 13, 13, true)]
        //[InlineData(true, 1, 1, 1)]
        //[InlineData(false, 1, 1, 1, true)]
        //public void IsThreeOfAKind(bool expectedResult, int card1Rank, int card2Rank, int card3Rank, bool sameSuit = false)
        //{
        //    var suit1 = Suit.Clubs;
        //    var suit2 = sameSuit ? suit1 : Suit.Hearts;
        //    var suit3 = sameSuit ? suit1 : Suit.Diamonds;

        //    List<List<Card>> cardsToCheck = new()
        //    {
        //        new List<Card>
        //        {
        //            new PlayingCard(suit1, (Rank)card1Rank),
        //            new PlayingCard(suit2, (Rank)card2Rank),
        //            new PlayingCard(suit3, (Rank)card3Rank)
        //        }
        //    };

        //    var openingStrategy = new ThreeOfAKindStrategy();

        //    var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardsToCheck);

        //    Assert.Equal(expectedResult, isConditionMet);
        //}

        //[Theory]
        //[InlineData(true, new[] { 8, 8 }, new[] { 8, 8, 8 })]
        //[InlineData(true, 11, 11, 8, 8, 8)]
        //[InlineData(false, 11, 11, 8, 8, 8, true)]
        //[InlineData(false, 11, 11, 2, 2, 2, false, true)]
        //[InlineData(true, 12, 12, 8, 8, 8)]
        //[InlineData(false, 12, 12, 5, 5, 5, true)]
        //[InlineData(false, 12, 12, 8, 8, 12, false, true)]
        //[InlineData(true, 13, 13, 4, 4, 4)]
        //[InlineData(false, 13, 13, 7, 7, 7, true)]
        //[InlineData(false, 13, 13, 9, 9, 9, false, true)]
        //[InlineData(true, 1, 1, 1, 1, 1)]
        //[InlineData(false, 1, 1, 1, 1, 1, true)]
        //[InlineData(false, 1, 1, 1, 1, 1, false, true)]
        //[InlineData(true, 8, 8, 13, 13, 13)]
        //public void IsFullHouse(bool expectedResult, int[] cardGroup1Ranks, int[] cardGroup2Ranks, bool sameSuitInGroup1 = false, bool sameSuitInGroup2 = false)
        //{
        //    var suits = new List<Suit>
        //    {
        //        Suit.Clubs,
        //        Suit.Hearts,
        //        Suit.Spades,
        //        Suit.Diamonds,
        //        Suit.Clubs
        //    };

        //    for(var i = 0; i++; i < cardGroup1Ranks.Count())
        //    {
        //        group1.Add(new PlayingCard())
        //    }

        //    var group2 = new List<Card>();
        //    List<List<Card>> cardsToCheck = new()
        //    {
        //        new List<Card>
        //        {
        //            new PlayingCard(suit1, (Rank)card1Rank),
        //            new PlayingCard(suit2, (Rank)card2Rank)
        //        },
        //        new List<Card>
        //        {
        //            new PlayingCard(suit3, (Rank)card3Rank),
        //            new PlayingCard(suit4, (Rank)card4Rank),
        //            new PlayingCard(suit5, (Rank)card5Rank)
        //        }
        //    };

        //    var openingStrategy = new FullHouseStrategy();

        //    var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardsToCheck);

        //    Assert.Equal(expectedResult, isConditionMet);
        //}
    }
}

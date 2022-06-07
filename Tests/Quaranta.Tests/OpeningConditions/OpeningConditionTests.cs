using CardGame.Cards;
using CardGame.Players;
using Quaranta.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;
using Xunit;

namespace Quaranta.Tests
{
    public class OpeningConditionTests
    {
        private Player _player = new("loltest");

        #region High Pair
        public static IEnumerable<object[]> LowPairs()
        {
            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Three),
                        new PlayingCard(Suit.Hearts, Rank.Three),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Five),
                        new PlayingCard(Suit.Diamonds, Rank.Five),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Six),
                        new PlayingCard(Suit.Diamonds, Rank.Six),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Seven),
                        new PlayingCard(Suit.Hearts, Rank.Seven),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Eight),
                        new PlayingCard(Suit.Hearts, Rank.Eight),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Nine),
                        new PlayingCard(Suit.Spades, Rank.Nine),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
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
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Hearts, Rank.Jack)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Queen),
                        new PlayingCard(Suit.Hearts, Rank.Queen)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.King),
                        new PlayingCard(Suit.Spades, Rank.King)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Ace),
                        new PlayingCard(Suit.Diamonds, Rank.Ace)
                    }
                }
            };
        }


        [Theory]
        [MemberData(nameof(OpeningConditionTests.HighPairs))]
        public void IsHighPair(List<List<IPlayingCard>> cardGroups)
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
        [MemberData(nameof(OpeningConditionTests.StraightFlushes))]
        public void IsNotHighPair(List<List<IPlayingCard>> cardGroups)
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
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Hearts, Rank.Jack),
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Queen),
                        new PlayingCard(Suit.Spades, Rank.Queen),
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.King),
                        new PlayingCard(Suit.Hearts, Rank.King),
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Six),
                        new PlayingCard(Suit.Hearts, Rank.Six)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Ace),
                        new PlayingCard(Suit.Hearts, Rank.Ace),
                    },
                    new List<IPlayingCard>
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
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two),
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Nine),
                        new PlayingCard(Suit.Spades, Rank.Nine),
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Seven),
                        new PlayingCard(Suit.Hearts, Rank.Seven),
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Six),
                        new PlayingCard(Suit.Hearts, Rank.Six)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Five),
                        new PlayingCard(Suit.Hearts, Rank.Five),
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Eight),
                        new PlayingCard(Suit.Hearts, Rank.Eight)
                    }
                }
            };

            yield return new object[]
{
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Three),
                        new PlayingCard(Suit.Hearts, Rank.Three),
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Ten),
                        new PlayingCard(Suit.Hearts, Rank.Ten)
                    }
                }
};
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.TwoPairs))]
        public void IsTwoPair(List<List<IPlayingCard>> cardGroups)
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
        [MemberData(nameof(OpeningConditionTests.StraightFlushes))]
        public void IsNotTwoPair(List<List<IPlayingCard>> cardGroups)
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
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two),
                        new PlayingCard(Suit.Diamonds, Rank.Two)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Three),
                        new PlayingCard(Suit.Hearts, Rank.Three),
                        new PlayingCard(Suit.Spades, Rank.Three)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Five),
                        new PlayingCard(Suit.Diamonds, Rank.Five),
                        new PlayingCard(Suit.Clubs, Rank.Five)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Six),
                        new PlayingCard(Suit.Diamonds, Rank.Six),
                        new PlayingCard(Suit.Hearts, Rank.Six)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Seven),
                        new PlayingCard(Suit.Hearts, Rank.Seven),
                        new PlayingCard(Suit.Diamonds, Rank.Seven)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Eight),
                        new PlayingCard(Suit.Hearts, Rank.Eight),
                        new PlayingCard(Suit.Clubs, Rank.Eight)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Nine),
                        new PlayingCard(Suit.Spades, Rank.Nine),
                        new PlayingCard(Suit.Hearts, Rank.Nine),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Ten),
                        new PlayingCard(Suit.Diamonds, Rank.Ten),
                        new PlayingCard(Suit.Hearts, Rank.Ten),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Jack),
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Hearts, Rank.Jack),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Queen),
                        new PlayingCard(Suit.Diamonds, Rank.Queen),
                        new PlayingCard(Suit.Clubs, Rank.Queen),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.King),
                        new PlayingCard(Suit.Diamonds, Rank.King),
                        new PlayingCard(Suit.Hearts, Rank.King),
                    }
                }
            };
            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
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
        public void IsThreeOfAKind(List<List<IPlayingCard>> cardGroups)
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
        [MemberData(nameof(OpeningConditionTests.StraightFlushes))]
        public void IsNotThreeOfAKind(List<List<IPlayingCard>> cardGroups)
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
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Hearts, Rank.Jack),
                        new PlayingCard(Suit.Diamonds, Rank.Jack)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Queen),
                        new PlayingCard(Suit.Spades, Rank.Queen),
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Queen),
                        new PlayingCard(Suit.Spades, Rank.Queen),
                        new PlayingCard(Suit.Clubs, Rank.Queen)
                    },
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Six),
                        new PlayingCard(Suit.Hearts, Rank.Six)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Ace),
                        new PlayingCard(Suit.Hearts, Rank.Ace),
                        new PlayingCard(Suit.Diamonds, Rank.Ace)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Eight),
                        new PlayingCard(Suit.Hearts, Rank.Eight)
                    }
                }
            };
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.FullHouses))]
        public void IsFullHouse(List<List<IPlayingCard>> cardGroups)
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
        [MemberData(nameof(OpeningConditionTests.StraightFlushes))]
        public void IsNotFullHouse(List<List<IPlayingCard>> cardGroups)
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
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Hearts, Rank.Jack),
                        new PlayingCard(Suit.Diamonds, Rank.Jack)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Ace),
                        new PlayingCard(Suit.Spades, Rank.Ace),
                        new PlayingCard(Suit.Clubs, Rank.Ace)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Queen),
                        new PlayingCard(Suit.Spades, Rank.Queen),
                        new PlayingCard(Suit.Clubs, Rank.Queen)
                    },
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Seven),
                        new PlayingCard(Suit.Spades, Rank.Seven),
                        new PlayingCard(Suit.Clubs, Rank.Seven)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Eight),
                        new PlayingCard(Suit.Spades, Rank.Eight),
                        new PlayingCard(Suit.Clubs, Rank.Eight)
                    },
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four)
                    },
                    new List<IPlayingCard>
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
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Two),
                        new PlayingCard(Suit.Diamonds, Rank.Two),
                        new PlayingCard(Suit.Clubs, Rank.Two)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four)
                    },
                    new List<IPlayingCard>
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
        public void IsForty(List<List<IPlayingCard>> cardGroups)
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
        //[MemberData(nameof(OpeningConditionTests.StraightFlushes))] One of the test cases for Straight Flush also meets the Forty condition
        //[MemberData(nameof(OpeningConditionTests.AllDowns))]
        public void IsNotForty(List<List<IPlayingCard>> cardGroups)
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
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
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
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
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
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
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
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
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
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
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
        public void IsFourOfAKind(List<List<IPlayingCard>> cardGroups)
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
        [MemberData(nameof(OpeningConditionTests.StraightFlushes))]
        [MemberData(nameof(OpeningConditionTests.AllDowns))]
        public void IsNotFourOfAKind(List<List<IPlayingCard>> cardGroups)
        {
            var openingStrategy = new FourOfAKindStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.False(isConditionMet);
        }
        #endregion
        #region Straight Flush
        public static IEnumerable<object[]> StraightFlushes()
        {
            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Ten),
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Clubs, Rank.Queen),
                        new PlayingCard(Suit.Clubs, Rank.King),
                        new PlayingCard(Suit.Clubs, Rank.Ace)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Hearts, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Three),
                        new PlayingCard(Suit.Hearts, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Five),
                        new PlayingCard(Suit.Hearts, Rank.Six)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Seven),
                        new PlayingCard(Suit.Spades, Rank.Eight),
                        new PlayingCard(Suit.Spades, Rank.Nine),
                        new PlayingCard(Suit.Spades, Rank.Ten),
                        new PlayingCard(Suit.Spades, Rank.Jack)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Five),
                        new PlayingCard(Suit.Diamonds, Rank.Six),
                        new PlayingCard(Suit.Diamonds, Rank.Seven),
                        new PlayingCard(Suit.Diamonds, Rank.Eight)
                    }
                }
            };
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.StraightFlushes))]
        public void IsStraightFlush(List<List<IPlayingCard>> cardGroups)
        {
            var openingStrategy = new StraightFlushStrategy();

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
        //[MemberData(nameof(OpeningConditionTests.Forties))] One of the test cases for Straight Flush also meets the Forty condition
        [MemberData(nameof(OpeningConditionTests.AllDowns))]
        public void IsNotStraightFlush(List<List<IPlayingCard>> cardGroups)
        {
            var openingStrategy = new StraightFlushStrategy();

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.False(isConditionMet);
        }
        #endregion
        #region All Down
        public static IEnumerable<object[]> AllDowns()
        {
            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Ten),
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Clubs, Rank.Queen),
                        new PlayingCard(Suit.Clubs, Rank.King),
                        new PlayingCard(Suit.Clubs, Rank.Ace)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Hearts, Rank.Two),
                        new PlayingCard(Suit.Hearts, Rank.Three),
                        new PlayingCard(Suit.Hearts, Rank.Four)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Jack),
                        new PlayingCard(Suit.Hearts, Rank.Jack),
                        new PlayingCard(Suit.Diamonds, Rank.Jack)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Five),
                        new PlayingCard(Suit.Diamonds, Rank.Six),
                        new PlayingCard(Suit.Diamonds, Rank.Seven),
                        new PlayingCard(Suit.Diamonds, Rank.Eight)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Two),
                        new PlayingCard(Suit.Spades, Rank.Three),
                        new PlayingCard(Suit.Spades, Rank.Four)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four)
                    }
                }
            };

            yield return new object[]
            {
                new List<List<IPlayingCard>>
                {
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Diamonds, Rank.Four),
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Spades, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Spades, Rank.Two),
                        new PlayingCard(Suit.Spades, Rank.Three),
                        new PlayingCard(Suit.Spades, Rank.Four)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four)
                    },
                    new List<IPlayingCard>
                    {
                        new PlayingCard(Suit.Clubs, Rank.Four),
                        new PlayingCard(Suit.Hearts, Rank.Four),
                        new PlayingCard(Suit.Diamonds, Rank.Four)
                    }
                }
            };
        }

        [Theory]
        [MemberData(nameof(OpeningConditionTests.AllDowns))]
        public void IsAllDown(List<List<IPlayingCard>> cardGroups)
        {
            var openingStrategy = new AllDownStrategy();

            foreach (var cards in cardGroups)
            {
                _player.Hand.AddRange(cards);
            }

            _player.Hand.Add(new PlayingCard(Suit.Spades, Rank.Five)); // Add a discard

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
        [MemberData(nameof(OpeningConditionTests.Forties))]
        [MemberData(nameof(OpeningConditionTests.StraightFlushes))]
        public void IsNotAllDown(List<List<IPlayingCard>> cardGroups)
        {
            var openingStrategy = new AllDownStrategy();

            foreach(var cards in cardGroups)
            {
                _player.Hand.AddRange(cards);
            }

            _player.Hand.Add(new PlayingCard(Suit.Spades, Rank.Five)); // Add a discard

            var isConditionMet = openingStrategy.IsOpeningConditionMet(_player, cardGroups);

            Assert.False(isConditionMet);
        }
        #endregion
    }
}

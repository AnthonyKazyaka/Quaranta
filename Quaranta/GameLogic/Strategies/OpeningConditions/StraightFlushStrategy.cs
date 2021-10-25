﻿using CardGameEngine.Cards;
using CardGameEngine.Players;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class StraightFlushStrategy : IOpeningConditionStrategy
    {
        public OpeningConditionType OpeningCondition => OpeningConditionType.StraightFlush;

        public bool IsOpeningConditionMet(Player player, List<List<IPlayingCard>> cardGroups)
        {
            var containsCorrectNumberOfGroups = cardGroups.Count == 1;
            var isValidOpeningStraight = cardGroups.All(x => !x.IsJokerPresent() && x.IsRunOfSize(5));

            return containsCorrectNumberOfGroups && isValidOpeningStraight;
        }
    }
}

﻿using CardGameEngine.Collections;
using CardGameEngine.GameLogic.Strategies.OpeningConditions;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Strategies.OpeningConditions
{
    public class ThreeOfAKindStrategy : IOpeningConditionStrategy
    {
        public bool IsOpeningConditionMet(List<CardGrouping> cardGroupings)
        {
            var cards = cardGroupings.SingleOrDefault();
            if(cards?.Count != 3 || cards.IsJokerPresent())
            {
                return false;
            }

            return cards.IsUniqueSetOfSize(3);
        }
    }
}

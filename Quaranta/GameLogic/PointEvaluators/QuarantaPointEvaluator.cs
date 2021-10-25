﻿using CardGameEngine.Cards;
using CardGameEngine.Game.PointEvaluators;
using System.Collections.Generic;

namespace Quaranta.GameLogic.PointEvaluators
{
    public abstract class QuarantaPointEvaluator : IPointEvaluator
    {
        public abstract PointEvaluatorType PointEvaluatorType { get; }
        public abstract int EvaluatePoints(List<IPlayingCard> cards);
    }
}

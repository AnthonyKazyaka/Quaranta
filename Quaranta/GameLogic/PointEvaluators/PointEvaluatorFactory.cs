using CardGameEngine.Game.PointEvaluators;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.PointEvaluators
{
    public class PointEvaluatorFactory : IPointEvaluatorFactory
    {
        private readonly List<IPointEvaluator> _pointEvaluators;

        public PointEvaluatorFactory(List<IPointEvaluator> pointEvaluators)
        {
            _pointEvaluators = pointEvaluators;
        }

        public IPointEvaluator GetPointEvaluator(string evaluatorTypeName)
        {
            var quarantaEvaluators = _pointEvaluators.Cast<QuarantaPointEvaluator>();
            
            return quarantaEvaluators.FirstOrDefault(x => x.PointEvaluatorType.ToString() == evaluatorTypeName);
        }
    }
}

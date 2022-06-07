using CardGame.Game.PointEvaluators;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.PointEvaluators
{
    public class PointEvaluatorFactory : IPointEvaluatorFactory
    {
        private readonly List<IPointEvaluator> _pointEvaluators;

        public PointEvaluatorFactory(IEnumerable<IPointEvaluator> pointEvaluators)
        {
            _pointEvaluators = pointEvaluators.ToList();
        }

        public IPointEvaluator GetPointEvaluator(string evaluatorTypeName)
        {
            var quarantaEvaluators = _pointEvaluators.Cast<QuarantaPointEvaluator>();
            
            return quarantaEvaluators.FirstOrDefault(x => x.PointEvaluatorType.ToString() == evaluatorTypeName);
        }
    }
}

using CardGameEngine.Cards;
using Quaranta.GameLogic.Phases;
using System.Linq;

namespace Quaranta.GameLogic.Players
{
    public class VirtualQuarantaPlayer : QuarantaPlayer
    {
        public VirtualQuarantaPlayer(string name) : base(name)
        {
        }

        public override IPlayingCard TakeTurnAndDiscard(Phase currentPhase)
        {
            return base.TakeTurnAndDiscard(currentPhase);
        }

        protected override IPlayingCard ChooseDiscard() => Hand.First();
        
        protected override void PickupCard()
        {
            throw new System.NotImplementedException();
        }
    }
}

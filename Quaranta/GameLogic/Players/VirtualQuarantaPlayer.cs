using CardGameEngine.Cards;
using Quaranta.GameLogic.Phases;
using System;
using System.Linq;

namespace Quaranta.GameLogic.Players
{
    public class VirtualQuarantaPlayer : QuarantaPlayer
    {
        private int _cardIndex = 0;

        public VirtualQuarantaPlayer(string name) : base(name)
        {
        }

        public override IPlayingCard TakeTurnAndDiscard(Phase currentPhase)
        {
            while (true)
            {
                var chosenCard = ChooseDiscard();
                if (currentPhase.IsDiscardValid(chosenCard))
                {
                    Hand.RemoveAt(_cardIndex);
                    return chosenCard;
                }
            }
        }

        protected override IPlayingCard ChooseDiscard()
        {
            _cardIndex = _cardIndex++ % Hand.Count;
            
            var discard = Hand.Skip(_cardIndex).First();
            return discard;
        }
        
        protected override void PickupCard()
        {
            throw new System.NotImplementedException();
        }
    }
}

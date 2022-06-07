using CardGame.Cards;
using System.Collections.Generic;
using System.Linq;

namespace Quaranta.GameLogic.Players
{
    public class VirtualQuarantaPlayer : QuarantaPlayer
    {
        private int _cardIndex = 0;

        public VirtualQuarantaPlayer(string name) : base(name)
        {
        }

        protected override IPlayingCard ChooseDiscard()
        {
            _cardIndex = ++_cardIndex % Hand.Count;
            
            var discard = Hand.Skip(_cardIndex).First();
            return discard;
        }

        protected override List<IPlayingCard> GetCardsToPlay()
        {
            throw new System.NotImplementedException();
        }

        protected override List<(List<IPlayingCard> cardsToPlay, List<IPlayingCard> targetPile)> GetCardsToPlayOnDownCardGroups()
        {
            throw new System.NotImplementedException();
        }

        protected override bool IsFinishedSelectingCards()
        {
            return true;
            throw new System.NotImplementedException();
        }

        protected override bool ShouldPickupFromDeck()
        {
            return true;
        }

        protected override bool ShouldPlayCardsOnTable()
        {
            return false;
            throw new System.NotImplementedException();
        }
    }
}

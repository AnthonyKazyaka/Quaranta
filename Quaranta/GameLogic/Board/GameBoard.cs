using CardGameEngine.Cards;
using CardGameEngine.Decks;
using System;
using System.Collections.Generic;
using System.Text;

namespace Quaranta.GameLogic.Board
{
    public class GameBoard
    {
        public Deck Deck { get; set; }
        public Stack<IPlayingCard> DiscardPile { get; set; }
        public List<List<IPlayingCard>> OpenCardPiles { get; set; }

    }
}

using CardGame.Cards;
using System.Collections.Generic;

namespace CardGame.Players
{
    public class Player
    {
        public Guid Id { get; private set; }
        public string Name { get; private set; }
        public int Score { get; set; }
        public List<IPlayingCard> Hand { get; set; } = new List<IPlayingCard>();

        public Player(string name)
        {
            Id = Guid.NewGuid();
            Name = name;
        }
    }
}

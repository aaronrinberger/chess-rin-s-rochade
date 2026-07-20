// Chess Puzzles Database
const puzzles = [
  {
    id: 1,
    title: "Grundlinienmatt (Back Rank Mate)",
    fen: "6k1/5ppp/8/8/8/8/q7/1R4K1 w - - 0 1",
    description: "Schwarz hat seine Grundlinie vernachlässigt. Finde das Matt in 1.",
    moves: ["b1b8"],
    labels: ["Rb8#"],
    theme: "Back Rank",
    difficulty: 800
  },
  {
    id: 2,
    title: "Die Gabel (Knight Fork)",
    fen: "4k3/1q6/8/3N4/8/8/8/4K3 w - - 0 1",
    description: "Der schwarze König und die Dame stehen ungünstig. Gewinne die Dame mit einem Springer-Doppelangriff.",
    moves: ["d5f6+", "e8f7", "f6b7"],
    labels: ["Nf6+", "Kf7", "Nxb7"],
    theme: "Fork",
    difficulty: 950
  },
  {
    id: 3,
    title: "Die Fesselung (Pin)",
    fen: "4k3/4q3/8/8/8/8/8/3K1R2 w - - 0 1",
    description: "Fessele die schwarze Dame an ihren König auf der e-Linie.",
    moves: ["f1e1", "e7e1+", "d1e1"],
    labels: ["Re1", "Qxe1+", "Kxe1"],
    theme: "Pin",
    difficulty: 1000
  },
  {
    id: 4,
    title: "Der Spieß (Skewer)",
    fen: "k6q/8/8/8/8/8/8/3B1K2 w - - 0 1",
    description: "Greife den König an und erbeute die dahinterstehende Dame.",
    moves: ["d1f3+", "a8b8", "f3h8"],
    labels: ["Bf3+", "Kb8", "Bxh8"],
    theme: "Skewer",
    difficulty: 1050
  },
  {
    id: 5,
    title: "Ersticktes Matt (Smothered Mate)",
    fen: "6rk/5ppp/8/7N/8/8/8/6K1 w - - 0 1",
    description: "Setze den blockierten schwarzen König mit deinem Springer matt.",
    moves: ["h5f7"],
    labels: ["Nf7#"],
    theme: "Smothered Mate",
    difficulty: 1100
  },
  {
    id: 6,
    title: "Gedecktes Grundlinienmatt (Deflection & Mate)",
    fen: "5rk1/5ppp/2Q5/8/8/8/5PPP/3R2K1 w - - 0 1",
    description: "Lenke den schwarzen Turm von der Verteidigung der Grundlinie ab.",
    moves: ["c6c8", "f8c8", "d1d8"],
    labels: ["Qc8", "Rxc8", "Rd8#"],
    theme: "Deflection",
    difficulty: 1300
  },
  {
    id: 7,
    title: "Abzugsschach (Discovered Check)",
    fen: "4k3/8/8/4N3/3q4/8/8/4R1K1 w - - 0 1",
    description: "Nutze das Abzugsschach des Turms, um die schwarze Dame zu erobern.",
    moves: ["e5c6+", "e8f8", "c6d4"],
    labels: ["Nc6+", "Kf8", "Nxd4"],
    theme: "Discovered Attack",
    difficulty: 1200
  },
  {
    id: 8,
    title: "Zweizügiges Matt (Anastasia's Mate)",
    fen: "6rk/5Qpp/7N/8/8/8/8/6K1 w - - 0 1",
    description: "Opfere deine Dame, um ein wunderschönes ersticktes Matt einzuleiten.",
    moves: ["f7g8+", "g8g8", "h6f7"],
    labels: ["Qg8+", "Rxg8", "Nf7#"],
    theme: "Queen Sacrifice / Smothered Mate",
    difficulty: 1400
  }
];

if (typeof module !== 'undefined') {
  module.exports = puzzles;
}

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
  },
  {
    id: 9,
    title: "Doppelangriff mit Springer (Fork)",
    fen: "3r4/ppq2kpp/8/3N4/8/8/8/3R2K1 w - - 0 1",
    description: "Gewinne die schwarze Dame durch einen Springer-Doppelangriff.",
    moves: ["d5c7"],
    labels: ["Nxc7"],
    theme: "Fork",
    difficulty: 1050
  },
  {
    id: 10,
    title: "Angriff auf gefesselte Figur (Pin)",
    fen: "4k3/4q3/8/8/8/2B5/8/4R1K1 w - - 0 1",
    description: "Nutze die Fesselung der schwarzen Dame auf der e-Linie aus und greife sie erneut an.",
    moves: ["c3b4", "a7a5", "b4e7"],
    labels: ["Bb4", "a5", "Bxe7"],
    theme: "Pin",
    difficulty: 900
  },
  {
    id: 11,
    title: "Ablenkung des Turms (Deflection)",
    fen: "5rk1/5ppp/8/Q7/8/8/5PPP/3R2K1 w - - 0 1",
    description: "Lenke den gegnerischen Turm ab, um ein Matt auf der Grundlinie einzuleiten.",
    moves: ["a5d8", "f8d8", "d1d8"],
    labels: ["Qd8", "Rxd8", "Rxd8#"],
    theme: "Deflection",
    difficulty: 1200
  },
  {
    id: 12,
    title: "Der Spieß-Angriff (Skewer)",
    fen: "8/8/8/8/7q/8/k7/3R2K1 w - - 0 1",
    description: "Setze den schwarzen König Schach und gewinne die dahinterstehende Dame.",
    moves: ["d1d2+", "a2b3", "d2h2"],
    labels: ["Rd2+", "Kb3", "Rxh2"],
    theme: "Skewer",
    difficulty: 900
  },
  {
    id: 13,
    title: "Mattdrohung (Arabisches Matt)",
    fen: "6rk/7p/5N2/8/8/8/6PP/4R1K1 w - - 0 1",
    description: "Bringe deinen Turm in Stellung, um ein unaufhaltsames Matt mit dem Springer einzuleiten.",
    moves: ["e1e7", "g8f8", "e7h7"],
    labels: ["Re7", "Rf8", "Rxh7#"],
    theme: "Mate",
    difficulty: 1250
  }
];

if (typeof module !== 'undefined') {
  module.exports = puzzles;
}

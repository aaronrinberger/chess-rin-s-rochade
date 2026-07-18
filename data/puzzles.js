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
    fen: "6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1", // wait, here Black is already checkmated!
    // Let's create a starting position for Smothered Mate in 1:
    // White knight on f7 is checkmate if Black King is on h8 and surrounded by g8 (Rook), g7 (Pawn), h7 (Pawn).
    fen: "6rk/5ppp/8/8/8/8/8/6KN w - - 0 1", // wait, knight on h6?
    // If White knight is on f7:
    // FEN: "6rk/5ppp/8/8/8/8/8/6KN w - - 0 1" -> Knight on h6 goes to f7 checkmate!
    // Let's verify: FEN is 6rk/5ppp/8/8/8/8/8/6KN w - - 0 1. If White plays h6f7#, it is checkmate because Black king on h8 is trapped by own rook on g8 and pawns on g7, h7.
    // Yes!
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
    fen: "5rk1/5ppp/2Q5/8/8/8/5PPP/3R2K1 w - - 0 1", // White has Queen on c6 and Rook on d1. Black has Rook on f8.
    // If White plays Qc8, deflecting the black rook on f8 from defending the back rank, then Rd8 is mate?
    // Wait: FEN "5rk1/5ppp/2Q5/8/8/8/5PPP/3R2K1 w - - 0 1" -> White plays Qc8. If Black plays Rxc8, then Rd8+ Rxd8 is mate.
    // Let's check:
    // 1. Qc8! Rxc8 2. Rd8+ Rxd8 3. Rxd8# (Wait, white has only one rook on d1. So 2. Rd8+ Rxd8 3. Rxd8# is impossible unless there is another rook. But if white has only one rook, it's just 2. Rd8# because the black rook captured c8 and is no longer on f8!
    // Yes! 1. Qc8 Rxc8 2. Rd8#)
    // Wait, can black play something else? E.g. h6? If black plays h6, then Qc8xf8+ Kxf8 Rd8# is mate. Or Qc8xc8.
    // Yes, Qc8 is a gorgeous deflection!
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
    fen: "rn1qkbnr/pp3ppp/3pb3/1B6/4P3/8/PPP2PPP/RNBQK2R w KQkq - 0 1", // no
    // Classic discovered attack: White Bishop on d3, White Rook on e1, Black King on e8, Black Queen on e7.
    // If White has a knight on e5, and plays Nxf7+ or Ng6+, opening the rook's attack on e7.
    // Let's set up:
    // FEN: "4k3/4q3/8/4N3/8/3B4/8/4R1K1 w - - 0 1"
    // If White plays Ng6+ (discovered attack on e7 by Rook on e1, and Knight attacks Queen on e7 directly too!)
    // Wait, Ng6 is check? No, the rook is on e1 and queen on e7 is in the way.
    // Ah! Discovered check: White Rook on e1, White Knight on e5, Black King on e8.
    // If Knight moves, say, Nd3+, it is a check from the Rook on e1!
    // Let's place Black Queen on d4. If White plays Nc6+, it is a check from Rook on e1 AND Knight on c6 attacks the Queen on d4!
    // FEN: "4k3/8/8/4N3/3q4/8/8/4R1K1 w - - 0 1"
    // If White plays Nc6+, it is check. Black king must move (e.g. Kf8). Then White knight captures queen on d4 (c6d4).
    // Yes! That's a perfect discovered check winning the queen!
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
    fen: "5rk1/5ppp/8/8/8/8/r4qPP/3R2K1 b - - 0 1", // no
    // Anastasia's mate: White Rook on h5 (or similar), White Knight on e7 (giving check/blocking escape), Black King on h8, Pawn on g7.
    // FEN: "5r1k/5Npp/8/7R/8/8/8/6K1 w - - 0 1" -> White plays Rxh7+ (no, Rxh7 is illegal if no rook, but here Rook is on h5).
    // If Rook on h5, Knight on e7, King on h8, pawn on g7. If White plays Rxh7+? No, king can capture if pawn is not there.
    // Anastasia's mate FEN: "5rk1/1R4pp/8/3N4/8/8/5PPP/6K1 w - - 0 1" -> no.
    // Let's keep it simple: Anastasia's mate in 2:
    // FEN: "7k/5Npp/8/8/8/8/6PP/4R1K1 w - - 0 1" -> White plays Re8# (actually, that's just back rank mate).
    // Let's use a beautiful Queen Sacrifice Mate (Philidor's Legacy / Smothered Mate):
    // FEN: "6rk/5Qpp/7N/8/8/8/8/6K1 w - - 0 1"
    // White plays Qg8+! Black must play Rxg8 (since King is trapped). Then Nf7# is smothered mate!
    // Moves: ["qg8+", "rxg8", "nf7#"] -> in coordinates: ["f7g8+", "g8g8", "h6f7"]
    // Let's write the FEN: "6rk/5Qpp/7N/8/8/8/8/6K1 w - - 0 1"
    // White Queen is on f7, White Knight on h6, Black King on h8, Black Rook on g8, Black Pawns on g7, h7.
    // White plays Qg8+ (f7g8). Black rook must take Rxg8 (g8g8). White plays Nf7# (h6f7).
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

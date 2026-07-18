// Chess Endgames Database
const endgames = [
  {
    id: "queen_mate",
    name: "König & Dame vs König",
    fen: "k7/8/8/8/8/8/8/1Q2K3 w - - 0 1",
    description: "Lerne, wie man mit einer Dame und dem König das gegnerische Matt erzwingt.",
    instructions: "Dränge den schwarzen König an den Rand des Brettes und setze ihn matt. Achte darauf, kein Patt (Stalemate) zu verursachen!",
    difficulty: "Anfänger",
    maxMoves: 15
  },
  {
    id: "rook_mate",
    name: "König & Turm vs König",
    fen: "k7/8/8/8/8/8/8/1R2K3 w - - 0 1",
    description: "Das wichtigste grundlegende Endspiel. Nutze den Turm als Schranke.",
    instructions: "Schneide den schwarzen König mit dem Turm ab, bringe deinen König in Opposition und setze matt. Ziel: Unter 20 Zügen.",
    difficulty: "Fortgeschritten",
    maxMoves: 20
  },
  {
    id: "pawn_promotion",
    name: "Bauernendspiel (König & Bauer)",
    fen: "4k3/8/8/8/8/4P3/8/4K3 w - - 0 1",
    description: "Lerne die Opposition und Schlüsselfelder. Bringe deinen Bauern zur Umwandlung.",
    instructions: "Bringe deinen e-Bauern sicher zur gegnerischen Grundlinie, wandle ihn in eine Dame um und setze matt. Nutze deinen König zur Unterstützung vor dem Bauern!",
    difficulty: "Fortgeschritten",
    maxMoves: 30
  },
  {
    id: "two_bishops",
    name: "Zwei Läufer vs König",
    fen: "k7/8/8/8/8/8/8/1BB1K3 w - - 0 1",
    description: "Ein technisch anspruchsvolles Endspiel. Die Läufer arbeiten als Barrierepaar.",
    instructions: "Nutze beide Läufer im Zusammenspiel mit dem König, um den schwarzen König in eine Ecke zu drängen und dort mattzusetzen.",
    difficulty: "Experte",
    maxMoves: 35
  }
];

if (typeof module !== 'undefined') {
  module.exports = endgames;
}

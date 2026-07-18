// Chess Openings & Traps Database
const openings = [
  {
    id: "ruy_lopez",
    name: "Spanische Partie (Ruy Lopez)",
    description: "Eine der ältesten und beliebtesten Eröffnungen. Weiß baut Druck auf den schwarzen Springer auf, der das e5-Feld verteidigt.",
    difficulty: "Anfänger",
    moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"],
    explanations: [
      "Weiß besetzt das Zentrum mit 1. e4 und öffnet Linien für Dame und Läufer.",
      "Schwarz antwortet symmetrisch mit 1... e5, beansprucht ebenfalls das Zentrum und verhindert d4.",
      "Weiß entwickelt den Springer nach f3, greift den Bauern auf e5 an und bereitet die kurze Rochade vor.",
      "Schwarz entwickelt seinen Springer nach c6, um den angegriffenen Bauern auf e5 zu decken.",
      "Der charakteristische Zug der Spanischen Partie: 3. Bb5. Weiß greift den Springer an, der den Bauern e5 verteidigt."
    ]
  },
  {
    id: "sicilian",
    name: "Sizilianische Verteidigung",
    description: "Die populärste Antwort auf 1. e4. Schwarz kämpft asymmetrisch um das Zentrum und vermeidet frühe Remis-Stellungen.",
    difficulty: "Fortgeschritten",
    moves: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3"],
    explanations: [
      "Weiß startet mit dem klassischen Königbauer-Schritt im Zentrum.",
      "Schwarz kontert mit c5. Dies verhindert ein weißes d4-Zentrum und leitet ein asymmetrisches Kampfspiel ein.",
      "Weiß entwickelt den Springer f3, um d4 vorzubereiten und die Kontrolle im Zentrum zu verstärken.",
      "Schwarz spielt d6, um das e5-Feld zu kontrollieren und den Läufer auf c8 freizulegen.",
      "Weiß stößt mit d4 ins Zentrum vor, um Linien zu öffnen.",
      "Schwarz tauscht den c-Bauern gegen den weißen d-Bauern, um eine halboffene c-Linie für Angriffe zu erhalten.",
      "Weiß nimmt mit dem Springer auf d4 wieder zurück, eine sehr aktive Position.",
      "Schwarz entwickelt den Springer f6, greift den ungedeckten Bauern e4 an.",
      "Weiß entwickelt den Springer c3, um e4 zu decken und das d5-Feld zu kontrollieren."
    ]
  },
  {
    id: "queens_gambit",
    name: "Damengambit (Queen's Gambit)",
    description: "Weiß opfert scheinbar einen Flügelbauern (c4), um eine stärkere Bauernkontrolle im Zentrum zu erlangen.",
    difficulty: "Anfänger",
    moves: ["d2d4", "d7d5", "c2c4", "e7e6"],
    explanations: [
      "Weiß öffnet mit dem Damenbauern, um die Felder e5 und c5 zu kontrollieren.",
      "Schwarz antwortet mit d5, besetzt das Zentrum und sperrt e4 für Weiß.",
      "Weiß spielt c4. Das 'Gambit': Weiß bietet den Bauern an, um Schwarz vom Zentrum abzulenken.",
      "Schwarz lehnt das Opfer mit e6 ab (Abgelehntes Damengambit), stützt d5 und bereitet die Entwicklung vor."
    ]
  },
  {
    id: "caro_kann",
    name: "Caro-Kann-Verteidigung",
    description: "Eine sehr solide und defensive Eröffnung für Schwarz. Bereitet d5 vor, ohne den weißfeldrigen Läufer einzusperren (wie bei Französisch).",
    difficulty: "Anfänger",
    moves: ["e2e4", "c6", "d2d4", "d7d5"],
    explanations: [
      "Weiß besetzt das Zentrum mit dem e-Bauern.",
      "Schwarz bereitet mit c6 den Gegenstoß d5 vor, behält sich aber die Entwicklung des Läufers c8 vor.",
      "Weiß besetzt mit d4 das gesamte Zentrum mit Bauern.",
      "Schwarz stößt mit d5 ins Zentrum vor und fordert den weißen e4-Bauern heraus."
    ]
  },
  {
    id: "french",
    name: "Französische Verteidigung",
    description: "Schwarz blockiert das Zentrum mit e6 und d5. Führt oft zu geschlossenen, strategisch tiefen Partien.",
    difficulty: "Fortgeschritten",
    moves: ["e2e4", "e7e6", "d2d4", "d7d5"],
    explanations: [
      "Weiß eröffnet mit dem Standard-Königsbauern.",
      "Schwarz bereitet mit e6 den Gegenstoß d5 vor, schränkt aber vorerst den Läufer c8 ein.",
      "Weiß etabliert mit d4 ein starkes Bauernzentrum.",
      "Schwarz fordert Weiß direkt im Zentrum heraus. Ein Abtauschantwort oder Vorstoß (e5) wird nun von Weiß verlangt."
    ]
  },
  {
    id: "scholars_mate",
    name: "Schäfermatt (Eröffnungsfalle)",
    description: "Das bekannteste schnelle Matt im Schach. Weiß zielt mit Dame und Läufer auf den schwachen f7-Feld.",
    difficulty: "Falle - Anfänger",
    moves: ["e2e4", "e7e5", "d1h5", "b8c6", "f1c4", "g8f6", "h5f7"],
    explanations: [
      "Weiß besetzt das Zentrum mit dem e-Bauern.",
      "Schwarz antwortet klassisch mit e5.",
      "Weiß bringt die Dame früh nach h5, um f7 und e5 unter Druck zu setzen. (Strategisch riskant, aber eine Falle!)",
      "Schwarz deckt seinen e5-Bauern durch Figurenentwicklung.",
      "Weiß entwickelt den Läufer nach c4, der nun zusammen mit der Dame f7 angreift.",
      "Der entscheidende Fehler von Schwarz: Greift die weiße Dame an, ignoriert aber die Mattdrohung auf f7!",
      "Schachmatt! Die Dame schlägt auf f7, geschützt vom Läufer auf c4. Das Spiel ist in nur 4 Zügen vorbei."
    ]
  },
  {
    id: "legals_mate",
    name: "Légals Matt (Eröffnungsfalle)",
    description: "Weiß opfert scheinbar seine Dame, um ein wunderschönes Matt mit drei Leichtfiguren zu erzwingen.",
    difficulty: "Falle - Experte",
    moves: ["e2e4", "e7e5", "g1f3", "d7d6", "f1c4", "c8g4", "b1c3", "g7g6", "f3e5", "g4d1", "c4f7", "e8e7", "c3d5"],
    explanations: [
      "Weiß besetzt das Zentrum mit dem e-Bauern.",
      "Schwarz besetzt das Zentrum.",
      "Weiß entwickelt den Königsspringer.",
      "Schwarz stützt e5 mit d6 ab (Philidor-Verteidigung).",
      "Weiß entwickelt den Läufer nach c4, der f7 ins Visier nimmt.",
      "Schwarz fesselt den weißen f3-Springer mit Läufer g4.",
      "Weiß entwickelt den Damenspringer nach c3.",
      "Schwarz schwächt seine Bauernstruktur mit g6.",
      "Das Scheinopfer! Weiß zieht den Springer nach e5 und gibt scheinbar seine Dame auf d1 auf!",
      "Schwarz schlägt gierig die weiße Dame auf d1. Das ist das entscheidende Blunder!",
      "Schach! Der Läufer schlägt f7, der schwarze König muss nach e7 ziehen.",
      "Schachmatt! Der Springer d5 besiegelt das Matt. Drei Leichtfiguren bezwingen die gegnerische Armee!"
    ]
  }
];

if (typeof module !== 'undefined') {
  module.exports = openings;
}

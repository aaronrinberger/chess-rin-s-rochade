// Chess Openings & Traps Database
const openings = [
  {
    id: "ruy_lopez",
    name: "Spanische Partie (Ruy Lopez)",
    description: "Eine der ältesten und beliebtesten Eröffnungen. Weiß baut Druck auf den schwarzen Springer auf, der das e5-Feld verteidigt.",
    difficulty: "Anfänger",
    elo: 800,
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
    id: "giuoco_piano",
    name: "Italienische Partie (Giuoco Piano)",
    description: "Die klassischste aller Eröffnungen. Weiß entwickelt den Läufer nach c4, um das schwache Feld f7 unter Beschuss zu nehmen.",
    difficulty: "Anfänger",
    elo: 850,
    moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"],
    explanations: [
      "Weiß besetzt das Zentrum mit dem e-Bauern.",
      "Schwarz besetzt das Zentrum symmetrisch mit e5.",
      "Weiß entwickelt den Königsspringer, um e5 anzugreifen.",
      "Schwarz entwickelt den Springer nach c6, um e5 zu decken.",
      "Weiß zieht den Läufer nach c4 und visiert das schwache Feld f7 an.",
      "Schwarz antwortet symmetrisch mit Bc5, um ebenfalls das weiße Feld f2 anzugreifen."
    ]
  },
  {
    id: "queens_gambit",
    name: "Damengambit (Queen's Gambit)",
    description: "Weiß opfert scheinbar einen Flügelbauern (c4), um eine stärkere Bauernkontrolle im Zentrum zu erlangen.",
    difficulty: "Anfänger",
    elo: 900,
    moves: ["d2d4", "d7d5", "c2c4", "e7e6"],
    explanations: [
      "Weiß öffnet mit dem Damenbauern, um die Felder e5 und c5 zu kontrollieren.",
      "Schwarz antwortet mit d5, besetzt das Zentrum und sperrt e4 für Weiß.",
      "Weiß spielt c4. Das 'Gambit': Weiß bietet den Bauern an, um Schwarz vom Zentrum abzulenken.",
      "Schwarz lehnt das Opfer mit e6 ab (Abgelehntes Damengambit), stützt d5 und bereitet die Entwicklung vor."
    ]
  },
  {
    id: "scandinavian",
    name: "Skandinavische Verteidigung",
    description: "Schwarz fordert das weiße e4-Zentrum sofort im ersten Zug heraus. Führt zu schnellem, offenem Spiel.",
    difficulty: "Anfänger",
    elo: 950,
    moves: ["e2e4", "d7d5", "e2d5", "d8d5"],
    explanations: [
      "Weiß startet mit der Königsbauerneröffnung.",
      "Schwarz kontert sofort mit d5, greift den ungedeckten e4-Bauern an.",
      "Weiß nimmt auf d5 heraus, um den materiellen Vorteil zu wahren.",
      "Schwarz nimmt mit der Dame wieder auf d5 zurück (aktiv, aber anfällig für Angriffe)."
    ]
  },
  {
    id: "slav_defense",
    name: "Slawische Verteidigung",
    description: "Eine der solidesten Reaktionen auf das Damengambit. Schwarz stützt d5 mit c6, um den Läufer c8 nicht einzusperren.",
    difficulty: "Anfänger",
    elo: 1000,
    moves: ["d2d4", "d7d5", "c2c4", "c7c6"],
    explanations: [
      "Weiß eröffnet mit dem Damenbauern.",
      "Schwarz antwortet mit d5 im Zentrum.",
      "Weiß bietet das Damengambit mit c4 an.",
      "Schwarz stützt d5 mit c6 ab, wodurch der Läufer c8 später aktiv entwickelt werden kann."
    ]
  },
  {
    id: "french",
    name: "Französische Verteidigung",
    description: "Schwarz blockiert das Zentrum mit e6 und d5. Führt oft zu geschlossenen, strategisch tiefen Partien.",
    difficulty: "Fortgeschritten",
    elo: 1100,
    moves: ["e2e4", "e7e6", "d2d4", "d7d5"],
    explanations: [
      "Weiß eröffnet mit dem Standard-Königsbauern.",
      "Schwarz bereitet mit e6 den Gegenstoß d5 vor, schränkt aber vorerst den Läufer c8 ein.",
      "Weiß etabliert mit d4 ein starkes Bauernzentrum.",
      "Schwarz fordert Weiß direkt im Zentrum heraus. Ein Abtauschantwort oder Vorstoß (e5) wird nun von Weiß verlangt."
    ]
  },
  {
    id: "sicilian",
    name: "Sizilianische Verteidigung",
    description: "Die populärste Antwort auf 1. e4. Schwarz kämpft asymmetrisch um das Zentrum und vermeidet frühe Remis-Stellungen.",
    difficulty: "Fortgeschritten",
    elo: 1200,
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
    id: "kings_indian",
    name: "Königsindische Verteidigung",
    description: "Eine hypermoderne Verteidigung. Schwarz erlaubt Weiß das Zentrum zu besetzen, um es später von den Flanken aus zu attackieren.",
    difficulty: "Fortgeschritten",
    elo: 1300,
    moves: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7"],
    explanations: [
      "Weiß besetzt das Zentrum mit d4.",
      "Schwarz entwickelt den Springer nach f6 und kontrolliert e4/d5.",
      "Weiß erweitert seinen Zentrumsanspruch mit c4.",
      "Schwarz spielt g6, um den Läufer auf g7 zu fianchettieren.",
      "Weiß entwickelt den Springer nach c3, um e4 vorzubereiten.",
      "Schwarz entwickelt den Läufer nach g7, der auf der langen Diagonale Druck ausüben wird."
    ]
  },
  {
    id: "nimzo_indian",
    name: "Nimzowitsch-Indische Verteidigung",
    description: "Eine der besten Verteidigungen gegen 1. d4. Schwarz fesselt den weißen Springer auf c3, um die Kontrolle über das Feld e4 zu sichern.",
    difficulty: "Experte",
    elo: 1400,
    moves: ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4"],
    explanations: [
      "Weiß startet mit d4.",
      "Schwarz entwickelt den Springer nach f6.",
      "Weiß beansprucht Raum mit c4.",
      "Schwarz spielt e6, um den d5-Vorstoß vorzubereiten.",
      "Weiß zieht Nc3, um die e4-Erweiterung zu drohen.",
      "Der charakteristische Zug: Bb4. Schwarz fesselt den Springer c3 und neutralisiert die weiße Drohung auf e4."
    ]
  },
  {
    id: "scholars_mate",
    name: "Schäfermatt (Eröffnungsfalle)",
    description: "Das bekannteste schnelle Matt im Schach. Weiß zielt mit Dame und Läufer auf das schwache f7-Feld.",
    difficulty: "Falle",
    elo: 700,
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
    id: "blackburne_trap",
    name: "Blackburne-Shilling-Falle",
    description: "Eine hinterhältige Falle im Nachzuge für Schwarz. Lockt Weiß mit einem ungedeckten e5-Bauern in den Untergang.",
    difficulty: "Falle",
    elo: 800,
    moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "c6d4", "f3e5", "d8g5"],
    explanations: [
      "Weiß besetzt das Zentrum mit e4.",
      "Schwarz zieht symmetrisch e5.",
      "Weiß greift e5 mit dem Springer an.",
      "Schwarz deckt e5 mit Nc6.",
      "Weiß zieht den Italienischen Läufer nach c4.",
      "Die Falle! Schwarz zieht Nc6-Nd4 und stellt scheinbar den Bauern auf e5 ein.",
      "Weiß fällt darauf rein und schlägt Nxe5, um f7 zu bedrohen.",
      "Der Konter! Schwarz zieht Qg5, greift den Springer e5 und den Bauern g2 an. Weiß steht vor dem Kollaps."
    ]
  },
  {
    id: "legals_mate",
    name: "Légals Matt (Eröffnungsfalle)",
    description: "Weiß opfert scheinbar seine Dame, um ein wunderschönes Matt mit drei Leichtfiguren zu erzwingen.",
    difficulty: "Falle",
    elo: 1500,
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
      "Schwarz schlägt gierig die weiße Dame auf d1. Das ist der entscheidende Fehler!",
      "Schach! Der Läufer schlägt f7, der schwarze König muss nach e7 ziehen.",
      "Schachmatt! Der Springer d5 besiegelt das Matt. Drei Leichtfiguren bezwingen die gegnerische Armee!"
    ]
  }
];

if (typeof module !== 'undefined') {
  module.exports = openings;
}

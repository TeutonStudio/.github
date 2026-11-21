# Dropdown-Icons im Graphstudio

Stand: 21. November 2026. Geltungsbereich: Organisationsadapter `adapters/copycat/web`.

Alle 40 bisherigen Select-Stellen verwenden `IconSelect`. Feste Einträge erhalten eigene semantische SVG-Motive. Dynamische Einträge kombinieren Typmotiv und Wertdetail. Gleiche Bedeutungen verwenden dieselben Motive; fachlich verschiedene Auswahlbereiche werden getrennt aufgelöst. Graphdokumente und Fachkernformate enthalten keine Icon-Metadaten.

## Darstellung und Schnittstelle

- `choice-icons.js`: reine Zuordnung nach Auswahlbereich, Wert und Kontext. `choiceIcon` liefert einen Descriptor oder `null`; `decorateChoices` prüft vollständige Listen und unterscheidet gleiche Kürzel. Fehlende feste Zuordnungen werden nicht durch ein beliebiges Standardsymbol verdeckt.
- `ChoiceIcon`: SVG-Raster 24×24, Standardgröße 16×16 und Strichstärke 1,75. Mathematische Zeichen sind SVG-Pfade. Typfarben sind ergänzende Akzente. Die bestehenden Spiegelpolygone kommen aus `mirror-planes.js`.
- `IconSelect`: kontrollierte Auswahl mit `domain`, `value`, `options: [{value, label, disabled?, icon?, ...Metadaten}]` und `onValueChange(value)`. Zahl, String und Boolean bleiben dabei unverändert. Bestehende Aufrufer können Optionskinder und `onChange(event)` weiterverwenden; deren bisherige String-Konvertierung bleibt erhalten. `context` liefert gemeinsamen Kontext, `choiceMeta(value)` Metadaten einzelner dynamischer Werte.
- Die Auswahl hat einen echten, labelbaren Button mit Combobox-Rolle. Dieser erbt auch gesperrte Fieldsets. SVGs sind dekorativ; Beschriftungen, Auswahlzustand, aktiver Eintrag und Popup sind zugänglich verbunden.
- Pfeiltasten/Home/End/PageUp/PageDown und Buchstabensuche navigieren ohne Änderung. Enter, Leertaste und Tab bestätigen; eine laufende Buchstabensuche kann Leerzeichen enthalten. Escape, erneutes Anklicken des Felds und ein Außenklick verwerfen die Navigation. Gleiche Werte erzeugen keinen Aufruf. Ein synchroner Commit-Schutz verhindert doppelte Änderungen durch nachfolgendes Blur.
- Popups verwenden Bildschirmkoordinaten, passen Öffnungsrichtung und Breite an und stehen außerhalb gezoomter beziehungsweise abschneidender Container. In Dialogen liegen sie innerhalb des jeweiligen Dialogs. Touchzeilen sind mindestens 44 Pixel hoch. Drag-, Pan-, Zoom- und Graph-Tastenkürzel werden abgeschirmt.

## Abdeckungsmatrix der Oberflächen

| Oberfläche | Stellen | Auswahlbereiche und dynamische Quellen |
| --- | ---: | --- |
| `OperatorChoice.jsx` | 6 | Operation mit Familienkontext, Wahr/Falsch, Achse, Winkel, Materialmodus, Materialrolle |
| `NodeAppearance.jsx` | 1 | Bisherige Einzeloperatorfamilien einschließlich Positionieren und Transformieren |
| `Inspector.jsx` | 2 | Gemeinsames Feld: Achsen, Winkel, Gruppen, Materialmodus, Vorschaufilter, Verbindungen; außerdem Karten-Ausgabetyp |
| `NativeFields.jsx` | 4 | Generische Fachfelder, Dachneigung, Dach-Grundformneigung, Segmentquelle |
| `TransformationFields.jsx` | 3 | SRP/SPR/RSP/RPS/PRS/PSR, Drehachse, Vierteldrehung |
| `CopycatTransforms.jsx` | 2 | Achse und Winkel je Transformationsschritt |
| `TransformValues.jsx` | 2 | Achse und Winkel je Rotationswert |
| `ArrangementGrid.jsx` | 4 | Front/Oben/Seite, Eingang mit Nummer/A/B, Muster-Drehachse und Drehwinkel |
| `AreaPreview.jsx` | 2 | Quadrat/Rechteck/Anklicken und Malen/Rechteck ziehen/Quadrat ziehen einschließlich Platzhalter |
| `InputList.jsx` | 1 | Offener Anschluss und passende Quellknoten mit Ausgangstyp und Kürzel |
| `WallThicknessFields.jsx` | 1 | Auswahlaufforderung, einzelne Wand beziehungsweise Grenzabschnitt |
| `NodeDialog.jsx` | 6 | UND/ODER, Ein-/Ausgang, Typgruppen und exakte Typen, Sortierung, Reihenfolge, Gruppierung |
| `FileDialog.jsx` | 2 | Datei-/Referenztyp und Bibliotheksversion |
| `Workspace.jsx` | 1 | Alle Blockzustands-Eigenschaften aus Minecraft-/Mod-Ressourcen |
| `main.jsx` | 3 | Neun Beispiele, ungespeicherter Entwurf/Graphversionen, Gruppen-Vorschauausgänge; gemeinsame Verbindungsfelder verwenden zusätzlich `Field` |
| **Summe** | **40** | Alle ursprünglichen Select-Stellen |

## Feste und generierte Werte

Die Tests lesen den aktiven Fachvertrag, `wireModels().enums`, die Operatorfamilien und die Karten-/Anschlusstypen. Sie prüfen alle festen Katalogauswahlen und alle rekursiv erreichbaren bearbeitbaren Enums. Der generische Inspektor löst seine Icon-Domäne aus Feldtyp, technischem Pfad und Referenzkontext auf, niemals aus einer übersetzten Beschriftung.

- **Operationen (32 Kennungen):** UNION, INTERSECTION, DIFFERENCE, SYMMETRIC_DIFFERENCE, INVERT, ROTATE, MIRROR, TRANSLATE, TRANSFORM, VALUE, ADD, SUBTRACT, MULTIPLY, DIVIDE, SCALE, REMAINDER, MIN, MAX, ABS, EQUAL, NOT_EQUAL, LESS, LESS_EQUAL, GREATER, GREATER_EQUAL, DIVISIBLE, AND, OR, XOR, NOT, IMPLIES, EQUIVALENT. VALUE unterscheidet XYZ, Ganzzahl und Aussage. Mengenoperationen markieren den jeweiligen Ergebnisbereich zweier überlappender Körper.
- **Achsen und Drehungen:** X/Y/Z/NORMAL, 0/90/180/270 Grad, alle sechs SRP-Reihenfolgen, Front/Oben/Seite. Spiegelebenen bleiben im vorhandenen Raster mit 13 Würfel-Schnittvorschauen.
- **Native Enums:** MaterialMode (SEPARATED/GROUPED), AreaMode (SQUARE/RECTANGLE/DRAW), RoomMode (FOOTPRINT/SEGMENTS), RoofForm (FLAT/PENT/GABLE/HIP/MANSARD/CROSS), RoofMode (HEIGHT/ANGLE), StairLayout (STRAIGHT/L/U), WallPolicy (AUTO/EXPLICIT/OPEN), RoomContribution (BOUNDARY/OPENING/STRUCTURE/DECORATION), RotationSegmentMode (OVERLAY/ADJACENT), RotationAxis und CopycatMirrorPlane.
- **Weitere feste Eigenschaften:** horizontal/vertical/depth/transform; rooms/walls; Materialrollen wall/frame/glass/roof/gable/trim; Vorschaufilter all/walls/floor/ceiling/roof; Dachvarianten slope/eave/edge/ridge/hip/valley/corner/cap. Dachprofile werden aus den elf p:q-Verhältnissen des Fachkerns berechnet.
- **Typen:** sämtliche Karten-Ausgabetypen und semantischen Typgruppen. Beispiele sind Würfel für Copycat, Wand für Segment, geschlossener Grundriss für Raum, Geschossebenen für Geschoss, Dachspezifika, Schächte, Erker, Gauben, Gärten und Wege.
- **Katalogwerkzeuge:** Sortierung name/output/inputs/family; Gruppierung none/output/inputs/family/category; beide Sortierrichtungen; beide Filterverknüpfungen und Anschlussrichtungen.
- **Dateien:** all/graphs/nodeGroups/libraryForms/libraryModules; Entwurf und nummerierte Versionen. Alle neun Beispiele haben ein passendes eigenes Motiv.

## Eigene Inhalte und Leerwerte

Knoten, Quellen, Mitglieder, Anschlüsse, Geschosse, Wandabschnitte und Ausgänge verwenden ihr Typmotiv und Kürzel beziehungsweise Nummer. Gleiche Kürzel innerhalb einer Liste erhalten einen anhand der stabilen Kennungen sortierten Zusatz; die Zuordnung ist unabhängig von der sichtbaren Sortierung. Eigene Materialrollen und Gruppen erhalten ein Materialmotiv mit Kürzel.

Materialien verwenden Holzmaserung, Steinverband, Gras, Sandpunkte, Zaun oder Teppichfläche plus Identitätsdetail. Die Regel deckt sämtliche Oberflächen-/Boden-/Zaun-/Teppichwerte des Fachkerns und zusätzliche Mods ab. Blockzustände nutzen Achsen, Kompassrichtungen, obere/untere Fläche, Winkel, Höhenwerte, Zahlen oder Wahr/Falsch; weitere Eigenschaften erhalten ein Eigenschaftsmotiv mit Wertdetail.

Offen/Nicht verbunden, Keine Form/Kein Belag, Automatisch, Erste Gruppe, Alle Gruppen und Vom Eingang übernehmen sind explizite Motive. Deaktivierte Auswahlaufforderungen besitzen ebenfalls ein Icon.

## Prüfung

- Webadapter: `npm test` und `npm run build` im mit dem gepinnten Fachkern vorbereiteten Web-Verzeichnis.
- Organisations-Buildvertrag: `npm test` im Verzeichnis `graphstudio`.
- `tools/verify-dropdown-icons-browser.py --url http://127.0.0.1:PORT/`: vollständige Symbolgalerie, sämtliche festen Auswahlbereiche, Typenerhalt, Sperren, Buchstabensuche, Escape, Fokus, einmaliger Commit, reale Knotenoperation mit Undo/Redo, Zoom/Drag/Shortcut-Isolation, Dialoge und Touch-Scrollen. Die Fixture liegt unter `test/fixtures/dropdown-icons.html` und wird nicht in den Produktionsbuild aufgenommen.
- `tools/verify-authoring-browser.py`: bestehende Segment-/Material-/Undo-/Redo-Regressionsprüfung. Gemeinsame Browserhelfer in `tools/icon_select.py` wählen anhand stabiler Werte oder zugänglicher Beschriftungen.
- Browserbelege entstehen in den mit `--artifacts` angegebenen Verzeichnissen. Produktivdateien werden ausschließlich aus den Adapterquellen gebaut.

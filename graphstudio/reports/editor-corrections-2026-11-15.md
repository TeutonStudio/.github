# Graphstudio: Bedienung, Werte und Referenzen

Geprüfter Fachkern: [79f5157](https://github.com/TeutonStudio/Copycat-Architecture/commit/79f51576ee349a8b519299a1689cfae45661d4a7), separater Entwicklungszweig auf Basis 0.6.4. Organisationseditor: `adapters/copycat/web`.

## Automatische Prüfung

- Vollständiger Fachkernlauf: 597 Fälle, 595 bestanden, keine Fehler. Zwei optionale Vorlagen-Snapshotfälle benötigen separat bereitgestellte Vorlagen über Umgebungsvariablen und waren nicht aktiviert.
- Anschließender Pflichtlauf: sechs Wertregressionen und JVM-Prüfung der Browser-Rückgabe bestanden, kein Fall übersprungen.
- Browser: 185 Tests bestanden, kein Fall übersprungen.
- Gemeinsamer Austausch: 17 Fälle von JVM über Browser zurück zur JVM, darunter neue Vektorrechnung, typisierte Gruppenbindung, Versionsmetadaten, ältere optionale Anschlüsse und Säulen mit Anzahl-Rechnung.
- Vite-Produktionsbundle und drei Tests zur Trennung öffentlicher/interner Quellen bestanden. Der öffentliche Gesamtbuild wiederholt die Prüfungen aus dem veröffentlichten Quellen-Pin.

## Browserprüfung

- Form- und Gebäudegraph: Positionieren ohne Blackscreen und ohne Konsolenfehler angelegt. Positionsfelder besitzen nichtnegative Ganzzahl-Schrittregler. Ungültige Geometrie bleibt als reparierbare Knotendiagnose sichtbar.
- Größenfeld und Auswahlknopf: identische gemessene Höhe von 51 CSS-Pixeln, „Größe“ im grauen Feld; bei unveränderbaren Grundformen entfällt das Feld.
- Zusammenführen mit drei Anzahl-Eingängen; Zerlegen als ein sichtbarer Knoten mit drei Anzahl-Ausgängen.
- Visuelle Auswahl von 13 Spiegelebenen und passender Parameter-Eingang am Spiegeloperator.
- Versionen v1/v2 gespeichert, v1 nur betrachtet, anschließend „Als v3 speichern“ am Entwurf angezeigt.
- Gespeichertes Bibliothekssegment mit Vorschau als typisierter Referenzknoten eingesetzt. Ganze Gebäude in der Auswahl mit Vorschau; Einfügen eigener Versionen deaktiviert.
- Säulenaufbau zwischen überlagerten Drehungen und einer gedrehten 2×2-Anordnung umgeschaltet.
- Desktop 1280×720, Tablet 768×1024 und Mobil 390×844: Dokumentgröße entspricht dem Viewport, Scrollen erfolgt in den inneren Bereichen. Referenzeinträge bleiben einschließlich Versions- und Identitätszeile lesbar.

Lokale Mod-Arbeitskopie und deren native Clientoberflächen wurden für diesen Auftrag nicht verändert. Mod-Releases, Issues und der CC-Visual-Adapter werden nicht veröffentlicht oder umgestellt.

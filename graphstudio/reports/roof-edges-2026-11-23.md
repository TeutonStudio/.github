# Dach-/Fassadenkanten · 23. November 2026

Fachkern: [`67c1852`](https://github.com/TeutonStudio/Copycat-Architecture/commit/67c1852a969595221340ace78bbb37f8ed23c1fe),
Basis 0.6.5, Gebäudegraphschema 18. Der Organisationsadapter übernimmt den
geprüften Kotlin-Fachkern; Browser und Mod verwenden dieselbe Geometrie.

## Bedienung

Am Dach oder direkt erzeugenden Ergebnis im Inspektor **Flächenkanten · Dach /
Fassade** öffnen. Jede gerade Randstrecke besitzt eine nummerierte Zuordnung
im Grundriss und einen Schalter mit Icon. Auch Innenhöfe und Einschnitte
werden berücksichtigt. **Dach** startet die Schräge an der Kante. **Fassade**
erzeugt einen eigenen WALL-Anschluss und eine Quellenwahl.

Die tatsächliche feste Segmenthöhe begrenzt die Fassade. Darüber setzt sich
die gemeinsame Dachneigung fort. Das Segment wird nur horizontal wiederholt;
Fenster und freie Stellen bleiben erhalten. Exakte schräge Anschlüsse benötigen
Copycat-Segmente mit Tiefe 1. Dynamische Y-Höhen liefern keine feste Obergrenze.

Die erste Änderung aktiviert individuelle Kanten. Dachneigung und
Dachverlängerung bleiben einstellbar; Form, Kniestock und manuelle Firsthöhe
werden durch die Kantenberechnung ersetzt. **Bisherige Dachform wiederherstellen**
setzt diesen Modus zurück. Eine gemeinsame Dachvorlage liefert die Bauteile.
Quellen gehören dem Verbraucher und ändern keine eingefrorene Vorlagenversion.

Umschalten blendet den Fassadenanschluss aus und behält seine Quelle für einen
späteren Wechsel. Unveränderte Kanten behalten ihre geometrischen Kennungen,
neue Kanten starten als Dach. Kopieren, Gruppen, Löschen und Undo/Redo verwenden
dieselbe Referenzverwaltung.

## Abnahme

- Native Gesamtsuite: 712 Tests, keine Fehler, vier übersprungen.
- Erforderlicher Browser-Rückimport anschließend separat bestanden, kein Skip.
- 389 Browsertests bestanden; 39 Austauschfälle mit JVM-Rückprüfung.
- Drei übrige native Skips benötigen optionale lokale Browser-/Snapshot-Dateien.
- Native- und Browser-Produktionsbuild erfolgreich.
- Sichtprüfung: 2/6 B Segmenthöhe, oberer Walm/vollständiger Giebel, Icons,
  dynamische Anschlüsse, Undo/Redo sowie gleiche Graph-/Bibliotheksvorschau.
- Unabhängige Tests vergleichen Kollisionsraster mit exakten Volumenschnitten,
  einschließlich dünner Teilpixel und schräger Kanten.

Der aufwendige rationale Kreuzdach-Prüffall (27 Zellen, Neigung 2:3, volle
Copycat-Quellen) benötigt im lokalen Browserbenchmark noch rund 87 Sekunden.
Kantenprüfung und vollständige Meshberechnung laufen getrennt. Rechteckige
Beispiele sind wesentlich schneller. Ein Minecraft-Laufzeitnachweis ist
kein Bestandteil dieser Graphstudio-Abnahme.

## Beispiele

- [Fassade 2 B](../adapters/copycat/web/public/examples/roof-edges-facade-2b-building.json): 180 Platzierungen, 10.016 Zinkeinheiten.
- [Fassade 6 B](../adapters/copycat/web/public/examples/roof-edges-facade-6b-building.json): 184 Platzierungen, 11.920 Zinkeinheiten.

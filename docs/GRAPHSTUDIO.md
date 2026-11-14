# Graphstudio im Organisationsrepo – erste Fassung und Umbauplan

Stand: 14. November 2026. Zielrepo: `TeutonStudio/.github`.

## Zweck und verbindliche Trennung

Graphstudio wird der gemeinsame Einstieg für Graphen aus Copycat Architect,
CC Visual und später weiteren Mods. Ein Graph ist zugleich ein ausführbarer
Testfall: Bearbeitung und Vorschau müssen am tatsächlichen Modverhalten geprüft
werden. Ein erfolgreicher Websitebuild allein ist dafür kein Nachweis.

Der **öffentliche Stand** verwendet ausschließlich gepinnte öffentliche Quellen.
Die Oberfläche nennt Modbasis, Editorversion, Fachkern-/Katalogfingerabdruck und
Prüfumfang. Die Freigabe für eine konkrete veröffentlichte Mod-JAR benötigt
zusätzlich deren Version, Dateifingerabdruck und einen Test mit dieser Datei.
Diese erste Fassung weist zunächst die Übereinstimmung mit dem Modquellstand nach.

Der **interne Stand** verwendet lokale Entwicklungsarbeitskopien und deren echte
Tests. Quelltext, Berichte, Graphen und Builds bleiben lokal und Git-ignoriert.
Ein Verzeichnis, eine nicht verlinkte URL oder ein UI-Umschalter auf einer
öffentlichen Website wären kein privater Zugang. Fernzugriff auf interne Stände
benötigt später eigenes privates Hosting mit Zugriffskontrolle und wird hier
nicht über GitHub Pages veröffentlicht.

## Tatsächlich vorgefundene Ausgangslage

| Bestandteil | Stand und Bedeutung |
| --- | --- |
| Öffentlicher Copycat-Fachkern und Browser | `Copycat-Architecture`, Commit `726214ce74a9ad7dc6e7ad251aee9d2bbb68ebb1`, Version 0.6.4. Bereits gemeinsamer Kotlin-Fachkern, DTO-Codecgenerator, React Flow und JVM–Browser–JVM-Tests. |
| Lokaler Copycat-Mod | Gitbasis `990754d8db44beec4ab6c1aa5c04c1bc74197f0d` mit umfangreichen Arbeitskopieänderungen. Nicht gleich dem aktuellen öffentlichen Stand. |
| Lokaler Copycat-Browser | Separater TypeScript-Prototyp `web/graph-editor`, Version 0.1.0; kein Ersatz für den öffentlichen Browser 0.6.4. |
| Lokales CC Visual | Gitbasis `7dbcfa1836143f6512d649eab9c9a399929e60f7` mit Arbeitskopieänderungen. Nativer KilaGraph, Lua-Parser/-Generator, Projekt-/Kartenmodell und vorhandene Tests. Noch kein Browsereditor. |
| Historischer Audit | Lokaler Copycat-Bericht vom 13.11. vergleicht den damaligen öffentlichen Browser 0.4.0. Die dortigen Fehler sind Regressionstestfälle; sie dürfen nicht ungeprüft als aktuelle Fehler von 0.6.4 ausgegeben werden. |

Im lokalen CC Visual liegen die Speichergrenzen bei 2.048 Knoten und jeweils
8.192 Ausführungs- bzw. Datenkanten; der lokale Copycat-Gebäudegraph begrenzt sich
auf 96 Knoten. „Größer“ bedeutet deshalb auch mehr Ports, reichere Eigenschaften,
Gruppeninstanzen, räumliche Hierarchie und teure Vorschauen. Höhere Knotenlimits
allein lösen diese Anforderungen nicht.

## Was diese Fassung bereits liefert

- Organisationsweiter Einstieg mit Form-/Gebäudeeditor und CC-Visual-Teststatus.
- Öffentlicher Copycat-Webcode unter `graphstudio/adapters/copycat/web`;
  Herkunft und MIT-Lizenz bleiben erhalten. UI-Änderungen erfolgen künftig hier.
- Der Fachkern bleibt beim Mod. Der Organisationsbuild lädt exakt den Commit aus
  `sources.lock.json`, legt den organisationsseitigen Webadapter darüber und
  prüft JVM-Tests, Browser-Modelltests sowie den Rückimport im JVM-Modvalidator.
  Unpassende oder geänderte öffentliche Quellkopien werden zurückgewiesen.
- Ein interner Runner führt die Tests der beiden lokalen Mods aus und stellt
  Ergebnisse sowie den lokalen Copycat-Prototyp auf einer separaten Loopback-
  Adresse bereit. Fehlgeschlagene Prüfungen bleiben sichtbar und sperren den
  jeweiligen Editorlink. CC Visual wird als nativer Teststand ausgewiesen.
- GitHub-Actions-Workflow für Prüfung und öffentliche Pages-Ausgabe. Interne
  Builds haben keinen Uploadschritt und liegen außerhalb von `dist`.

Noch nicht umgesetzt sind der CC-Visual-Browseradapter, das vollständige Teilen
von Editorbefehlen zwischen Mods, privates Remotehosting und die Abnahme einer
konkreten Mod-Release-JAR. Die untenstehenden Schritte beschreiben diese Arbeit.

## Zielarchitektur

```text
TeutonStudio/.github
  graphstudio/
    shell/                   gemeinsamer Einstieg, Teststand, Plan
    adapters/copycat/web/     Browsereditor, Browsercodec und Worker
    scripts/                 öffentlicher Build, interner Testlauf, Vorschau
    sources.lock.json        ausschließlich öffentliche Quellstände
    dist/                    nur verifizierter öffentlicher Build (ignoriert)
    .internal-dist/           interne Ergebnisse (ignoriert)
    .cache/                  Fachkern und Buildwerkzeuge (ignoriert)

Copycat-Mod / CCVisual-Mod
  eigene Fachmodelle, Validatoren, Interpreter/Compiler und native UI-Adapter
  versionierte Graph-/Projektformate und echte Mod-/Clienttests
```

Es gibt keinen gemeinsamen „Universalgraphen“, der Lua-Ausführung und
Geometrieauswertung gleichsetzt. Ein gemeinsamer Editorvertrag beschreibt
Ansichten und Befehle. Je Mod übersetzt ein Adapter diese in dessen native Daten.
Ein Browsergraph ersetzt niemals autoritative Servervalidierung.

## CC-Visual-Umbau in überprüfbaren Etappen

### 1. Modelle und Testkorpus festhalten

Die vorhandenen Regeln aus `GraphValidator`, `NodeTypeRegistry`,
`ProjectDocuments`, Lua-Parser/-Generator sowie Copycats `GraphModels`,
`GraphGroups`, `DiagramEdits` und `BuildingGraphCompiler` erfassen. Zu jeder
Fähigkeit Schema, Eingangs-/Ausgangstypen, Kardinalität und Grenzen exportieren.
Die Laufzeitfähigkeiten sind maßgeblich, nicht bloß Katalogeinträge.

Ein Korpus enthält kleine und große Lua-Projekte, rohe Lua-Codeknoten,
Funktions-/Methodenkarten, Daten-/Control-/Event-Pins, dynamische Pins,
Gruppeninstanzen sowie Copycat-Formen, Gebäude, Raum-/Geschoss-/Dachhierarchien,
benannte Gruppeneingänge und gemeinsam genutzte Definitionen.

**Abnahme:** stabile IDs; jeder Fall hat einen erwarteten fachlichen Output oder
einen bestimmten Fehler. Alte Schemas und unbekannte Typen werden reproduzierbar
behandelt. Kein stilles Weglassen unbekannter Daten.

### 2. Editorbefehle vom nativen Canvas lösen

Der CC-Visual-Canvas ist bereits eine Projektion des gespeicherten `NodeGraph`.
Darauf aufbauen: stabile Node-/Port-/Kanten-IDs und explizite atomare Befehle für
Einfügen, Löschen, Umverdrahten, Eigenschaften, Gruppieren und Instanzieren.
Auswahl, Pan/Zoom und Inspektorfokus bleiben Ansichtszustand.

Alle Änderungen gehen über denselben Domänenpfad in Canvas, Inspektor, Browser
und Zwischenablage. `isSafeToStore` für reparierbare Entwürfe bleibt getrennt von
„ausführbar/exportierbar“. Control-, Event- und Datenkanten behalten ihre Regeln;
eine Gebäudeverbindung wird nicht in einen Lua-Control-Pin umgedeutet.

**Abnahme:** Undo/Redo über mehrere Karten; Duplizieren mit neuen IDs;
Umverdrahten und Löschen aktualisieren sämtliche Gruppenbindungen atomar;
Fehler führen nicht zum Verlust des Entwurfs oder zur Pointer-/Viewport-Neuladung.

### 3. Hierarchie, Gruppen und typisierte Schnittstellen

Die vorhandene Projekt-/Skript-/Methodenkartenhierarchie erhalten. Zusätzlich
benannte Ein-/Ausgänge, gemeinsame Definitionen mit mehreren Instanzen,
Abhängigkeitsansicht und Navigation per Breadcrumb einführen. Darstellungsgruppen
und ausführbare Funktions-/Gruppenschnittstellen ausdrücklich unterscheiden.
Fachliche Gebäudehierarchien bleiben Copycat-Adapterdaten.

**Abnahme:** Änderung einer gemeinsamen Definition aktualisiert alle Instanzen;
Layout und Auswahl jeder Instanz bleiben erhalten. Dynamische Pins erhalten
stabile Schlüssel. Entfernte Pins liefern reparierbare Diagnosen mit Knotenbezug.

### 4. Eigenschaften und Vorschauen

Mehrdimensionale Werte, variadische Ports, verknüpfte Konstanten und strukturierte
Eigenschaften mit passenden Feldern bearbeiten. Diagnosen führen zum betroffenen
Knoten/Port. Vorschauen unterscheiden Gesamtergebnis und selektierten Teilgraph.
Geometrievorschauen laufen bedarfsgerecht im Worker; Lua wird nicht ungefragt als
Vorschau ausgeführt. Für Lua bleiben Quelltext und Ausführungsdiagnosen relevant.

**Abnahme:** Ansichtswechsel verändert keine Werte. Veraltete Workerantworten
überschreiben kein neueres Ergebnis. Kamera bleibt beim Knotenwechsel erhalten.
Ungültige Eingaben sind bearbeitbar und sichtbar, verhindern aber Ausführung.

### 5. Skalierung messen und gezielt verbessern

CC Visual löst beim Laden Definitionen/Pins auf und baut Canvasmodelle neu auf;
`domainPin` sucht aktuell linear. Indizes nach Knoten-/Port-ID, getrennte
Layout-/Inhaltsrevisionen und Teilaktualisierungen sind konkrete Ansatzpunkte.
Erst messen, dann Previewcache, Viewport-Culling und inkrementelle Diagnosen
einführen. Speicher- und Paketlimits bleiben je Mod verbindlich.

Messfälle: 96 komplexe Gebäudeknoten, 512/2.048 CC-Visual-Knoten, hohe zulässige
Kantenzahl, viele dynamische Pins und verschachtelte Gruppen. Gleiche Hardware,
GUI-Skalierung, sichtbare Fläche und Testdateien dokumentieren.

**Zielwerte zur späteren Abnahme, noch keine gemessenen Ergebnisse:**
Eingabereaktion p95 unter 100 ms, Navigation möglichst innerhalb 16,7 ms pro
Frame auf festgelegter Referenzhardware; keine erneute Gesamtprojektion allein
wegen Auswahl oder Pan/Zoom. Für Laden und Vollauswertung getrennte Budgets
nach der ersten Messung festlegen. Kein stilles Kürzen bei Größenüberschreitung.

### 6. CC-Visual-Browseradapter

Knotenvertrag, DTOs und reine Modellbefehle aus CC Visual bereitstellen.
JVM-Abhängigkeiten wie Cobalt, NBT, Minecraft und Peripherals nicht ungeprüft
nach JavaScript übertragen. Parser-/Runtimeprüfung zunächst im JVM-Testrunner
belassen; eine Browserportierung erfolgt nur mit eigenem Paritätsnachweis.
Roh-Lua, Kommentare, Quellbezüge und Reparaturdaten müssen erhalten bleiben.

**Abnahme:** Originalprojekt → Browserimport → Bearbeitung → nativer Rückimport
→ Lua-Erzeugung → Cobalt-Test. Reine JSON-Roundtrips reichen nicht. Ein Browser
ohne Interpreter kennzeichnet seine Vorschaugrenze ausdrücklich.

### 7. Testung als Freigabebedingung

| Ebene | Nachweis |
| --- | --- |
| Codec | Import/Export erhält Felder, IDs, Schemas und Referenzbibliotheken. |
| Semantik | Ergebnis im echten Modcompiler bzw. Cobalt entspricht dem erwarteten Resultat. |
| Editor | Native UI und Browser prüfen Verbinden, Löschen, Gruppen, Undo, Zoom, Inspektor und Reparatur. |
| Integration | Server-/Client-Roundtrip, Speichern/Laden, Konflikte und reale Bau-/CC-Laufzeit. |
| Veröffentlichung | Studio-, Fachkern-, Katalog- und Modartefaktfingerabdrücke sind festgehalten. |

Mindestens die historischen Fälle Projektion, Schema 4, diagonale Spiegelung,
leere gespeicherte Quelle, unbekannte Knotentypen und Gruppenbindungen als
Regressionen erhalten. Ein „erwartet abgewiesen“-Audit ist kein positiver
Kompatibilitätsnachweis. Fehlende oder übersprungene Pflichtfälle blockieren
eine allgemeine Modkompatibilitätsfreigabe.

### 8. Umzug und Freigabe

1. Organisationsbuild und Prüfartifact im PR abnehmen; Pages-Quelle im Zielrepo
   auf GitHub Actions konfigurieren, sofern noch nicht eingerichtet.
2. Öffentliche URL aus dem erfolgreichen Deploy übernehmen und im Orgprofil
   verlinken. Keine noch nicht existierende Zieladresse als live bezeichnen.
3. Nutzer exportieren ihre Graphstudio-Sicherung vor dem Wechsel und importieren
   sie am neuen Einstieg. IndexedDB ist originbezogen; bei künftigem
   Originwechsel wird die Sicherung benötigt. Bei gleicher GitHub-Pages-Origin
   bleiben Daten üblicherweise gemeinsam. DB-Namen in dieser Fassung erhalten.
4. Alte Direktlinks für `?editor=form` und `?graph=building` später gezielt auf den
   Copycat-Adapter weiterleiten; Sicherungs-/Rückkehrmöglichkeit vorher anzeigen.
5. Erst nach erfolgreicher Abnahme den alten Deploymentworkflow ablösen.
   Bis dahin bleibt das bisherige Studio der funktionierende Rückfallweg.
6. Jede spätere Veröffentlichung übernimmt einen exakt getesteten Fachkernstand
   und nennt die passende Modversion; interne Fortschritte werden nie automatisch
   in öffentliche Builds kopiert.

## Nächster Arbeitsschritt

CC-Visual-Korpus und maschinenlesbaren Knotenvertrag aus dem lokalen Mod ableiten,
danach die Domänenbefehle für Umverdrahten/Löschen mit stabilen Port-IDs isolieren.
Diese erste Extraktion soll durch die vorhandenen Graph-/Projekt-/Lua-Tests und
den opt-in nativen Test `devtests/kilagraph-ui.gradle` abgesichert werden.

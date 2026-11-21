# Graphstudio im Organisationsrepo – erste Fassung und Umbauplan

Stand: 15. November 2026. Zielrepo: `TeutonStudio/.github`.

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

- Organisationsweiter Einstieg mit einer typisierten Copycat-Graphkarte und CC-Visual-Teststatus.
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

## Editor-Korrekturen: Werte, Referenzen und Säulen

Der Organisationseditor bietet kompakte Ganzzahlfelder mit Schrittreglern, grafische Spiegelebenen und eine direkte Aktion „Als vX speichern“. Gespeicherte Versionen bleiben unveränderlich; das Verschieben von Knoten ändert dort nur die Ansicht.

Positionen lassen sich aus drei Anzahl-Eingängen zusammensetzen und als gemeinsamer Knoten mit drei Ausgängen zerlegen. Addition, Subtraktion, Multiplikation, ganzzahlige Division, Minimum und Maximum verwenden denselben JVM-/Browser-Auswerter. Neue hB-Koordinaten sind nichtnegativ; Überlauf, Division durch null und Grenzüberschreitungen erzeugen Diagnosen. Ältere lokale Rotationen und ältere optionale Anschlüsse bleiben lesbar.

Die Referenzauswahl im Gebäudegraphen enthält Formen, gespeicherte Graphen, Knotengruppen und Bibliothekssegmente. Ein Referenzknoten behält seine genaue Version, Materialien und typisierten Anschlüsse. Eigene Versionen sind gesperrt. Knotengruppen erhalten ihre benannten Ein- und Ausgänge einschließlich Mehrfachbindungen. Ganze Gebäude und Bibliothekssegmente besitzen entsprechend Gebäude- beziehungsweise Segmentausgänge.

Rotationssegmente unterstützen die bisherigen vier überlagerten Y-Drehungen sowie vier aneinanderliegende, gedrehte Blöcke auf einer Fläche von 2×2 Blöcken. Die Länge bestimmt die Zahl der Lagen. Der native Materialauswerter berechnet beide Varianten.

Vektorrechnung und der neue Säulenmodus benötigen Formgraphschema 5 beziehungsweise Gebäudegraphschema 6. Transformationsfunktionen ohne diese Erweiterungen behalten die bisher erforderlichen Schemas 4/5. Der öffentliche Quellen-Pin wird erst nach Veröffentlichung und Prüfung des gemeinsamen Fachkerns aktualisiert.

## Gemeinsame Copycat-Graphkarte (15. November 2026)

Der Copycat-Adapter zeigt einen einzigen Graphen. Am Ergebnisknoten wird der
Kartentyp gewählt: Copycat, Anzahl, Position, Segment, Fläche, Dach, Gebäude,
Garten und die weiteren nativen Wertfamilien. Die Anschlussregeln bleiben
semantisch typisiert. Gebäude sind innerhalb dieser Karte normale Knoten.
Gespeicherte Form-/Gebäudegraphen werden beim Öffnen in die gemeinsame
Arbeitsansicht übernommen; ihre unveränderlichen gespeicherten Versionen bleiben
unverändert. Knotengruppen werden als eigene Karte geöffnet; „Als Referenz
einfügen“ ist eine eigene Aktion.

Flächen bieten Quadrat (ein Anzahlanschluss), Rechteck (zwei Anzahlanschlüsse)
und Anklicken (keine Eingänge). Die 2D-Vorschau bearbeitet ganze X/Z-Rasterzellen
per Maus oder Tastatur; eine Zeichenbewegung ist ein atomarer Undo-Schritt.
Dynamische Segmentachsen X/Y/Z werden durch Segmentoperatoren weitergereicht
und erst vom Verbraucher aufgelöst. Eine dynamische Segmentquelle besitzt nur
den Copycat-Eingang für das Innere. Gespeicherte feste Bereichsbelegungen bleiben
beim Umschalten erhalten. Neue Dachknoten ordnen Fläche, First, innere/äußere
Ecke und Wandsegment automatisch zu. Vorlagen sind optional.

Die Bibliothek gruppiert Versionen nach Identität und Sammlung. Ein eigener
Löschdialog zeigt je Version die Abhängigkeiten. Referenzierte Versionen und der
gesamte Eintrag bei bestehenden Referenzen sind gesperrt; die Löschung wird bei
Übernahme nochmals gegen den aktuellen Workspace validiert. Der bestehende
Speicherabgleich zwischen Browser-Tabs bleibt aktiv.

Neue Flächenmodi, dynamische Segmente und Dachanschlüsse benötigen
Gebäudegraphschema 7. Typisierte Karten und bearbeitbare Inline-Copycats
benötigen Schema 8. Bestehende Dokumente ohne diese Eigenschaften behalten ihre
bisherigen Schemata. Eine bestehende Release-JAR wird dadurch nicht ersetzt.

## CC-Lua: Knoten- und Modulplanung für das vollständige Pack

Stand: **20. November 2026**. Status: Planung, keine implementierte
CC-Browserfunktion oder Laufzeitfreigabe. Dieser Abschnitt konkretisiert die
CC-Visual-Etappen oben um Knotenkatalog, ausführbare Gruppen und Packabdeckung.

### Bestandsgrundlage und Grenzen

Maßgeblich ist `TerrArchitecture/config/modpack-lock.json` für Minecraft 1.21.1
und NeoForge 21.1.251, mit 454 Artefakten. Der aktuelle
[statische Scan](../graphstudio/reports/cc-integration-inventory-2026-11-20.json)
liest 448 davon aus dem vorhandenen Clientprofil, einschließlich eingebetteter
JARs. Er erfasst 39 relevante Container: CC-Verweise, Lua-Ressourcen sowie
ergänzend indirekte Computerintegrationen und das Rezeptaddon `ccbr`. Alle 39
relevanten Container stimmen per SHA-512 mit dem Lockfile überein.
Klassenverweise belegen noch keine öffentliche oder aktivierte Lua-Methode.

Sechs Lockfile-Artefakte fehlen in diesem Profil; darunter TerrArchitecture
selbst. Zwei zusätzliche Client-JARs außerhalb des Locks wurden nicht als
Packbasis verwendet. Die Lücken stehen im Scan. Das ältere
[TeutonLib-Inventar](../../TeutonLib/docs/research/cc-api-inventory-20261112.json)
vom 12.11. hatte noch 453 Artefakte und ist deshalb ergänzende Evidenz.
`mods legacy/` ist keine Quelle für den aktiven Katalog.

Ausgangsstände unterscheiden: Das Pack enthält CC:Tweaked 1.120.2,
CC-Aeroworks 1.5.4, TeutonLib 1.6.0, CCVisual 0.1.0 und Copycat Architect 0.5.1.
Die lokalen Entwicklungsquellen und der öffentliche Copycat-Editor können neuer
sein. Insbesondere dürfen neuere Architect-Methoden aus lokalen Quellen nicht
automatisch als Fähigkeiten der Pack-JAR 0.5.1 angeboten werden.

Bereits vorhanden in CCVisual: `NodeTypeRegistry`, `StandardNodes`, `MathNodes`,
Funktionskarten mit typisierten Kartengrenzen, verschachtelte Kartenorganisation,
Lua-Parser/-Generator, Quellerhalt, Projektversionen, Cobalt-Ausführungstests,
CC-Laufzeitmount und Offline-Installer. Noch zu ergänzen sind insbesondere der
Browseradapter, ein vollständiger Packvertrag sowie wiederverwendbare Gruppen
mit eigener Instanzzuständigkeit. Eine organisatorische `card.group` ist heute
kein Nachweis für eine solche ausführbare Modulinstanz.

### 1. Drei Ebenen für überschaubare Programme

| Ebene | Aufgabe | Beispiel |
| --- | --- | --- |
| Grundknoten | Lua-Ausdrücke, Kontrollfluss, Werte und einzelne API-Aufrufe | Vergleichen, Wenn/Sonst, Inventar übertragen |
| Wiederverwendbare Knotengruppe | Definierte Schnittstelle, innere Implementierung, mehrere Aufrufstellen oder Instanzen | Hysterese, Torsteuerung, PID-Regler |
| Projekt und Zielcomputer | Module, Einstieg, Konfiguration und Gerätebindungen für eine Computerrolle zusammenstellen | Torcomputer, Leitstand, Fahrzeugcomputer |

Funktionsgruppen kompilieren zu lokalen Funktionen oder exportierten
Modulfunktionen. Zustandsgruppen kompilieren zu Lua-Modulen mit einer
`create(config, dependencies)`-Fabrik; jede Instanz erhält eigene Zustandswerte
und einen expliziten Lebenszyklus. Servicegruppen bündeln langlebige Abläufe
mit `start`, Ereignisbehandlung und `stop`. Rahmen für Kommentare und Ordner zur
Navigation bleiben zusätzliche, rein organisatorische Hilfen.

Der Hauptgraph soll vorzugsweise aus wenigen dieser Gruppen bestehen. Einzelne
Lua-Anweisungen lassen sich innerhalb der Gruppen bearbeiten. Roh-Lua bleibt
als normaler Baustein für vorhandene Programme und Spezialfälle verfügbar.

### 2. Benötigte Grundknoten

Die Tabelle ist der Zielumfang. Vorhandene Bausteine werden übernommen und
ergänzt; sie werden nicht alle neu implementiert.

| Familie | Knoten und einstellbare Operationen | Zweck |
| --- | --- | --- |
| Einstieg und Ablauf | Programmeinstieg, Sequenz, Wenn/Sonst, Fallauswahl, While, Repeat/Until, numerische For-Schleife, For-Each mit `pairs`/`ipairs`, Break, Return | Vollständiger strukturierter Ablauf ohne Verbindungsspaghetti |
| Werte und Berechnung | Zahl, Ganzzahl, Text, Boolean, nil, Enum, Farbe, Vektor, Matrix; Mathematik, Vergleiche, Kurzschlusslogik, Formatierung und Konvertierung | Verkabelbare Werte und kompakte konfigurierbare Rechner |
| Datenstrukturen | Liste/Record/Map erzeugen, Feld lesen/setzen, Einfügen/Entfernen, Filtern/Abbilden/Falten, Kopieren, Tuple packen/entpacken | Typisierte Maschinen-, Inventar-, Sensor- und Nachrichtenwerte |
| Variablen und Zustand | Lokale Variable, Parameter, Instanzzustand lesen/schreiben, Zustand initialisieren/zurücksetzen, vorheriger Tickwert | Zustand zwischen Ereignissen und Schleifendurchläufen erhalten |
| Funktionen und Module | Gruppeneingang/-ausgang, Funktionsreferenz, Funktion aufrufen, Modul laden/exportieren, Instanz erzeugen, Methodenaufruf mit Empfänger | Wiederverwendung, Callbacks, `require` und Lua-Methodensemantik |
| Ereignisse und Zeit | Ereignis abonnieren/abmelden, Ereignis warten/auslösen/zerlegen, Timer starten/abbrechen, Timeout, Intervall, Entprellen, Flanke | Reaktive Programme mit Filterung nach Quelle und Timer-ID |
| Aufgaben | Aufgabe starten, auf alle/erste warten, Abbruchsignal, Yield, Warteschlange, begrenzter Worker | Eingaben, Netz und Anzeige kooperativ gleichzeitig bedienen |
| Fehler und Diagnose | Geschützter Aufruf, Erfolgs-/Fehlerzweig, Assert, expliziter Fehler, Cleanup, begrenzter Retry, Log, Messwert aufzeichnen | Erwartete Gerätefehler behandeln und zum Knoten zurückverfolgen |
| Geräte und Fähigkeiten | Nach Adresse/Typ/Spitzname verbinden, alle passenden Geräte finden, eindeutig auswählen, Typ/Methode prüfen, Attach/Detach behandeln, neu verbinden | Dieselbe Gruppe an verschiedenen Computern einsetzen |
| Redstone und Signale | Digital/analog/bundled lesen/schreiben, Bitmaske, Relay; benannte Kanäle lesen/setzen, Eingang beobachten | Physische Seiten, Funklinks und logische Kanäle ansprechen |
| Dateien und Einstellungen | Datei öffnen/lesen/schreiben/schließen, Verzeichnis, JSON/Lua-Serialisierung, Einstellungen, Version lesen/migrieren, gesichert speichern | Konfiguration und wiederherstellbaren Programmzustand verwalten |
| Netzwerk und Ortung | Modem öffnen/senden, Nachricht empfangen, Rednet, Protokoll filtern, Anfrage/Antwort, HTTP-Anfrage/-Response, WebSocket, GPS | Verteilte Steuerung und Datenabruf mit Timeout |
| Terminal und Medien | Text/Blit, Cursor/Farbe, Fenster/Redirect, Monitor und Touch, Pixelmodus, Pixel/Text/SVG zeichnen, Audio abspielen | Bedienoberflächen auf unterschiedlichen Displays |
| Standardgeräte | Inventar auflisten/übertragen, Tank lesen/umfüllen, Energie lesen, Drucker, Laufwerk, Lautsprecher, Computerstatus | Gemeinsame CC-Fähigkeiten für viele Maschinenmods |
| Mobile Computer | Turtle-Bewegung/-Drehung, Inspektion, Graben/Bauen, Inventar, Treibstoff; Android-Auftrag und Status | Abläufe mit bestätigtem Ergebnis und Abbruch |
| Fachadapter | Katalogbasierter Lua-/Peripheral-Aufruf, Ergebnis zerlegen, API-spezifische Events und Handle-Methoden | Vollständigkeit für die unten aufgeführten Erweiterungen |
| Freies Lua | Ausdruck, Anweisung oder Modul mit deklarierten Ein-/Ausgängen, Abhängigkeiten und möglichen Effekten | Bestehenden Code integrieren und Kataloglücken überbrücken |

Operationen wie Textformatierung oder Tabellenzugriff erhalten Auswahlfelder,
statt für jede Variante einen nahezu identischen Paletteneintrag anzulegen.
Für jede öffentliche API-Methode genügt zunächst ein katalogbasierter,
signaturtreuer Aufrufknoten. Häufige Aufgaben erhalten darüber komfortable
Fachgruppen. Suche erfolgt nach deutscher Aufgabe und originalem Lua-Namen.

### 3. Anschlüsse und Ausführungsregeln

**Drei verschiedene Verbindungsarten:** Ablauf bestimmt die Reihenfolge;
Daten transportieren Werte; Ereignisse beschreiben Auslöser und ihre Nutzdaten.
Ereignisanschlüsse sind keine zusätzlichen unkontrollierten Sprungmarken. Sie
werden in registrierte Handler beziehungsweise explizite Taskabläufe übersetzt.
Die vorhandene Trennung `FlowKind.CONTROL` / `EVENT` bleibt erhalten.

Zusätzlich zu den vorhandenen Basistypen braucht der Vertragslayer `List<T>`,
`Map<K,V>`, benannte Records, `Optional<T>`, Unions, Tupel mit Mehrfachrückgaben,
Funktionssignaturen und qualifizierte Handles wie `Peripheral<inventory>`,
`FileHandle` oder `CraftJob`. Dafür einen strukturierten Typdeskriptor ergänzen;
nicht für jede Modtabelle einen weiteren Wert im bisherigen `DataType`-Enum
anlegen. Unbekannte Typen bleiben ausdrücklich unbekannt.

Einheiten und Bezugsräume gehören an den Anschluss: Tick/Sekunde, Grad/Radiant,
Drehzahl, Temperatur, Druck, Energieformat, Welt-/Sublevelposition,
lokaler/Welt-Richtungsvektor und Dimension. Koordinatenkonvertierung,
Grad/Radiant und Energy-Unit-Konvertierung sind sichtbare Knoten. API-spezifische
Matrix-/Quaternion- und Vektorformate benötigen Adapter; numerische Lua-Arrays
und `{x,y,z}` sind nicht automatisch austauschbar.

Weitere verbindliche Generatorregeln:

- Geräteabfragen, Zeit, Zufall, Ereignisempfang und andere beobachtbare Aufrufe
  werden an einem Ablaufpunkt einmal ausgeführt. Mehrere Ausgangskabel lesen
  denselben erfassten Wert. Reine Berechnungen dürfen Datenknoten bleiben.
- Kurzschluss von `and`/`or`, Schleifenbedingungen pro Durchlauf, lokale Scopes,
  Closures und `self` bleiben erhalten. Ein Effekt im Schleifenkörper wird
  weder vorgezogen noch durch mehrere Verbraucher dupliziert.
- Tupel erhalten Reihenfolge, Anzahl und innere/abschließende nil-Werte.
  `true, result` oder `nil, error` wird pro API beschrieben; kein pauschales
  `ok` vor jede beliebige Rückgabe setzen.
- Datenzyklen benötigen expliziten gespeicherten Vorzustand; Ablaufzyklen
  entstehen durch strukturierte Schleifen. Lang laufende Schleifen müssen
  nach einem festgelegten Budget yielden können.
- Zustand ist pro Gruppeninstanz getrennt. Tabellenreferenzen und bewusste
  gemeinsame Zustände müssen sichtbar sein; Persistenz benötigt eine eigene
  Deklaration samt Schema/Migration.

### 4. Ausführbare Knotengruppen als eigentliche Module

Eine Gruppendefinition erhält stabile ID und Version, typisierte benannte
Parameter/Rückgaben, Konfigurationsfelder, erforderliche Fähigkeiten, erlaubte
Hostkontexte, Effekte und Ereignisschnittstellen. Eine Instanz referenziert
Definition und konkrete Version; Gerätehandles werden als Abhängigkeiten
übergeben. Adressen wie `left` oder ein bestimmter Pultsocket gehören in die
Projektbindung, sofern die Gruppe sie nicht ausdrücklich als Parameter braucht.

Wichtige Editoraktionen: Auswahl zu Funktion/Zustandsgruppe extrahieren,
Grenzanschlüsse benennen, Definition öffnen, Instanz einfügen, lokale Kopie
erstellen, Verwendungen anzeigen, Bibliotheksversion speichern und Aktualisierung
mit Schnittstellenvergleich übernehmen. Pin-IDs bleiben beim Umbenennen stabil.
Entfernte/geänderte Pins erzeugen reparierbare Diagnosen statt stiller
Umverdrahtung. Funktionsrekursion ist gesondert zu prüfen; Hierarchie- und
unauflösbare Modulabhängigkeitszyklen werden abgewiesen.

Eine Bibliotheksänderung verändert keine fest gepinnte Projektversion.
Mehrere Instanzen derselben Definition verwenden nach einer ausdrücklich
übernommenen Aktualisierung denselben neuen Funktionskörper, aber weiterhin
unterschiedliche Instanzzustände. Export bündelt jede benötigte Definition
einmal und legt nur die nötigen Moduldateien an.

| Erste Gruppenbibliothek | Schnittstelle und inneres Verhalten |
| --- | --- |
| Signalaufbereitung | Rohwert → begrenzter/skalierter Wert; Totzone, Flanke, Entprellen, Hysterese; Speicher pro Instanz |
| Gerätebindung | Geräteanforderung → eindeutiges Handle oder Fehler; Methoden-/Typprüfung und Wiederanbindung |
| Periodische Messung | Quelle, Intervall → Messwert mit Zeitpunkt/Qualität; Timeout und veraltete Daten |
| PID-Regler | Sollwert, Istwert, `dt`, Grenzen → Stellwert; Reset, Anti-Windup und separater Integrator je Instanz |
| Zustandsautomat | Zustand + Event → Folgezustand/Aktion; Initial-, Betriebs-, Fehler- und Stoppzustand |
| Gesicherte Konfiguration | Schema + Standardwerte → geladene Daten; Validierung, temporäre Datei, Sicherung und Migration |
| Anfrage/Antwort | Ziel + Protokoll + Nutzdaten → Antwort/Timeout; Request-ID, Quelle, Deduplizierung und begrenzter Retry |
| Lagerbestand halten | Inventar oder ME-Bridge + Zielmengen → Fehlbedarf/Auftrag; Jobhandle und tatsächlichen Transfer zählen |
| Torsteuerung | Antrieb + Referenz + Zielwinkel → Bewegung/Zustand; Laufbestätigung, Timeout und erneute Referenz bei Unklarheit |
| Dashboard | Messwerte + Displayziel → Statusansicht; Eingaben als semantische Aktionen, auflösungsabhängiges Layout |
| Fahrzeugregelung | Telemetrie + Piloteninput → begrenzte Stellwerte; manuell/automatisch, fehlende Daten und Watchdog |
| Bau-/Transportauftrag | Auftrag + Turtle/Android-Adapter → Fortschritt/Fehler; Ressourcen, Abbruch und Wiederaufnahme |
| Koloniebedarf | Colony4CC- oder AP-Colony-Adapter → normalisierte Bedarfsdaten; Lager-/Craftinggruppe als eigener Verbraucher |

Diese Gruppen sind Vorlagen für echte Graphen und bleiben vollständig
aufklappbar. Insbesondere Tor-, Fahrzeug-, Bau- und Craftinggruppen benötigen
API-spezifische Zustände; eine allgemeine Erfolgsleitung ersetzt sie nicht.

### 5. Ereignisse, Aufgaben und Neustarts

Für mehrere Servicegruppen ist eine gemeinsame Eventschleife mit Dispatcher
der Standard. Der Dispatcher ordnet Eventname, Quelladresse und Nutzdaten zu;
Timer werden anhand ihrer IDs zugeordnet und mehrere Gruppen können dasselbe
Event beobachten. Wartende Unterabläufe werden kooperativ fortgesetzt.
Ein Handler soll keine zweite verborgene globale Endlosschleife starten.

Für bewusst getrennte Abläufe stehen `parallel.waitForAll`/`waitForAny` als
Knoten bereit. CC führt diese kooperativ aus; jeder Zweig erhält eine eigene
Ereigniswarteschlange. Das ist der in der
[offiziellen parallel-Referenz](https://tweaked.cc/module/parallel.html)
beschriebene Vertrag. Ein vorhandener Roh-Lua-Ablauf mit eigenen `pullEvent`s
darf nur mit geprüftem Adapter als Service eingebunden werden.

Abbruch und Cleanup sind explizit: Timer/Subscriptions beenden, Datei-/Netzhandles
schließen und deklarierte Ausgänge in ihren Stoppzustand setzen. `terminate`
wird nach Cleanup weitergereicht. `waitForAny` garantiert allein keinen
fachlichen Cleanup aller verbleibenden Zweige. Bei Chunkentladung oder
Computerabbruch kann Lua-Cleanup ausbleiben; benötigte Watchdogs müssen durch
Gerät/API unterstützt oder separat realisiert und getestet werden.

Automatische Wiederholung setzt einen ausdrücklich idempotenten Aufruf oder
eine fachliche Auftrags-/Deduplizierungs-ID voraus. Ein Timeout nach einer
Bewegung oder einem Craftingauftrag bedeutet sonst einen unbekannten Ausgang;
zuerst Status abgleichen, statt die Aktion blind erneut auszuführen.

Neustart initialisiert flüchtigen Zustand neu. Persistente Sollwerte,
Auftragsfortschritt und physische Position werden getrennt behandelt. Eine
gespeicherte Torposition oder ein alter Sensorwert ist nach einem Abbruch kein
Beweis für die aktuelle Welt. Neue Programme erhalten einen expliziten
Wiederanlaufpfad und klar gekennzeichnete persistente Daten.

### 6. Pack-Abdeckungsmatrix

Die folgenden Pakete sind der Pflichtumfang des API-Katalogs. Die aufgeführten
Knoten sind geplante fachliche Oberflächen; konkrete Signaturen, aktivierte
Registrierungen und Ereignisse müssen gegen die jeweilige Pack-JAR geprüft
werden. Ein Katalogeintrag allein bestätigt keine Laufzeitverfügbarkeit.

| Packanbieter / Version | Benötigte Knoten und Gruppen | Besondere Abgrenzung |
| --- | --- | --- |
| CC:Tweaked 1.120.2 | CraftOS-/Lua-Grundknoten, alle öffentlichen Module und Handles, native Peripherals, Turtle/Pocket, Dateien, HTTP/WebSocket, GPS, Audio, Rednet, Redstone | Verfügbarkeit nach Host und Serverkonfiguration; Cobalt-Dialekt statt beliebigem Lua 5.4 |
| TeutonLib 1.6.0 | Quellen/Spitznamen, Peripheral Links, benannte Kanäle/Signalbanken, Gruppen, SVG/Bitmap-Schrift, Heli-/Lager-/Sensorergänzungen | Öffentliche Lua-Verträge verwenden; Java-Geometrie-/Workspace-APIs sind keine Lua-Knoten |
| CC-Aeroworks 1.5.4 | ControlDesk, `peripherals`, `channels`, `controls`, `wires`, `telemetry`, mobile/Desk-/Dock-Handles, Anzeigen, Touch, Scriptdiagnose | Externer CC-Computer, eingebetteter Pultcomputer und Displayhandler sind unterschiedliche Scopes |
| Aeroworks Radar-/CTF-Compat | Radar-Anbindung und DashboardController für Zugsteuerung | Zielmods `create_radar` bzw. `create_train_functionality` und aktive Integration erforderlich |
| CC: Sable 1.3.4 | `sublevel`, `aero`, Matrix/Quaternion, `advanced_math.mmath`, PID und Statistik | Host-/Fahrzeugbezug, Koordinatensysteme und Objektmethoden erhalten |
| CC: Androids 1.4.0 | `android`: Bewegung/Auftrag, Inspektion, Hand/Inventar, Interaktion, Treibstoff, Sensoren und Abbruch | Android-Kontext und benötigte Module; Start eines Auftrags ist noch kein Abschluss |
| Advanced Peripherals 0.7.61b | ChatBox, Player/Environment/Energy Detector, GeoScanner, BlockReader, InventoryManager, Compass, NBT, Chunk-/Automata-Funktionen; ME-/Colony-Bridges | Zielmods je Bridge/Plugin; RS-/Powah-Unterteile nur bei tatsächlich vorhandener Abhängigkeit |
| Colony4CC 2.8.3 | Kolonie, Bürger, Gebäude, Aufträge/Ressourcen, Pocket/Wireless und Events | Eigenständiger Vertrag zusätzlich zu AP-Colony; nur per Adapter normalisieren |
| CC:C Bridge 1.7.2 | Source, Target, Scroller, RedRouter, Animatronic und Displaydaten | Create-Quellen/Ziele und Ereignisse mit ihrem tatsächlichen Datenformat |
| CC Redstone Link 0.0.2 | Frequenz-/Linkzugriff über dessen RedstoneLinkBridge | Anbieter `cccredstonelink` eindeutig zuordnen |
| CC Redstone Link Bridge, Datei 1.0.3 | Eigener Frequenz-/Linkzugriff | Anbieter `ccredstonelinkbridge`; nicht mit gleichnamigem Vertrag des anderen Addons verschmelzen; Metadatenversion abweichend |
| CC: Graphics 0.2.1 | Grafikmodus, Pixel/Palette, Zeichen-/Bildoperationen und Grafikwerkzeuge | Erweiterte `term`/`window`/`paintutils`-Verträge, Pixelkoordinaten und Farbformate |
| CC: Terminals 0.1.1 | Terminalgerät, Umleitung, Größe/Fähigkeiten und Eingaben | Native Terminals und Aeroworks-Terminaladapter unterscheiden |
| CC: Optical 1.0.3 | Entity-Sensor und Cannon-Mount-Status/-Steuerung | CBC-Unterteil nur bei Zielmod/Fähigkeit |
| NeoPeripheral, Datei 1.4.1ve | Radar/Entity-Radar, NFC, Crypto, Sockets/Modem, Sable Engine, Controller-Hubs, CBC-/Synaxis-Adapter | Jede Teilintegration einzeln freischalten; Metadatenversion abweichend |
| Simulated CC Compat 1.1.2 | PhysicsDataAccessor, RopeWinch, SteamVent, HotAirBurner, WheelMount | Konkrete Zielblöcke, geerbte Methoden und Einheiten |
| CCVisual 0.1.0 | Projektstatus, Launcher, Deployment, Projektänderungsereignis und Spitznamenauflösung | Native API-/Modulnamen der Pack-JAR prüfen; Editorinternes bleibt Editorinternes |
| Copycat Architect 0.5.1 | Formen/Materialbedarf, Turtle-Platzierung, Bauauftrag zuweisen/lesen/bauen/melden und Nachladen | Katalog für 0.5.1; neuere Drucker-/Schemafunktionen erst mit passendem geprüften Profil |
| Turtle Charging Station 1.7.0 | Ladestation, ThunderchargeDynamo, Energie/Ladestatus | Turtle-Kontext und erreichbare Ladehardware |
| Create 6.0.10 | Drehzahl/Stress, Motor/Gangschaltung/Speed Controller, Anzeigen, Station/Signal/Observer, Packager/Repackager, Stock Ticker, Shop/Requester und Paket-/Orderobjekte | Neben primitiven Rückgaben auch Handles, Tabellen und Logistikereignisse |
| Create Simulated 1.3.2 im Aeronautics-Bundle | Höhen-/Geschwindigkeits-/Gimbal-/Optiksensor, Navigation, Links/Docking, Lager, Torsionsfeder, Typewriter/NamePlate | Eingebettete Module und tatsächliche Mod-IDs auflösen; Bundle-ID allein reicht nicht |
| Create Avionics 0.6.0 | Zusammengesetzte Maschinen-/Sensor-Peripherals, SCADA, Aeronautics-Propeller/Gasversorgung und Offroad-WheelMount | Methodenüberlagerungen mit Create, Simulated und TeutonLib |
| Gadgets & Gizmos 1.0.6 | Controller, Joystick, Lager, Thruster, Gearbox, Claw, Orientierung, Navigation, Winde/WheelMount | Teilintegrationen und Lua-Beispiele als Funktionsvorlagen |
| Create Propulsion: Simulated 1.1.4 | Thruster-/Vector-/Liquid-/Ion-/Creative-Varianten, TiltAdapter, RedstoneTransmission, StirlingEngine, CoralGenerator | Unterschiedliche Stellgrößen und Grenzen pro Gerät |
| Create Radars 0.4.9.4 | RadarBearing, PlaneRadar, Monitor, Fire-/Pitch-/YawController und Kontakte | Native API, NeoPeripheral und Aeroworks-Erweiterungen eindeutig zuordnen |
| Tweaked Controllers 1.2.7 | Controller/TweakedLectern lesen, Achsen/Buttons, Eingabeaufbereitung | NeoPeripheral-Hubs als Zusatzvertrag |
| Create Diesel Generators 1.3.12 | ChemicalTurret-Status/-Steuerung | Keinen generischen Generatorvertrag aus dem Modnamen erfinden |
| Create Power Grid 0.6.2 | Batterie, Clutch, Strom-/Spannungs-/Leistungsmessung, EnergyMeter, RedstoneConverter | Vorzeichen und Einheiten; generische FE-Abfrage ist kein Ersatz |
| FluidLogistics 1.3.1 | FluidPackager, FluidRepackager, CopperFrogport, geerbte Paket-/Auftragsmethoden | Auch ohne direkt benannte Peripheral-Klasse inventarisieren |
| Mekanism 10.7.19.85 | Maschinen/Multiblocks, Inventar/Fluide/Chemikalien, Filter, Security und Status/Steuerung | Generierte Methodenregister und Filterhandles erfassen |
| Mekanism Generators 10.7.19.85 | Generatoren, Fissions-/Fusionsreaktoren, Turbinen | Eigenes Methodenregister zusätzlich zu Mekanism |
| Immersive Engineering 12.4.2-194 | Maschinenstatus, Energie/Tanks, maschinenabhängige Steuerung | Callback-Registries und dynamische Peripherals |
| PneumaticCraft 8.2.20 | Druck, Maschinenwerte und jeweilige Steuerfunktionen | Maschinenabhängige Signaturen und Druckeinheit |
| Draconic Evolution 3.1.4.632 | FlowGate, ReactorComponent und EnergyPylon | Gemeinsame und gerätespezifische Methoden unterscheiden |
| Extreme Reactors 2.4.9 / ZeroCore 2.4.21 | Reactor-, Turbine-, Energizer-Computerports | ZeroCore als gemeinsame Infrastruktur; Multiblock-/Porttyp berücksichtigen |

Weitere Packintegrationen gehören ausdrücklich in die Abdeckung, erzeugen aber
nicht automatisch eine neue Methodenpalette:

- **Ender IO 8.2.10-beta:** Bundled-Redstone-Provider ergänzt die gemeinsamen
  Redstoneknoten; kein daraus abgeleiteter erfundener Peripheraltyp.
- **Drive By Wire 0.3.0:** Physische Signalverbindungen und die vorhandenen
  TeutonLib-/Aeroworks-Kanalzugriffe; keine unbewiesene globale DbW-Lua-API.
- **Sable 2.0.6:** Funknetz-/Weltpositionskompatibilität; eigene Fahrzeugknoten
  stammen aus den tatsächlich bereitgestellten CC-Sable-/Avionics-APIs.
- **VS Sable Hose Connectors 0.2.2:** Kabelnetz über Kupplungen, Verbindung und
  Trennung; zusätzliche Lua-Methoden nur mit öffentlichem Vertragsnachweis.
- **CC Better Recipes (`ccbr`) 1.2.0:** Rezept-/Materialintegration ohne erkannte
  eigene Lua-Oberfläche. Als Setuphinweis berücksichtigen.
- **AE2 und weitere Lager-/Tank-/Energiemods:** AP-ME-Bridge oder CCs generische
  `inventory`, `fluid_storage`, `energy_storage` nutzen, soweit am konkreten
  Block exponiert. Das Vorhandensein einer Mod belegt keine solche Fähigkeit.
  Dies gilt auch für Factory Logistics, Create Connected und weitere Addons:
  geerbte, zusammengesetzte oder über andere Mods exponierte Methoden zuordnen.

Refined Storage und Powah stehen im untersuchten Lockfile nicht als Anbieter;
ihre AP-Unterbereiche bleiben für dieses Profil ausgeblendet. Nur historisch
oder deaktiviert vorhandene Erweiterungen wie TFMG, `cc_cbc` und `cbcperipheral`
werden nicht als aktive Packfunktionen eingeplant. Für die sechs fehlenden
Artefakte bleibt eine abschließende Abdeckungsprüfung offen.

### 7. Ein gemeinsamer API-Vertrag für Referenz und Knoten

Der [TeutonLib-Referenzplan](../../TeutonLib/docs/plans/cc-api-reference.md)
ist bereits vorhanden; sein vollständiger Katalog ist noch zu implementieren.
Graphstudio soll dieselben versionierten Symbolverträge verwenden. Referenz,
native CCVisual-Palette und Browser dürfen keine drei getrennt gepflegten
Signaturlisten erhalten.

Benötigte Metadaten pro Symbol: stabile Anbieter-/Symbol-ID, Lua-Name und
Aliase, Vertragsschema, Mod-/Versions-/Artefaktbindung, zusätzliche Zielmods,
Host/Scope, Parameter mit Defaults/Optionalität/Varargs, Mehrfachrückgaben,
Record-/Handletypen, Einheiten, Effekte, Yieldverhalten, Fehler und Events.
Für Knoten kommen Port-IDs, Kategorien, deutsche Suchbegriffe und ein
deklarativer Aufrufadapter hinzu. Katalogdaten enthalten keinen beliebig
auszuführenden Fremdcode.

CCVisuals heutiger `PeripheralNodeGenerator` genügt dafür nicht: Er reflektiert
`@LuaFunction`, überspringt `IArguments` und reduziert `MethodResult`/Arrays auf
einen `ANY`-Ausgang. Dynamische, generische, komponierte oder registrierte
Methoden sowie genaue Tupel fehlen damit. Stabile Typ-IDs müssen den
Vertrag beschreiben, nicht wie derzeit eine konkrete `instanceId` enthalten.
Die Geräteinstanz ist eine getrennte Bindung.

TeutonLibs `SourceIntrospection` und `ComputerExtensions` sind vorhandene
Anschlussstellen für echte Methoden und Dokumentation. Ihre Erkennung ist
ebenfalls um die benötigten Registrierungsfälle zu prüfen. Die
[CC-peripheral-API](https://tweaked.cc/module/peripheral.html) liefert Namen,
Typen und Methodennamen, aber keinen vollständigen fachlichen Typvertrag.
Ohne geprüfte Signatur bleibt ein universeller Aufruf mit sichtbarem
`unknown`-Typ möglich; er zählt nicht als vollständig typisierte Integration.

Die Palette unterscheidet **Packprofil** und **am Zielcomputer verfügbar**.
Offline ist das Profil maßgeblich. Ein aus dem Spiel exportierter Snapshot
ergänzt Host, verbundene Geräte, Fähigkeiten und Versions-/Hashstände; er wird
als Momentaufnahme gekennzeichnet. Fehlende Gerätebindungen bleiben editierbar,
werden vor Ausführung aber diagnostiziert. Attach/Detach und Modupdates
invalidieren die passende Bindung, nicht den gesamten Entwurf.

Aeroworks `peripherals.find` hat andere Rückgabeformen als CCs
`peripheral.find`; beide brauchen eigene Adapter. Ebenso sind
`teutonlib.channels`, `cc_aeroworks.channels` und Display-/Touchmodule getrennte
Scopes. Importierte API-Namen werden nicht durch ähnlich klingende ersetzt.
Pro Zusammensetzung wird pro Methodenname genau der tatsächlich aktive
Vertrag zugeordnet; Konflikte bleiben sichtbar.

### 8. Konkrete Einbindung in Graphstudio

CC Visual erhält einen eigenen Adapter, beispielsweise unter
`graphstudio/adapters/ccvisual/`, mit Palette, Graph-/Funktionskarten,
Projektbaum, Gerätebindungen, Diagnosen und Lua-Ansicht. Shell, Navigation,
Bibliotheksbedienung und gemeinsame Editorbefehle werden geteilt. Lua-Compiler,
Portregeln und Projektvalidator bleiben beim CCVisual-Fachkern. Der Browser
arbeitet mit dessen versionierten DTOs; keine zweite frei nachgebaute
Lua-Semantik im Copycat-Adapter.

Der Projektbaum zeigt Einstiegsskripte, Module, Gruppenbibliotheken,
Konfiguration, Ressourcen und Zielrollen. Funktions-/Gruppenkarten öffnen sich
mit Breadcrumb, Call-Site-Navigation, Suchfunktion und Erhalt des Ausschnitts.
Inspektoren bieten strukturierte Recordfelder, Enums, Geräteauswahl und Einheiten.
Diagnosen verweisen auf Datei, Gruppeninstanz, Knoten und Port. Eine Quellkarte
verknüpft erzeugte Lua-Zeilen mit diesen IDs.

Für Projekte mit mehreren Computern erhält jede Rolle eigene Einstiege und
Bindungen. Rollen kommunizieren über deklarierte Nachrichten-/Kanalschnittstellen
mit serialisierbaren Daten. Ein normales Ablaufkabel führt nicht automatisch
auf einem anderen Computer weiter; Handles werden nicht über Rednet übertragen.

Exports: natives Projekt für Rückimport, Lua-Verzeichnis mit Modulen/Ressourcen,
Offline-Installer und Abhängigkeitsmanifest. Launcher und feste Quellrevisionen
des vorhandenen CCVisual-Runtimesystems wiederverwenden. Reines CC-Lua kann
portabel exportiert werden; Knoten mit TeutonLib-/Aeroworks-Abhängigkeit behalten
diese Laufzeitvoraussetzungen. Importierter Lua-Code und unbekannte Knoten
bleiben verlustfrei als reparierbarer Entwurf erhalten.

### 9. Beispiel: modularer Torcomputer

```text
main
  Einstieg → Konfiguration laden → Geräte binden → Torinstanz erzeugen
           → Services starten → Eventschleife

  Display-Input ──→ semantische Aktion ──→ Torinstanz
  Netzwerk-Input ─→ Request prüfen ──────→ Torinstanz
  Timer/Antriebsstatus ─────────────────→ Torinstanz
  Torzustand ──────────────────────────→ Dashboard + Netzwerkantwort

Torinstanz(config, antrieb)
  Zustandsautomat: unreferenziert / bereit / fährt / Fehler
  Referenz setzen → Zielabweichung berechnen → rotate aufrufen
  Lauf beobachten → Abschluss bestätigen → Zustand melden
  Timeout/Neustart/Detach → Position unbekannt → Referenz verlangen
```

Vorhandene Referenz für die fachliche Zerlegung:
[`Bauwerk-Tor-Steuerung-CC-`](../../Bauwerk-Tor-Steuerung-CC-/README.md).
Eine zweite Torinstanz nutzt dieselbe Definition mit eigenem Antrieb,
Konfiguration, Timern und Referenzzustand. Dieselbe Trennung trägt komplexere
Projekte wie Fahrzeugleitstand oder Kolonieversorgung.

### 10. Umsetzungsreihenfolge und Abnahme

| Etappe | Konkretes Ergebnis | Pflichtnachweis |
| --- | --- | --- |
| P0a: Verträge | Packprofil, Symbol-/Typmodell, Bestandsabgleich, versionierte DTOs und kleiner Referenzkorpus | Eingebettete JARs, indirekte Register, Scopes, Aliase und Konflikte sind erfasst; jede öffentliche Oberfläche ist zugeordnet oder als Lücke begründet |
| P0b: Module | Funktions-/Zustandsgruppen, stabile Grenzen/Instanzen, Module, Geräteparameter | Zwei Instanzen teilen Code, niemals versehentlich Zustand; Versionierung, Closure und Mehrfachrückgaben im Cobalt-Test |
| P0c: Ausführung | Ereignisdispatcher, strukturierte Aufgaben, Fehler/Cleanup, Persistenz und Quellkarte | Kein verlorener Touch während Timer/Netz; richtige Timerzuordnung; sauberes Beenden und erklärter Wiederanlauf |
| P1: Browserkern | CCVisual-Adapter, Kernpalette, Import/Export, Gruppenbibliothek, Bindungen | Native → Browser → native → Lua → Cobalt; Undo/Redo, Pinmigration, Roh-Lua und unbekannte Daten bleiben erhalten |
| P2: Packadapter | Signaturtreue Aufrufe für alle Anbieter der Matrix; generische Speicher-, Sensor-, Kanal- und Grafikgruppen | Abdeckungsprüfung pro Anbieter/Version, Zielmod- und Hostvarianten; keine Freigabe durch bloßen Namensscan |
| P3: Praxisbibliothek | Tor, Dashboard, Lager/ME, Kolonie, Turtle/Android, Fahrzeug/PID und Zugsteuerung | Je vollständiges Beispielprojekt plus Geräte-/Fehlerfall im passenden Minecraft-Pack |
| P4: Freigabe | Gepinnter öffentlicher Fachkern-/Katalogstand mit konkreten Artefakten | Client/Server-Roundtrip und getestete Pack-JARs; öffentlicher und interner Stand weiterhin getrennt |

Jede Etappe liefert einen benutzbaren Ausschnitt; vollständige Packabdeckung
ist erst nach P2 samt Integrationsprüfungen erreicht. Die Kernpalette kann vor
den Komfortgruppen aller Mods entstehen. Alle APIs bleiben durch den
katalogbasierten Aufruf zugänglich, sobald ihr jeweiliger Vertrag geprüft ist.

Besonders aussagekräftige Abnahmefälle:

1. Zwei Tor-/PID-Instanzen: getrennte Zustände, Timer, Fehler und Hardware.
2. Gleichzeitige Anzeige-, Rednet- und Timerereignisse; Blockade, Yield und
   Abbruch einschließlich `terminate` und nicht ausgeführtem Cleanup.
3. Ein Geräteaufruf mit zwei Datenverbrauchern; exakte Anzahl der Ausführungen,
   Tupel mit nil-Lücken und Seiteneffekte in Schleifenbedingungen.
4. `ControlDesk` extern, eingebetteter Pultcomputer, Displayhandler, Turtle,
   Pocket und Android: passende beziehungsweise ausdrücklich fehlende APIs.
5. Dynamische Mekanism-/IE-Methoden, Avionics-Komposition, beide Redstone-Link-
   Addons und AP-Zielmods: korrekte Vertragsauswahl und Konfliktdiagnose.
6. Detach, Umzug auf Sable, Reboot und Wiederanbindung: keine alten Handles als
   aktuelle Geräte ausgeben; Welt-/Sublevelkoordinaten und Einheiten prüfen.
7. Persistenz beschädigt, Modul fehlt, Pin entfernt, unbekanntes Schema und
   ungültiges Lua: reparierbarer Entwurf; letzter gültiger Laufstand bleibt.
8. Reale Projekte mit 512/2.048 Knoten, vielen Modulinstanzen und dynamischen
   Ports; Lade-/Interaktionszeit und Projektgröße messen. Bestehende Grenzen
   von 2.048 Knoten und je 8.192 Ablauf-/Datenkanten nicht durch blindes
   Expandieren jeder Gruppeninstanz umgehen. Kompressions-/Transferbudgets
   aus CCVisual gelten weiter.

Simulationen verwenden explizite Geräte-Stubs und aufgezeichnete Daten.
Browserprüfung, Cobalt-Semantik und echte Minecraft-Ausführung werden getrennt
ausgewiesen. Für diesen Plan wurden Quellen, Katalogentwürfe, Lockfile und JARs
gelesen; es wurden keine Maschinenmethoden ausgeführt oder Mod-/UI-Tests neu
gestartet. Nächster konkreter Entwicklungsschritt ist P0a zusammen mit einem
kleinen Modulprototyp aus P0b, der zwei unabhängige Torinstanzen exportiert.

## Gemeinsame lokale Alpha · 20. November 2026

Die erste ausführbare Alpha liegt unter `graphstudio/alpha`, mit einem
organisationsseitigen nativen CCVisual-Adapter unter `adapters/ccvisual`.
Start und Voraussetzungen stehen in der
[Graphstudio-Anleitung](../graphstudio/README.md#lokale-gemeinsame-alpha--020-alpha1).
Der neue Build heißt `npm run alpha`, die Vorschau `npm run preview:alpha` auf
Port 4319. `.alpha-dist` und die nativen Compilerstände bleiben ignorierte
lokale Buildausgaben; der bestehende Pages-Workflow lädt sie nicht hoch.
Der bisherige Auftritt im Copycat-Repo bleibt bestehen.

Bereits umgesetzt ist ein gemeinsamer Einstieg mit CC-Lua-Projekten,
Copycat-Arbeitsbereich und durchsuchbarer Pack-Bestandsaufnahme. Der
Copycat-Organisationsadapter wird in einem eigenen Overlay gebaut; Modquellen
werden dabei nur gelesen. Innerhalb des gemeinsamen Arbeitsplatzes läuft er
zunächst als eigener eingebetteter Editor mit eigener Bibliothek. Ein
bereichsübergreifender Universalgraph wird damit nicht eingeführt.

CC Lua besitzt 90 native beziehungsweise ausgewählte API-Knotentypen,
typisierte Verbindungen, Eigenschafteninspektor, Projekt-/Gruppennavigation,
Mehrfachauswahl, Duplizieren, Undo/Redo, Lua-Import, native Diagnose und
Lua-/Installerexport. Funktions- und Zustandsgruppen besitzen stabile
Anschlüsse und getrennte Instanzen; verschachtelte Gruppen werden einmal als
Fabriken ausgegeben. Lokale Sicherungen und eine Revisionsprüfung zwischen
Browser-Tabs schützen die Bibliothek. Die drei Vorlagen liefern einfache
Textausgabe, einen Redstone-Schalter und zwei unabhängige Zähler.

Der Browser erzeugt Lua über den tatsächlichen CCVisual-Kern: Der Build
extrahiert dessen reine Modell-, Validator-, Parser- und Generatorquellen
einschließlich der Funktions-DTOs in einen JVM-Snapshot. Die Alpha-Bridge
übersetzt JSON in diese Modelle und ergänzt die Gruppenfabriken. Cobalt prüft
den resultierenden Lua-Quelltext. Es gibt keinen zweiten JavaScript-Generator
und keinen HTTP-Endpunkt zur Programmausführung. Ausführung findet nur in den
ausdrücklich gestarteten Cobalt-Testfällen mit Stubs statt.

Die Packseite erfasst den vollständigen oben beschriebenen Inventarstand;
zunächst sind zwölf ausgewählte Create-, CC-Standard- und Aeroworks-Methoden
als typisierte Peripheralknoten umgesetzt. Weitere Methoden können mit
universellen Lua-Aufrufen angesprochen werden. Das ersetzt noch nicht die
geplanten vollständigen Symbolverträge, Host-/Geräteverfügbarkeitsprüfung und
Fachgruppen für sämtliche Erweiterungen.

Weitere Grenzen dieser Alpha: Lokaler JVM-Vorschauserver erforderlich;
Alpha-JSON ist ein eigenes Browserformat und noch kein nativer Projektcodec;
kein gemeinsamer Eventdispatcher, keine externe unveränderliche
Gruppenbibliothek und kein Minecraft-/Mehrspieler-Nachweis. Automatisches
Extrahieren einer Gruppe verlangt explizite Datengrenzen und weist Roh-Lua
sowie implizite Variablen zurück. Solche Funktionen bleiben manuell anlegbar.

Verifikation: Repository- und Alpha-Modellprüfungen, tatsächliche native
CCVisual-/Cobalt-Tests und Browserprüfung von Einstieg, Gruppen, Codeinspektor,
Syntaxfehler/Korrektur, Speicherwiederherstellung, Copycat-Einbettung und
Pack-Suche. Native Fälle prüfen insbesondere getrennten Zustand, verschachtelte
Extraktion, Tupel mit nil-Lücken und einmalige Geräteabfragen. Die
Ingame-Abnahme und ein realer Zwei-Client-Lauf bleiben eigene nächste Schritte.

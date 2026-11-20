# Graphstudio

Gemeinsamer Arbeitsplatz für Copycat- und CC-Visual-Graphen.

Öffentlich: [Graphstudio](https://teutonstudio.github.io/.github/) ·
[Copycat-Editor](https://teutonstudio.github.io/.github/copycat/?editor=graph).
Der [Plan mit Bestandsaufnahme und Abnahmekriterien](../docs/GRAPHSTUDIO.md)
beschreibt die erste Fassung und den weiteren CC-Visual-Umbau.

## Öffentlicher Stand

Voraussetzungen: Node.js ab 22.12, npm, Git, Java 21, Bash, curl und Netzwerk
für öffentliche Quellen/Buildabhängigkeiten. Gradle muss Java 21 finden können.

```sh
cd graphstudio
npm test
npm run build
npm run preview
```

Vorschau: `http://127.0.0.1:4317/`. Der Copycat-Adapter liegt unter `copycat/`
und verwendet `?editor=graph`; alte Form-/Gebäudelinks öffnen denselben Graphen. Das Prüfmanifest steht
unter `studio.json`, der Fachkernvertrag unter `copycat/compatibility.json`.

Die Grundformenauswahl übernimmt alle 21 Einträge aus dem nativen Katalog,
inklusive Dach, halber Scheibe und Viertelscheibe. „Grundform wählen …“ öffnet
auch beim Ersetzen einer gespeicherten Referenz direkt die Grundformen.
Dachgeometrie und Scheibenanteil sind auch bei Grundformen im Referenzknoten
bearbeitbar; die gewählte Variante bleibt beim Speichern und Laden erhalten.

`sources.lock.json` legt den öffentlichen Modquellstand fest. Der Build lädt ihn
in `.cache`, kopiert den organisationsseitigen Webcode darüber und führt die
Modtests, Browsertests und den JVM-Rückimport aus. Erst dann entsteht `dist`.
`--source /pfad/zur/quellkopie` verwendet einen bereits vorhandenen **sauberen**
Checkout exakt dieses öffentlichen Commits. Lokale Mod-Arbeitskopien gehören
in den internen Lauf. Bei einem neuen Pin ggf. `.cache` löschen.

Der CI-Workflow baut ein PR-Prüfartifact. Auf `main` veröffentlicht er über
GitHub Pages, wenn im Repository **Settings → Pages → Source: GitHub Actions**
eingerichtet ist. Die tatsächliche URL liefert der Deployjob. Ein Modquellstand
und eine konkrete veröffentlichte Mod-JAR werden im Manifest unterschieden.

## Interner Entwicklungsstand

```sh
cd graphstudio
npm run internal -- --copycat "/pfad/zum/oeffentlichen-0.6.4-Entwicklungsstand" --local "/pfad/zur/lokalen/Copycat Architect"
npm run preview -- --internal
```

Der Organisationsadapter in `adapters/copycat/web` bleibt der Haupteditor.
Der Runner verwendet die native Arbeitskopie nur als Fachkern und legt den
Browserbuild getrennt unter `.cache/copycat-development` an. Er überschreibt
weder den Browserprototyp der lokalen Mod noch Webquellen im Mod-Checkout.
Java 21 und die vorhandenen Gradle-Abhängigkeiten werden benötigt. Fehlende
npm-Abhängigkeiten werden aus dem Lockfile installiert.

Die Pflichtprüfungen umfassen native Transformationen und Parameter,
JVM→Browser→JVM sowie mit `--local` den gemeinsamen Korpus durch beide
Modstände. Fehlende oder übersprungene Pflichtfälle brechen den Lauf ab.
Änderungen am Fachkern oder Adapter während der Prüfung brechen den Build ab.
Vorschau: `http://127.0.0.1:4318/`. Sie bindet nur an Loopback.

Transformationen benötigen Formgraphschema 4 bzw. Gebäudegraphschema 5; Vektorrechnung und der aneinanderliegende Säulenmodus benötigen Schema 5 bzw. 6.
`sources.lock.json` pinnt den veröffentlichten Fachkerncommit
[`e583178`](https://github.com/TeutonStudio/Copycat-Architecture/commit/e5831781f92985e65557f91be63c651d6955ce6c)
auf Basis 0.6.4, Branch `codex/graphstudio-direct-area-authoring`. Der neuere Mod-Hauptzweig
und vorhandene Release-JARs werden dadurch nicht ersetzt. Der öffentliche Build
prüft weiterhin saubere, gepinnte Quellen und den Mindestvertrag in
`adapters/copycat/core-contract.json`.

`.internal-dist` und `.cache` bleiben von Pages-Uploads ausgeschlossen.
Nach ausdrücklicher Freigabe wird der öffentliche Build über den Pages-Workflow
veröffentlicht. Der interne Entwicklungsstand bleibt davon getrennt. Issues werden
nicht automatisch geschlossen. CC Visual ist nicht Teil dieses Copycat-Laufs.

## Herkunft, Daten und Umzug

`adapters/copycat/web` stammt aus dem in `sources.lock.json` genannten öffentlichen
Commit, unter dessen MIT-Lizenz. Der Fachkern verbleibt im Modrepo; es gibt keinen
zweiten manuell nachgebauten Geometrievalidator. Der Browsercode wird hier
weitergepflegt und verwendet weiterhin den vorhandenen DTO-Generator.

Für den Wechsel die bisherige Graphstudio-Sicherung exportieren und im neuen
Editor importieren. Der IndexedDB-Name des öffentlichen Editors bleibt erhalten.
Bei derselben Origin können alte und neue Tabs auf denselben Speicher zugreifen;
die vorhandene Revisionsprüfung schützt vor konkurrierendem Überschreiben.
Der interne Port hat einen getrennten Browserspeicher.

Das bisherige Copycat-Deployment bleibt bis zur bestätigten Übernahme erreichbar.
Die vorliegende Fassung richtet noch keine alte URL um und beansprucht keine
CC-Visual-Browserfunktion oder Prüfung einer Release-JAR.

## Exakte Formvorschau

Die 3D-Vorschau zeichnet Dachformen und andere exakte Ausschnitte mit ihren
tatsächlichen polygonalen Schnittflächen. Das gilt auch für Copycats innerhalb
von Gebäuden. Die Rasterzellen- und Zinkzählung verwendet weiterhin das
konservative Kollisionsraster; gleiche Rasterzahlen bedeuten deshalb bei
exakten Formen keine identische sichtbare Geometrie. Insbesondere entfernt
`A XOR B` denselben Überlappungsbereich wie `(A vereinigt B) minus (A geschnitten B)`,
auch wenn der entfernte Bereich innerhalb einzelner Kollisionszellen liegt.

`adapters/copycat/web/test/exact-preview.test.js` prüft dies mit gekreuzten
Dachformen an den tatsächlich gerenderten Dreiecken: Volumen, freie Sicht durch
den Ausschnitt, Materialgruppen, Gebäudewiederholungen, leere Ergebnisse und
unveränderte Rasterformen.

Auch Drehungen direkt am Referenzknoten erhalten diese Ausschnitte und ihre
Materialgruppen. Der Fachkern hält temporäre Transformationsergebnisse als
gültige gespeicherte Quellgraphen. `reference-rotation.test.js` prüft Raster-
und exakte Dach-XOR-Ausschnitte um X/Y/Z mit 90°, 180° und 270°, JSON-Rundlauf
und anschließende Drehungen in Segmenten.

## Graphkarten, Rasterflächen und dynamische Segmente

Ein Graph enthält alle nativen Knotenfamilien. Der Ergebnisknoten bestimmt den
Ausgabetyp der Karte. Gespeicherte Knotengruppen werden als eigene Karten
geöffnet; Referenzen werden über die separate Einfügeaktion angelegt.
Bibliotheksversionen erscheinen unter einem gemeinsamen Eintrag. Im Löschdialog
werden versionengenaue Abhängigkeiten und Sperren angezeigt.

Flächen: Quadrat, Rechteck oder direkt im 2D-Raster zeichnen. Dynamische
Segmentachsen werden erst am Raum/Dach aufgelöst. Neue Dachknoten bieten fünf
Vorlagenanschlüsse und ermitteln deren Anwendungsstellen automatisch.
Flächen/Dynamik benötigen Gebäudegraphschema 7, gemeinsame Karten Schema 8.


## Flächenwerkzeuge und Spiegelachsenraster

Im Fläche-Knoten steht unter **Bedienung** die Auswahl **Malen**, **Rechteck ziehen**
und **Quadrat ziehen**. Ein Werkzeug übernimmt eine bisher über Anzahlen definierte
Fläche in das freie Raster. Rechteck und Quadrat zeigen beim Ziehen eine Vorschau;
ein Loslassen übernimmt den ganzen Strich als einen rückgängig machbaren Schritt.
Alt entfernt den gezogenen Bereich, Escape verwirft den Strich. Verkleinern einer
Vorschau hinterlässt keine vorher überstrichenen Zellen. Die Begrenzung auf 16384
Zellen und X/Z von −128 bis 127 bleibt erhalten; Überschreitungen verändern die
vorherige Fläche nicht. Die bestehenden Flächenformen und Anzahlanschlüsse bleiben
für die parametrische Eingabe verfügbar.

Die Spiegelachsenauswahl belegt die gesamte verfügbare Zeilenbreite und passt ihre
Rasterspalten an den Inspektor an. Reihenfolgeknöpfe stehen unter der Auswahl.
Kacheln zeigen die Ebene und ihre Achsenbezeichnung; die aktive Kachel wird markiert.
Pfeiltasten navigieren innerhalb des aktuellen Rasters, Home/End zur ersten/letzten
Ebene. Auch die Spiegeloperation in einer Operatorfamilie verwendet diese Auswahl.

## Direkte Flächen und Segmentanordnung

Rückgängig, Wiederholen und Löschen stehen in der Kopfzeile des Graphen neben
„+ Knoten“. Die Löschaktion berücksichtigt Knoten, Mehrfachauswahl und die
gewählte Verbindung. Materialgruppen und die Gebäudepalette öffnen über
„Wählen“ einen Dialog mit kleinen Blockvorschauen, Suche und Blockzuständen.
„Dieses Material verwenden“ übernimmt die Auswahl; Abbrechen und Escape
verwerfen sie. Die direkte Eingabe einer Material-ID bleibt möglich.

Neue Segmente und Räume nehmen Flächen unmittelbar an. Tiefe beziehungsweise
Raumhöhe und weitere Einstellungen stehen am Verbraucher im Inspektor.
Neue Dächer verwalten dort bis zu 16 Dachflächen mit stabilen Kennungen,
Geschossbindung, Dacheinstellungen und Gauben. Jede Dachfläche hat einen
eigenen Flächenanschluss. Die bisherigen Knoten Segmentanordnung,
Raumgrundriss, Dachebene und Dachanordnung werden bei neuen Knoten ausgeblendet;
vorhandene Graphen mit diesen Knoten bleiben bearbeitbar.

Bei Segmentoperatoren ergänzt eine eigene 2D-Anordnung die 3D-Vorschau und den
Inspektor. Alle drei Bereiche lassen sich getrennt einklappen und in der Höhe
verändern. Vereinigung, Schnitt, Differenz und symmetrische Differenz erlauben
für jeden Eingang einen ganzzahligen X-/Y-/Z-Versatz in Blöcken, auch wenn
dieselbe Quelle mehrfach angeschlossen ist. Front-, Drauf- und Seitenansicht
zeigen den gemeinsamen Ursprung. Ziehen, Pfeiltasten und Zahlenfelder ändern
die Anordnung zunächst als Entwurf mit unmittelbarer 3D-Vorschau.
„Anordnung übernehmen“ erzeugt einen gemeinsamen Undo-Schritt; „Verwerfen“
verwirft den Entwurf. Unäre Segmenttransformationen zeigen Quelle und Ergebnis
zum Vergleichen. Die vorhandene Musteranordnung nutzt denselben Bereich.

Die neuen direkten Verbindungen, eingebetteten Dachflächen und relativen
Segmentversätze verwenden Gebäudegraphschema 11. Bestehende DTO-Felder und die
Auswertung älterer Graphen bleiben erhalten. Der Browser verwendet dafür den
kanonischen Kotlin-Fachkern. Der öffentliche Build pinnt dafür den geprüften
Quellstand in `sources.lock.json`; ältere gespeicherte Graphen bleiben nutzbar.

Die [Abnahme vom 20. November 2026](reports/graphstudio-authoring-2026-11-20.md)
enthält Prüfbefehle, Ergebnisse und Ansichten.

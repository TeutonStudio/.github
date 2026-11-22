# Graphstudio

Gemeinsamer Arbeitsplatz für Copycat- und CC-Visual-Graphen.

## Lokale gemeinsame Alpha · 0.2.0-alpha.1

Die neue Alpha liegt vollständig in diesem Organisationsrepo. Sie verwendet
einen eigenen Build unter `.alpha-dist` und den Vorschauport **4319**. Der
bisherige Copycat-Editor, sein Repository und dessen Veröffentlichung werden
durch diese Alpha nicht ersetzt. Die bestehenden öffentlichen und internen
Buildwege weiter unten bleiben eigenständig.

```sh
cd graphstudio
npm test
npm run test:alpha
npm run alpha
npm run preview:alpha
```

Vorschau: `http://127.0.0.1:4319/`. `npm run alpha` verwendet standardmäßig die
benachbarte Arbeitskopie `../../CCVisual` sowie den bereits eingerichteten
Copycat-Fachkern unter `.cache/copycat-development`. Andere Quellpfade:

```sh
npm run alpha -- --ccvisual /pfad/zu/CCVisual --copycat /pfad/zum/Copycat-Fachkern
```

Voraussetzungen: Node.js ab 22.12, Java ab 21, aufgelöste CCVisual-Gradle-
Abhängigkeiten und ein mit dem Organisationsadapter kompatibler Copycat-Kern.
Der native Helper verwendet die vorhandenen Maven-Artefakte im Gradlecache:
Kotlin 2.3.0, Cobalt 0.9.9 und Gson 2.11.0 samt Compilerabhängigkeiten. Fehlende
Abhängigkeiten werden mit genauer Koordinate gemeldet. Beim ersten Browserbuild
installiert `npm ci` die im Lockfile festgelegten Pakete. Quelltextänderungen
benötigen anschließend einen neuen Alpha-Build und ein Neuladen der Vorschau.

Die Alpha enthält:

- Gemeinsamen Einstieg für CC Lua, den Copycat-Organisationsadapter und die
  Pack-API-Bestandsaufnahme. Copycat wird erst beim ersten Öffnen geladen und
  bleibt danach beim Bereichswechsel erhalten.
- 90 native beziehungsweise ausgewählte API-Knotentypen. Der noch nicht
  angebundene Snippet-Knoten bleibt ausgeblendet. Drag/Zoom, typisierte
  Verbindungen, Inspektor, Suche, Mehrfachauswahl, Duplizieren und Undo/Redo.
- Wiederverwendbare Funktions- und Zustandsgruppen mit stabilen Schnittstellen,
  mehreren Instanzen, verschachtelten Aufrufen und eigenem `state` je Instanz.
  Die Definition wird einmal erzeugt; Instanzen behalten getrennten Zustand.
- Automatisches Gruppieren für eine Auswahl mit genau einem Ablaufeingang und
  höchstens einem Ausgang. Roh-Lua und implizite Variablen werden dabei
  abgewiesen, da eine automatische Ermittlung ihrer Closures noch fehlt.
- Browserbibliothek mit Revisionserkennung zwischen Tabs, bis zu 32 Projekten,
  acht lokalen Sicherungen und JSON-Import/-Export. Lua-Import verwendet den
  nativen Parser; ungültige Entwürfe bleiben als Codeknoten bearbeitbar.
- `main.lua` mit eingebetteten Gruppen und Offline-Installer für ein neues
  Verzeichnis. Lua-Export setzt erfolgreiche native Validierung und
  Cobalt-Syntaxprüfung voraus. Die Vorschau führt keine Programme aus.
- Drei Vorlagen: Hallo Werkstatt, Redstone-Schalter und zwei unabhängige Zähler.
  Die Packseite zeigt 39 relevante Container einschließlich indirekter und
  eingebetteter Integrationen sowie die sechs lokalen Inventarlücken.

`adapters/ccvisual/native/AlphaBridge.kt` ist ein Transport- und Paketadapter.
Der Build extrahiert die reinen Graph-/Validator-/Parser-/Generatorquellen und
Funktions-DTOs aus CCVisual; er verändert diese Quelldateien nicht und baut
keinen zweiten JavaScript-Lua-Generator. Der native Prozess ist nur über den
Loopback-Vorschauserver erreichbar. Es gibt keine Browser- oder HTTP-Aktion zur
Lua-Ausführung. Das Buildmanifest hält Quellfingerabdrücke fest und wird beim
Start gegen die native Bridge geprüft.

**Prüfgrenze:** Vollständige typisierte Modpackverträge, gerätebezogene
Liveverfügbarkeit, ein gemeinsamer Eventdispatcher, unveränderliche externe
Gruppenbibliotheken und Minecraft-/Mehrspielerabnahme folgen nach dieser Alpha.
Zunächst stehen zwölf ausgewählte API-Methoden als typisierte Peripheralknoten
bereit. Die übrigen Schnittstellen können über generische Lua-Aufrufe und
Codeknoten angesprochen werden. Das Alpha-JSON ist ein eigenes Browserformat;
es wird nicht als nativer CCVisual-NBT-Import ausgegeben. Eine statische
Pages-Kopie besitzt die lokale JVM-Prüfung noch nicht.

`npm test` prüft den vorhandenen öffentlichen Buildvertrag und das Alpha-Modell.
`npm run test:alpha` prüft zusätzlich den tatsächlichen CCVisual-/Cobalt-Kern,
einschließlich getrennter Instanzzustände, verschachtelter Gruppen,
Mehrfachrückgaben mit nil-Lücken und einmaliger Peripheralabfragen bei mehreren
Verbrauchern. Die Hardware wird dabei durch ausdrücklich definierte Stubs
ersetzt. Diese Tests sind kein Minecraft-Laufzeitnachweis.

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
npm run internal -- --copycat "/pfad/zum/oeffentlichen-0.6.5-Entwicklungsstand" --local "/pfad/zur/lokalen/Copycat Architect"
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
[`7e1771d`](https://github.com/TeutonStudio/Copycat-Architecture/commit/7e1771de7545b31130a2a751ba2759beaf6d4bdb)
auf Basis 0.6.5, Branch `codex/roof-dormers`. Der neuere Mod-Hauptzweig
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
kanonischen Kotlin-Fachkern. Diese Funktionen stehen im lokalen Alpha-Build
mit dem passenden Entwicklungskern bereit; `sources.lock.json` bleibt beim
bisherigen öffentlichen Stand.

Die [Abnahme vom 20. November 2026](reports/graphstudio-authoring-2026-11-20.md)
enthält Prüfbefehle, Ergebnisse und Ansichten.


### Aktuelle Knotenkonfiguration und Zahlenwerte

Knotenkarte und Knotenwähler verwenden dieselben bedienbaren Entwürfe. Operation,
Transformationsreihenfolge, Dach-/Raum-/Geschossmodus und Eingangsanzahl sind direkt
am Knoten einstellbar. Die rechten Anschlusskreise sortieren Operanden per Ziehen
oder Pfeiltasten einschließlich ihrer Verbindungen. Beim Geschoss stehen 3D und
eine 2D-Raumanordnung mit gemeinsamem Undo/Redo zur Verfügung.

Die Operatorfamilien umfassen Copycat-, Segment-, Positions- und Zahlenoperatoren.
Bedingte Abbildung, Booleanlogik, Zahlenvergleich einschließlich Teilbarkeit und
Dachvorlagen verwenden den Kotlin-Fachkern. Neue Dächer wählen zwischen Fläche
mit Dachvorlage und Fläche mit acht Bauteilanschlüssen. Dach- und Schachtsegmente
lassen sich mit Segmentoperatoren weiterverarbeiten.

Formgraphschema 9 bzw. Gebäudegraphschema 13 unterscheiden Ganzzahl und Anzahl.
Neue Zahlenquellen starten als Anzahl 0; Betrag, Als Anzahl und Divisionsrest sind
native Operationen. COUNT erweitert sich implizit zu INT, die Gegenrichtung ist
ausdrücklich. Alte Dokumente behalten beim Öffnen ihre Zahlenregeln; eine
Hochstufung ergänzt benötigte Als-Anzahl-Knoten im selben Undo-Schritt.

### Ergebnis und Graphparameter (0.6.5)

Neue Graphkarten erzeugen ihren Copycat unmittelbar am Ergebnis. Ausgabetyp, Erzeugungsmodus und Erzeugungsart stehen auf der Knotenkarte; die Anschlüsse und Einstellungen stammen vom normalen Fachknoten. Bestehende Karten bleiben im Modus „Wert übernehmen“.

Gruppeneingänge definieren die öffentliche Schnittstelle eines Graphen. Ihre stabilen Knotenkennungen identifizieren die Argumentanschlüsse; Name, Datentyp, Standardquelle und gespeicherte Reihenfolge können bearbeitet werden. Eine gespeicherte Referenz bindet eine genaue Version samt Bibliotheksabhängigkeiten ein. Dies gilt auch für Dachvorlagen und verschachtelte Referenzen.

Gebäudegraphschema 14 ergänzt diese Funktionen. Formgraphschema 9 und bisherige Gebäudegraphen bleiben lesbar. Die Auswahlfelder verwenden die gemeinsam übernommenen SVG-Icons.

### Dachvorlagen und Gauben (Graphschema 17)

Dachvorlagen bieten die ergänzten Bauteilanschlüsse und eine optionale Vorschaufläche. Die Dachkontur kann zwischen Gesamtfläche und tatsächlichem Grundriss gewählt werden. Der Inspektor wechselt gespeicherte Referenzversionen am vorhandenen Knoten.

Sattelgauben lassen sich an modernen Dächern und direkt erzeugenden Ergebnissen anschließen, im 2D-Grundriss platzieren und bearbeiten. Die Engine prüft die vollständige sichtbare Dachschräge einschließlich Kehlen, Löchern, Anschluss und Überschneidungen. Ungültige Entwürfe werden begründet; Platzieren, Verschieben und Inspektoränderungen unterstützen Undo/Redo. Die Positionen gehören zum verwendenden Dach und bleiben bei einem Vorlagenwechsel erhalten.

[Bedienung und Prüfnachweis](reports/roof-dormers-2026-11-22.md) · [Beispielgraph mit eingefrorener Testdach-Vorlage](adapters/copycat/web/public/examples/testdach-dormer-building.json).

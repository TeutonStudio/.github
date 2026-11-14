# Graphstudio

Gemeinsamer Arbeitsplatz für Copycat- und CC-Visual-Graphen.
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
und unterstützt `?editor=form` sowie `?graph=building`. Das Prüfmanifest steht
unter `studio.json`, der Fachkernvertrag unter `copycat/compatibility.json`.

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
npm run internal -- --copycat "/pfad/Copycat Architect" --ccvisual /pfad/CCVisual
npm run preview -- --internal
```

Bei der üblichen lokalen Verzeichnisstruktur können beide Pfade entfallen.
Vorschau: `http://127.0.0.1:4318/`. Nur Loopback, keine öffentliche Auslieferung.
Der Runner führt die nativen Modtests offline erneut aus. Buildabhängigkeiten
müssen bereits vorhanden sein. Im lokalen Copycat-Prototyp müssen außerdem die
npm-Abhängigkeiten in `web/graph-editor` installiert sein. Er wird getrennt
getestet und gebaut; das ist noch kein gemeinsamer Browser–Mod-Paritätsnachweis.

CC Visual erhält zunächst einen Testbericht. Sein Editor läuft weiterhin im
Minecraft-Client. Der optionale native UI-Test lautet im CC-Visual-Repo:

```sh
./gradlew -I devtests/kilagraph-ui.gradle runClient --offline
```

Ein fehlgeschlagener Testlauf erzeugt einen sichtbaren Fehlerstatus und endet
mit Exitcode 1. Frühere Prüfergebnisse werden nicht als neue Erfolge übernommen.
`.internal-dist` und `.cache` sind Git-ignoriert und nie Pages-Uploadquellen.
Internes Remotehosting mit Zugriffskontrolle ist ein späterer Schritt.

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

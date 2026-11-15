# Graphstudio

Gemeinsamer Arbeitsplatz für Copycat- und CC-Visual-Graphen.

Öffentlich: [Graphstudio](https://teutonstudio.github.io/.github/) ·
[Copycat-Editor](https://teutonstudio.github.io/.github/copycat/?editor=form).
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

Transformationen benötigen Formgraphschema 4 bzw. Gebäudegraphschema 5.
`sources.lock.json` pinnt den veröffentlichten Fachkerncommit
[`10a3693`](https://github.com/TeutonStudio/Copycat-Architecture/commit/10a369358e821abea048d432d42aa35b2dc4373c)
auf Basis 0.6.4, Branch `codex/graphstudio-core-064`. Der neuere Mod-Hauptzweig
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

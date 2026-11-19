# Operatoren und Knotenbibliothek

Dieser Arbeitsstand erweitert den veröffentlichten Graphstudio-Adapter `a865b81` und den dazugehörigen Copycat-Fachkern `a21a968`. Die geparkten Arbeitsstände wurden nicht überschrieben.

## Bedienung

- **+ Knoten hinzufügen** steht rechts in der Kartenkopfzeile neben Name und Graphversion.
- Die flache Bibliothek zeigt dieselbe Knotendarstellung wie die Karte: Ein- und Ausgänge, Operatorauswahl mit Symbol und Name und eine Erklärung.
- Anklicken und Operatorwechsel bearbeiten nur die Vorschau. Einfügen erfolgt durch Ablegen auf der Karte oder über den ausdrücklich beschrifteten Einfügeknopf. Der Greifpunkt bleibt bei Pan und Zoom unter dem Zeiger. Abwurf außerhalb der Karte, Escape und Abbruch erzeugen keinen Knoten.
- Suche berücksichtigt Namen, Aufgaben und Operatoren. Anschlussfilter lassen sich mit verschachtelten UND-/ODER-Gruppen verbinden. Filter bieten semantische Typgruppen sowie konkrete Typen wie Boden und Decke. Sortierung wählt Kriterium und Reihenfolge; Gruppierung erzeugt einklappbare Gruppen.
- Operatorauswahl steht auch direkt in den Kartenknoten und im Inspektor. Kompatible Eingänge werden in Operandenreihenfolge übernommen. Unpassende und überschüssige Kabel entfallen; fehlende Eingänge bleiben offen. Knoten-ID, Position, Name und ausgehende Kabel bleiben erhalten.

## Fachvertrag

Sechs Familien: Copycat-, Segment-, Positions- und Anzahl-Operator sowie Relation und Aussage. Bestehende Einzeloperatoren bleiben importierbar; die Bibliothek fasst sie visuell zusammen. Die bisherigen komponentenweisen Positionsrechnungen, Position zerlegen, Transformationslisten, Referenzen, Versionen und Grundformen bleiben verfügbar.

- Segment-Mengenoperationen arbeiten mit exakter Geometrie an gemeinsamen, auch negativen Koordinaten. Fehlende Zellen sind leere Mengen. Sie entsprechen passenden Copycat-Mengenoperationen pro Zelle.
- Normale Blöcke werden aus den Operanden herausgenommen und nach der Operation unverändert an ihrer ursprünglichen Position eingesetzt. Normale Blöcke gewinnen gegenüber Copycat-Geometrie; verschiedene normale Blöcke an derselben Position melden einen Konflikt.
- Relationen benötigen mindestens einen verbundenen Zahleneingang; der zweite Eingang kann den Vergleichswert im Inspektor verwenden. Teilbarkeit prüft `A mod B = 0`; Division und Teilbarkeit durch null melden einen Fehler.
- Aussagen verwenden ausschließlich boolesche Eingänge. Enthalten sind Wahr/Falsch, UND, ODER, **Entweder oder**, NICHT, Implikation und Äquivalenz.
- Ganzzahlrechnungen prüfen Überlauf. Division schneidet zur Null ab.
- Neue Dokumente verwenden Formgraph-Schema 6, Formdokument-Schema 5 beziehungsweise Gebäudegraph-Schema 9. Bestehende Dokumente behalten ihre bisherigen Schemas, bis neue Operatoren verwendet werden. Ältere Mod-Versionen können diese neuen Schemas nicht lesen.

## Entwicklung und Prüfung

Die Oberfläche bleibt im Organisationsrepository unter `graphstudio/adapters/copycat/web`; die Fachlogik liegt im separaten Copycat-Checkout. Der bestehende interne Runner verbindet beide:

```sh
cd graphstudio
npm run internal -- --copycat /pfad/zum/copycat-operators-live/Copycat\ Architect
```

Die öffentliche Fassung pinnt den kompatiblen Fachkern `6c672af` in `sources.lock.json`. `core-contract.json` verlangt Formgraph-Schema 6 und Gebäudegraph-Schema 9. Der öffentliche Build verwendet ausschließlich die committeten Dateien dieses veröffentlichten Pins und prüft den Austausch zwischen JVM und Browser.

Prüfungen: vollständige JVM-Suite, neuer exakter Operatorvertrag, Browserregressionen einschließlich Grundformen, Referenzen und Transformationslisten, JVM → Browser → JVM, Produktionsbuild und manuelle Browserbedienung einschließlich Drag-Greifpunkt bei Zoom sowie ungültigem Abwurf.

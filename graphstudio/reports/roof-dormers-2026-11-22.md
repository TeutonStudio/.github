# Dachvorlagen und Gauben · 22. November 2026

Der Editor unterstützt Dachvorlagen mit vollständigen Bauteilanschlüssen, optionale Vorschauflächen und die Wahl zwischen Gesamtfläche und Grundrisskontur. Referenzversionen lassen sich im bestehenden Knoten wechseln. Die orangefarbenen Maßstriche haben Bildschirmgrenzen; das Namensfeld der Gruppeneingänge bleibt innerhalb des Knotens.

Sattelgauben funktionieren an Sattel-, Pult- und Kreuzdächern mit beiden Konturmodi, einschließlich direkt erzeugender Ergebnis-Knoten und eingefrorener Vorlagenreferenzen. Der gemeinsame Kotlin-Kern prüft die gesamte Grundfläche auf sichtbaren, zusammenhängenden, koplanaren Dachschrägen. Die UI bietet 2D-Platzierung, Verschieben, Richtung mit Icons, Deckenausschnitt, konkrete Diagnosen und Undo/Redo. Während eines Entwurfs läuft nur die Platzierungsprüfung; die 3D-Geometrie folgt nach dem Übernehmen. Graphschema 17 kennzeichnet die neuen Verwendungen.

## Nachweise vor der Veröffentlichung

- Browser: vollständiger Lauf mit 378 von 378 erfolgreichen Tests.
- Native Engine: 700 verschiedene Fälle erfolgreich. Im vollständigen Lauf waren 699 von 700 erfolgreich; ein neuer Gruppentest hatte eine falsche Erwartung zur bestehenden gemeinsamen Gruppenbearbeitung. Nach Korrektur ausschließlich dieser Erwartung bestanden alle zwölf Gaubentests erneut. Der öffentliche CI-Build führt den vollständigen Lauf mit der korrigierten Erwartung aus.
- Produktionsbuild und JVM–Browser–JVM-Austausch erfolgreich.
- Browser-Sichtprüfung: Platzieren, Richtung, ungültige Position, Escape, Verschieben, Undo/Redo sowie Haupt- und Bibliotheksvorschau.
- Das ursprüngliche Testdach mit eingefrorener Vorlage und Gaube auf 133 Rasterzellen erzeugt 339 Platzierungen und 17.255 belegte Zinkzellen ohne externe Bibliothek. Der kleine Grundriss mit 27 Zellen weist zu große Gauben mit einer Platzdiagnose ab.
- Die erste vollständige Berechnung komplexer Boolean-Dachvorlagen kann länger dauern. Ein Minecraft-Spielweltlauf wurde nicht durchgeführt.

## Bedienung


Die vorhandene Sattelgaube lässt sich auf Sattel-, Pult- und Kreuzdächern verwenden. Das funktioniert mit den Dachkonturen „Gesamtfläche wie bisher“ und „Grundriss mit Dachecken“, sowohl bei „Fläche, Dachvorlage“ als auch „Fläche, Segmente …“.

## Definition und Platzierung

1. Einen **Gauben-Knoten** hinzufügen. Wandsegment, Fensterfront und Copycat-Dachquelle anschließen. Wand und Front benötigen feste Segmentperioden mit Tiefe 1; für schräge Schnitte Copycat-Geometrie verwenden. Die Dachquelle muss den benötigten Dachquerschnitt vollständig abdecken. Ein voller Copycat-Block eignet sich als Ausgangsquelle.
2. Am Gauben-Knoten Innenbreite, Innentiefe, vordere Wandhöhe und Dachneigung einstellen. Die Maße sind ganze Blöcke. Die Außenmaße enthalten zusätzlich die beiden Wandreihen.
3. Das verwendende **Dach** oder einen direkt Dach erzeugenden **Ergebnis-Knoten** auswählen. Unter „Gauben am Dach“ die Gaubenquelle wählen und „Neue Gaube platzieren“ drücken.
4. Im Bereich „Gauben · X/Z“ eine Position anklicken. Die Richtung „Automatisch hangabwärts“ schlägt eine passende Ausrichtung vor. Position und Vorderseite können auch im Inspektor eingestellt werden.

Eine Definition kann mehrfach verwendet werden. Je Dachfläche sind höchstens 16 Instanzen möglich. Gaubenpositionen gehören zum verwendenden Dach; die referenzierte Dachvorlage wird nicht verändert.

## Bearbeitung

Vorhandene Gauben im Grundriss oder im Inspektor auswählen. Ziehen verschiebt die Gaube um ganze Blöcke. Die Pfeiltasten verschieben einen Entwurf; Enter übernimmt und Escape verwirft ihn. Ungültige Entwürfe erscheinen rot und werden nicht übernommen. Die mittlere Maustaste verschiebt das Raster; Plus, Minus und Einpassen ändern die Ansicht.

Jede übernommene Aktion lässt sich mit Rückgängig/Wiederholen korrigieren. Während des Ziehens wird nur die Platzierung geprüft. Die vollständige 3D-Vorschau wird nach dem Übernehmen neu berechnet. Bei komplexen Boolean-Dachvorlagen kann diese erste Berechnung länger dauern.

**Geschossdecke öffnen** schneidet im vollständigen Gebäude die Decke unter dem Innenraum der Gaube aus. Die reine Dachvorschau enthält keine Geschossdecke.

## Passende Dachschrägen

Die gesamte Gaube muss auf eine zusammenhängende, ebene, sichtbare Schräge passen. Koplanare Teilflächen dürfen sie gemeinsam tragen. Firste, Grate, Kehlen, Löcher und Ausschnitte dürfen nicht überquert werden. Die Vorderseite zeigt hangabwärts. Wandhöhe und Tiefe müssen den hinteren Anschluss ermöglichen. Gauben dürfen sich nicht überlappen.

Ein kleiner Grundriss kann für die gewählte Gaube zu eng sein. In diesem Fall Innenmaße und Höhe reduzieren oder eine größere Dachfläche verwenden. Änderungen am Grundriss und an der Dachvorlagenversion behalten die Gaubenpositionen bei und zeigen unpassend gewordene Instanzen zur Korrektur an.

## Austausch

Gauben am modernen Dach sowie an Kreuz-/Konturdächern verwenden Graphschema **17**. Die vorhandene optionale `dormers`-Liste enthält weiterhin Quelle, Instanzkennung, X/Z-Position, Richtung und Deckenausschnitt. Ältere Dachebenen und eingebettete Dachflächen bleiben unterstützt. Die Gaubenanschlüsse des modernen Dachs behalten ihre Identität anhand der Instanzkennung beim Entfernen anderer Instanzen.

## Beispiel

Den [selbstständigen Beispielgraphen](../adapters/copycat/web/public/examples/testdach-dormer-building.json) im Bibliotheksdialog als JSON importieren. Er enthält die eingefrorene Dachvorlage samt Abhängigkeiten und eine platzierte Gaube. Im veröffentlichten Editor steht die Datei unter `copycat/examples/testdach-dormer-building.json` bereit.

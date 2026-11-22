# Graphstudio: Knotenbewegung und Latenzen — 22. November 2026

Die Optimierung liegt im aktiven Organisationsadapter unter `adapters/copycat/web`.
Bei 96 Knoten sinkt die gemessene P95-Dauer einer automatisierten Mausbewegung
im Produktionsbuild um **51.0 %**; die JavaScript-Arbeit während des
Ziehens sinkt um **95.4 %**. Diese erste Messreihe verwendete den lokalen
0.6.4-Fachkern. Für die Veröffentlichung wird die Browserkorrektur gezielt auf
den aktuellen öffentlichen 0.6.5-Stand übertragen; dessen Fachkern-Pin und
neuere Knotenfunktionen bleiben erhalten.

## Gefundene Ursachen und Änderungen

- `onNodeDrag` aktualisierte bei jeder Bewegung den gesamten `Studio`-Zustand.
  Dabei entstanden für alle Knoten neue `data`-Objekte und Operationscallbacks.
  Das löste erneute Darstellungen von Knotenkarten und Seitenbereichen aus.
- Die Argumente von `useHistory(...)` und `useState(...)` öffneten den gespeicherten
  Entwurf bei jedem Render erneut mit `openCard`. Das kopierte Bibliotheken und
  führte den nativen Decoder und Strukturprüfungen wiederholt aus. Beide
  Initialisierungen erfolgen jetzt ausschließlich beim ersten Anlegen des Zustands.
- `GraphCanvas` verwaltet laufende Positionen und DOM-Maße lokal mit den vorhandenen
  React-Flow-Änderungsfunktionen. Der Dokumentzustand wird einmal beim Loslassen
  übernommen. Knotendaten bleiben während des Ziehens stabil. Die Auswahl wird
  weiterhin mit dem Editor synchronisiert.
- Projektionen erhalten gemessene Größen und laufende Bewegungen. Nach dem
  Loslassen gelten die nativen gerundeten/begrenzten Positionen; verworfene oder
  unveränderte Bewegungen setzen die Anzeige auf den Dokumentstand zurück.
  Unveränderte Positionen erzeugen keine native Ersetzung oder Undo-Aktion.
- Gruppenbewegungen, native Koordinatengrenzen und die vorhandene atomare
  Undo-/Redo-Transaktion bleiben beim nativen `moveViewNodes`/`replaceNodes`-Ablauf.

## Produktionsmessung

Chromium 148.0.7778.167, headless, 1440 × 1000, CPU-Faktor 1, identischer
Kotlin/JS-Fachkern und identische Graphen. Je Szenario drei frische Browserkontexte
und jeweils 60 Mausbewegungen nach Beginn des Ziehens. Die Graphen enthalten
Anzahlquellen, Rechenoperatoren und Verbindungen; 96 Knoten entsprechen dem
aktuellen Kataloglimit. Die Tabelle zeigt den Median der drei Läufe. Während der
abschließenden Messungen liefen keine Builds oder Tests parallel.

| Knoten | gleichzeitig bewegt | Mausbewegung P95 | JS während 60 Bewegungen | Loslassen |
| ---: | ---: | ---: | ---: | ---: |
| 12 | 1 | 18.33 → 17.29 ms | 251.48 → 45.09 ms | 44.71 → 47.35 ms |
| 48 | 1 | 26.53 → 16.97 ms | 653.38 → 40.83 ms | 72.37 → 64.08 ms |
| 96 | 1 | 35.05 → 17.16 ms | 1184.66 → 54.62 ms | 108.44 → 96.88 ms |
| 96 | 5 | 34.40 → 17.19 ms | 1169.75 → 73.33 ms | 102.68 → 96.76 ms |

Die Mausdauer ist die Playwright-Befehlslaufzeit bis zur Browserbestätigung,
keine universelle Hardware-Eingabe-bis-Pixel-Messung. Der JS-Wert stammt aus
Chromes `Performance.getMetrics`/`ScriptDuration`. Die Dauer beim Loslassen
enthält zwei nachfolgende Animationsframes und Protokollkosten. Absolute Werte
hängen von Rechner und Browser ab. Der verbleibende Aufwand beim Loslassen
umfasst native Gruppensynchronisation, Validierung, einmalige Projektion und
Speicherung; diese Arbeit wurde nicht aus den Messungen entfernt.

Alle 24 abschließenden Vorher-/Nachher-Läufe blieben ohne JavaScript-Fehler und
ohne neue Vorschau-Worker-Aufträge durch reine Layoutänderungen. CPU-Profile der
Entwicklungsfassung bestätigten zusätzlich die wiederholte native Decodierung
und Knotendarstellung als Engpässe. Entwicklungswerte wurden nicht mit
Produktionswerten vermischt. Rohwerte und Prüfsummen:
[node-drag-performance-2026-11-22.json](node-drag-performance-2026-11-22.json).

## Prüfungen

- **320/320** Adapter-, Fachkern-, Austausch-, Bibliotheks-, Layout- und
  Regressionstests bestanden; keine übersprungenen Tests.
- **3/3** Buildvertragsprüfungen bestanden.
- Produktionsbuild erfolgreich. Bereits vorhandene Warnungen zu doppelten
  Bezeichnern in `NativeFields.jsx` und großen Bundles wurden nicht verändert.
- `verify-node-drag-browser.py`: bestanden. Prüft ausbleibende Eltern-Render
  während des Ziehens, genau eine Übernahme, verworfene Bewegungen,
  Mehrfachauswahl, eingeklappte Gruppen, native JSON-Daten, Undo/Redo,
  Wiederladen und Ansichtspositionen gespeicherter Versionen.
- `verify-dropdown-icons-browser.py`: bestanden; Tastatur, Dropdowns, Graphzoom,
  Ziehen und Desktop-/Mobilansichten.
- `verify-authoring-browser.py`: bestanden; Löschen/Undo/Redo, 2D-Anordnung,
  Vorschau, Materialdialoge, Fokus und Desktop-/Tablet-/Mobilansichten.
- **Vier bestehende Legacy-Skripte sind weiterhin nicht erfolgreich**:
  `verify-graphstudio-browser.py` erwartet eine globale Schaltfläche „JSON öffnen“;
  `verify-preview-hud-browser.py`, `verify-rotation-segment-browser.py` und
  `verify-roof-peak-browser.py` erwarten „Beispiel öffnen“ unmittelbar im Editor.
  Diese Elemente liegen inzwischen im Bibliotheksdialog. Die identischen
  Locator-Timeouts wurden sowohl vor als auch nach dieser Änderung reproduziert.
  Die Skripte wurden nicht als bestandene Prüfungen gezählt. Die aktuellen
  Browserprüfungen und die neuen Drag-Tests verwenden den Bibliotheksdialog.

## Wiederholen

Die Adapterquellen werden wie bisher über den öffentlichen oder internen Runner
mit dem kanonischen Fachkern kombiniert. Die Prüfungen hier verwendeten eine
isolierte Overlaykopie des aktuellen Adapters und den vorhandenen geprüften
Fachkern aus `.cache/copycat-build/web/src/generated/engine.mjs`; der Fachkern
wurde für diese reine Browseränderung nicht neu implementiert oder verändert.

Im vorbereiteten Web-Overlay mit generiertem Fachkern und installierten Paketen:

```sh
node --test --experimental-test-isolation=none --test-concurrency=1
node node_modules/vite/bin/vite.js build
python tools/verify-node-drag-browser.py --url http://127.0.0.1:5173 --chromium /pfad/zu/chromium
python tools/profile-node-drag.py --url http://127.0.0.1:4173 --chromium /pfad/zu/chromium --repeats 3 --output /tmp/node-drag.json
```

Der Browser-Regressionslauf benötigt den Vite-Entwicklungsserver für seine
Testfixture. Die Zeitmessung kann gegen den separat gestarteten Produktionsbuild
laufen. `--profile` ergänzt CPU-Profile; `--cpu-rate 4` erlaubt einen zusätzlichen
Drosselungstest. Playwright für Python wird wie bei den vorhandenen Browserskripten
benötigt. Die Browserkontexte und deren Speicher sind vollständig isoliert.

# Sicherheitsunterweisungen – Stand 24.09.2026

## Versionsvergleich

- Lokal: Branch `Production-Dev`, Basis `072644c`, zusätzlich bereits vorhandene uncommittete Änderungen (u. a. E-Mail-Login und Wissensdatenbank).
- GitHub `master`: `072644ce48895c5b4773db4bf71d7e4af7ff3e08`.
- GitHub `Production-Dev`: `879dcb3`; anderer Entwicklungsstand mit eigener Auth-Umstellung. Nicht blind zusammengeführt.
- Öffentlich: https://pellettrackr.netlify.app. Die abgerufene `js/core/auth.js` entspricht `master` und bietet den bisherigen Kennungs-/Admin-Login. Das öffentliche `index.html` ist nicht bytegleich mit `master`. Daher lässt sich nicht die gesamte Veröffentlichung einem Commit sicher zuordnen.
- Öffentlich und lokal verweisen auf dasselbe Firebase-Projekt `fgf-3d-druck`. Auch ein lokaler Start kann somit echte Daten verändern. Es wurde keine Produktionsdatenänderung, kein Push und kein Deployment durchgeführt.

## Bedienung

Im Admin-Dashboard „Nutzer verwalten“ → „Unterweisungen verwalten“ öffnen. Kein eigener Unterweisungsbereich auf dem Dashboard. Über „Maschinen & Unterweisungsarten“ vorhandene Drucker und Equipment als unterweisungspflichtig markieren. Allgemeine Nachweisarten wie „Laserschein“ können separat angelegt werden.

„Einweisung hinterlegen“ erfasst Person, vorhandene Maschine oder Nachweisart, Datum, durchführende Person und optional Notiz/Nachweisnummer. Datum darf nicht in der Zukunft liegen. Die Übersicht bietet Suche, Maschinen-/Statusfilter und Sortierung; fehlende Einweisungen werden für als erforderlich markierte Maschinen angezeigt.

„Entziehen“ deaktiviert einen Nachweis nach Bestätigung. „Erneut einweisen“ erfasst eine neue Bestätigung. Die Historie behält vorherige Zustände, Bearbeiter und Zeitpunkte. Nutzer sehen ausschließlich ihre eigenen Nachweise unter „Mein Profil“ → „Meine Einweisungen & Nachweise“. Der Abschnitt ist standardmäßig eingeklappt und wird erst beim Öffnen geladen. Er enthält keine Bearbeitungsaktionen; eigene Rechte lassen sich auch über die vorgesehenen Firestore-Regeln nicht selbst ändern.

Maschinen werden über Sammlung und Dokument-ID verknüpft, nicht über ähnliche Namen. Der angezeigte Betriebsstatus stammt von denselben Maschinen. Ein eigenständiger Laserschein aktiviert nicht automatisch jede Lasermaschine. Unterweisung und Maschinenverfügbarkeit sind getrennte Informationen; diese Erweiterung sperrt keine reale Maschine und erzwingt noch keine Buchungssperre.

## Daten und Berechtigungen

- `safetyTrainings`: aktueller Nachweis pro Person/Maschine; deterministische Dokument-ID für neue Einträge.
- `safetyTrainings/{id}/history/{revision}`: unveränderbare Änderungsereignisse mit Vorher-/Nachher-Zustand.
- `safetyTrainingTypes`: allgemeine Unterweisungsarten.
- `printers` / `equipment`: bestehende Dokumente, zusätzlich optional `requiresSafetyTraining`.
- `users/{Firebase-Auth-UID}.isAdmin`: Adminberechtigung. Lokale Sessiondaten oder das frühere gemeinsame Adminpasswort genügen nicht.

Nachweis und Historie werden in einer Transaktion geschrieben. Gleichzeitige veraltete Änderungen werden abgelehnt. Die mitgelieferten Firestore-Regeln müssen separat veröffentlicht werden; ein Netlify-Deployment veröffentlicht sie nicht. Der Schutz wurde lokal im Emulator geprüft, nicht auf dem Produktivsystem aktiviert. Die Regeln sind kein vollständiges Sicherheitsaudit aller bestehenden App-Module.

## Vor einer Veröffentlichung erforderlich

1. In einer Staging-Umgebung einen existierenden Firebase-Auth-Account samt `users/{uid}`-Profil und administrativ gesetzter Adminrolle prüfen. Keine Passwörter aus dem Quellcode übernehmen und kein automatisches Hochstufen durch Registrierung.
2. Alte FH-Kennungsprofile kontrolliert den Auth-UIDs zuordnen; Unterweisungen und bestehende Druck-/Ausleihdaten müssen erhalten bleiben. Ohne bestätigte Zuordnung erscheinen alte Nachweise nicht automatisch im neuen Konto.
3. Alte Unterweisungseinträge ohne `machineCollection`/`machineId`, konsistente Datumsfelder und Auditfelder separat prüfen/migrieren. Die Oberfläche zeigt fehlende Zuordnungen; sie rät diese nicht. Alte unvollständige Einträge sind nicht pauschal mit den neuen Schreibregeln bearbeitbar.
4. Bestehende Workflows einschließlich Ausleihe, Druckerstatus, Nutzerverwaltung und Zahlungen gegen die Auth-/Regelumstellung testen. Insbesondere bisherige globale Benutzerlisten in der Ausleihe sind mit eingeschränktem Nutzer-Lesezugriff abzugleichen. Der aktuelle Ausbau testet gezielt Unterweisungen, nicht alle Legacy-Funktionen.
5. Erst danach Regeln und Website koordiniert veröffentlichen. Nur die Website zu pushen würde den Unterschied zwischen altem öffentlichen Login und lokalem E-Mail-Login nicht lösen.

Es gibt hier keinen PDF-Upload, keine digitale Unterschrift und keine automatische Ablauf-/Auffrischungsfrist. Erfasst werden Datum, Person und textlicher Nachweis. Eine rechtliche Nachweisqualität oder vollständige Compliance wird dadurch nicht zugesichert.

## Lokal starten und prüfen

```sh
npm start
# Anwendung: http://localhost:8001/
npm test
npm run test:rules
```

`test:rules` benötigt die Firebase CLI und Java. Es verwendet ausschließlich `demo-pellettrackr` im lokalen Emulator; das Testskript verweigert einen nichtlokalen Emulator-Endpunkt.

Eine vom echten Firebase vollständig getrennte Vorschau liegt unter `tests/safety-preview.html`. Zum Starten aus dem Projektverzeichnis:

```sh
python3 -m http.server 8002 --bind 127.0.0.1
# http://127.0.0.1:8002/tests/safety-preview.html
```

Diese Vorschau verwendet ausschließlich fiktive Daten im Arbeitsspeicher; Neuladen setzt sie zurück. Sie wird nicht in `dist` veröffentlicht.

Geprüft: sechs Modultests (Datum, eindeutige Zuordnung, Erfassung/Entzug/Erneuerung, Änderungskonflikt, Adminprüfung, entfernte Maschinen/Escaping); Firestore-Emulatortests (Adminschutz, eigene/fremde Nachweise, atomare Historie, Löschschutz); Browser-Bedienung mit fiktiven Daten.

Der Build erstellt `dist` neu und sichert den vorherigen Stand unter `.build-backups/`. Quell- und Build-Versionen von Impressum und Datenschutz erhalten passende lokale Pfade. Nicht versionierte Testdaten und lokale Backups werden nicht veröffentlicht.

# Tarife und Verwaltungsdialoge – lokaler Entwicklungsstand

## Abrechnung

Admin → Asset-Verwaltung → **Tarife & Nutzergruppen**. Vorhandene Drucker und Equipment werden über Dokument-IDs verknüpft. Equipment wie Laser erscheint in der Auftragsauswahl, sobald ein Tarif hinterlegt ist (Seite danach neu laden).

Gruppen: Standard/nicht zugeordnet, Studierende, Mitarbeitende, Externe. Nur Admins weisen Gruppen zu. Pro Maschine lässt sich ein Standardtarif sowie eine abweichende Regel je Gruppe konfigurieren. Nicht zugeordnete und neu registrierte Personen verwenden den Standardtarif; diesen daher nicht unbedacht als kostenlosen Studierendentarif konfigurieren.

Abrechnung: keine Maschinenkosten, Pauschale pro Auftrag, pro Minute, pro Stunde. Zeitpreise werden anteilig berechnet, ohne Aufrunden auf volle Minuten. Beträge werden komponentenweise auf Cent gerundet. Die bisherigen Maschinen haben bis zur bewussten Umstellung die bisherige Regel: bei eigenem Material Maschinenstunden, ansonsten nur Materialkosten.

Materialregel: Werkstattmaterial nach Menge oder kein Material (z. B. Laser). Bei neuen Tarifen entfällt mit „Eigenes Material“ der Grundmaterialpreis, nicht der Preis separat ausgewählten Werkstatt-Masterbatches. Die bisherige Regel bleibt auch darin unverändert.

Die 5-€-Pauschale und 0,50 €/Minute in der Testvorschau sind ausschließlich Beispiele. Keine echten Maschinenpreise oder Nutzergruppen wurden gesetzt.

Vorschau und Speicherung verwenden dieselbe Berechnung. Neue Einträge speichern Benutzer-UID, Gruppe, Maschinen-ID, angewendeten Tarif, Tarifrevision und Kostenbestandteile. Spätere Tarifänderungen rechnen bestehende Einträge nicht neu aus. Explizite administrative Korrekturen an bestehenden Einträgen bleiben weiterhin möglich.

## Regeln / Freigabe

`billingPolicies` ist für angemeldete Nutzer lesbar, ausschließlich für Admins schreibbar. Gruppen sind gegen eigene Änderungen geschützt. Neue Einträge werden durch Firestore-Regeln gegen aktuelle Gruppe, Tarifrevision, Materialpreise und Kosten geprüft. Veraltete Vorschauen werden beim Speichern abgewiesen. Regeln und Frontend müssen gemeinsam ausgerollt werden: Die neuen Regeln lehnen Einträge alter Clients ohne Tarifnachweis ab. Bestehende Einträge werden nicht migriert oder gelöscht.

Die Regeln sind lokal im Emulator getestet, NICHT produktiv veröffentlicht. Die zuvor dokumentierte Konten-/Adminmigration bleibt Voraussetzung. Es erfolgte kein Push und kein Deployment. Die bestehende Anwendung ist insgesamt noch kein vollständig geprüftes Buchhaltungssystem; insbesondere ältere Verwaltungs- und Zahlungsworkflows bedürfen weiterhin einer Staging-Abnahme.

## Dialoge

- Nutzerverwaltung als kompakte, durchsuchbare Personenliste statt zwölfspaltiger Tabelle.
- Name, Rolle, offene Summe und Bearbeiten sofort sichtbar; Kontaktdaten, Abrechnung und weitere Aktionen aufklappbar.
- Verwaltungsdialoge breiter, Formulardialoge begrenzt; bei strukturierten Dialogen scrollt nur der Inhalt, Kopf und Fuß bleiben erreichbar.
- Zurückweg aus Personenbearbeitung, kombinierte Suche/Sortierung, Tastatur-Fokusführung und Escape für allgemeine Dialoge, Nutzerverwaltung und Profil.
- Keine Umstellung der echten Adminrechte während der Oberflächentests.

## Tests / Vorschauen

`npm test` und `npm run test:rules`. Browserprüfungen verwenden ausschließlich fiktive Daten:

- `http://127.0.0.1:8002/tests/billing-preview.html`
- `http://127.0.0.1:8002/tests/dialog-preview.html`

Neuladen setzt diese Testvorschauen zurück. Der Testserver auf Port 8002 bedient den Projektordner; `npm start` bedient den Build auf Port 8001. Testdateien werden nicht in den Build kopiert.

# Firestore Index Setup

## Automatische Index-Erstellung

Die Firestore Indexes sind in `firestore.indexes.json` definiert und sollten automatisch bei Firebase-Deployments erstellt werden.

## Manuelle Index-Erstellung (Fallback)

Falls der automatische Index nicht funktioniert, erstellen Sie den Index manuell:

### PaymentRequests Index

1. Gehen Sie zur [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt aus
3. Navigieren Sie zu **Firestore Database** → **Indexes**
4. Klicken Sie auf **Index hinzufügen**
5. Konfigurieren Sie den Index wie folgt:

```
Collection-ID: paymentRequests
Query scope: Collection
Fields:
  - status (Ascending)
  - requestedAt (Descending)
```

### Detaillierte Anweisungen:

1. **Collection-ID**: `paymentRequests`
2. **Query scope**: Collection
3. **Felder hinzufügen**:
   - Erstes Feld: `status` mit Sortierung `Ascending`
   - Zweites Feld: `requestedAt` mit Sortierung `Descending`
4. Klicken Sie auf **Erstellen**

### Warum dieser Index?

Dieser Index behebt OrderBy-Fehler bei Abfragen wie:
```javascript
db.collection('paymentRequests')
  .where('status', '==', 'pending')
  .orderBy('requestedAt', 'desc')
```

### Überprüfung

Nach der Erstellung dauert es einige Minuten bis der Index verfügbar ist. Der Status wird in der Firebase Console angezeigt:
- 🟡 **Building** - Index wird erstellt
- 🟢 **Enabled** - Index ist aktiv und einsatzbereit

## Alternative: Firebase CLI

Sie können den Index auch über die Firebase CLI deployen:

```bash
firebase deploy --only firestore:indexes
```

Dies verwendet die Definitionen aus `firestore.indexes.json`. 
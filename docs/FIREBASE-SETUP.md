# 🔥 Firebase Setup für FGF 3D-Druck App

## 🎯 **Warum Firebase?**
- ✅ **Kostenlos** bis 50.000 Reads/Tag
- ✅ **Real-time** Datenbank
- ✅ **Automatische Backups**
- ✅ **Einfache Integration**
- ✅ **Skalierbar**

## 📋 **Step-by-Step Setup:**

### **1. Firebase Projekt erstellen**
1. Gehe zu [console.firebase.google.com](https://console.firebase.google.com)
2. **"Projekt erstellen"** → Name: `fgf-3d-druck`
3. **Google Analytics** → Optional (kann später aktiviert werden)
4. **Projekt erstellen** klicken

### **2. Firestore Datenbank einrichten**
1. **Firestore Database** → **"Datenbank erstellen"**
2. **Sicherheitsregeln** → **"Im Testmodus starten"** (für Entwicklung)
3. **Standort** → `europe-west3` (Frankfurt)
4. **Fertig**

### **3. Web-App registrieren**
1. **Projektübersicht** → **"App hinzufügen"** → **Web-Symbol** `</>`
2. **App-Name:** `FGF 3D-Druck Web`
3. **Firebase Hosting** → **Nicht** aktivieren (nutzen Netlify)
4. **App registrieren**

### **4. Konfiguration kopieren**
Du bekommst ein Config-Objekt:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBaaMwmjxyytxHLinmigccF30-1Wl0tzD0",
  authDomain: "fgf-3d-druck.firebaseapp.com",
  databaseURL: "https://fgf-3d-druck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fgf-3d-druck",
  storageBucket: "fgf-3d-druck.firebasestorage.app",
  messagingSenderId: "37190466890",
  appId: "1:37190466890:web:cfb25f3c2f6bb62006d5b3"
};
```

### **5. Testdaten hinzufügen**
1. **Firestore** → **"Sammlung starten"**
2. **Sammlungs-ID:** `materials`
3. **Dokument hinzufügen:**
   ```json
   {
     "name": "PLA",
     "price": 25.00,
     "currency": "EUR"
   }
   ```
4. Weitere Materialien hinzufügen: ABS, PETG, TPU
5. **Sammlung:** `masterbatches`
6. **Dokumente:** Schwarz, Weiß, Rot, Blau

---

## 🔧 **Integration in deine App:**

### **1. Firebase-Konfiguration aktualisieren**
Ersetze in `firebase-data-manager.js`:
```javascript
const firebaseConfig = {
  // Deine echten Werte hier einfügen
  apiKey: "DEINE_API_KEY",
  authDomain: "fgf-3d-druck.firebaseapp.com",
  projectId: "fgf-3d-druck",
  // ...
};
```

### **2. HTML aktualisieren**
```html
<!-- In web-app.html vor </body> -->
<script src="firebase-data-manager.js"></script>
<script>
  // Verwende Firebase statt LocalStorage
  window.dataManager = window.firebaseDataManager;
</script>
```

### **3. Sicherheitsregeln (Später)**
```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Nur authentifizierte Benutzer können lesen/schreiben
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🚀 **Deployment:**

### **1. Dateien hochladen**
```
📁 Dein Projekt/
├── web-app.html
├── styles.css
├── config.js
├── firebase-data-manager.js  ← NEU
├── web-app.js
└── netlify.toml
```

### **2. Netlify Update**
1. **Drag & Drop** den ganzen Ordner zu Netlify
2. **Deploy** abwarten
3. **Testen** auf deiner URL

---

## 📊 **Datenstruktur:**

### **Collections:**
```
📁 materials/
├── 📄 doc1: {name: "PLA", price: 25.00, currency: "EUR"}
├── 📄 doc2: {name: "ABS", price: 30.00, currency: "EUR"}
└── 📄 doc3: {name: "PETG", price: 35.00, currency: "EUR"}

📁 masterbatches/
├── 📄 doc1: {name: "Schwarz", price: 8.00, currency: "EUR"}
├── 📄 doc2: {name: "Weiß", price: 8.00, currency: "EUR"}
└── 📄 doc3: {name: "Rot", price: 10.00, currency: "EUR"}

📁 entries/
├── 📄 doc1: {
│   timestamp: 2025-01-08T10:00:00Z,
│   name: "Max Mustermann",
│   kennung: "mm123289",
│   material: "PLA",
│   materialMenge: 1.5,
│   masterbatch: "Schwarz",
│   masterbatchMenge: 0.2,
│   totalCost: 39.1,
│   paid: false
│ }
└── 📄 doc2: {...}
```

---

## 💰 **Kosten:**

### **Firebase Free Tier:**
- ✅ **50.000 Reads** pro Tag
- ✅ **20.000 Writes** pro Tag
- ✅ **1 GB Speicher**
- ✅ **10 GB Bandbreite**

### **Für deine App:**
- **~100 Nutzer/Tag** = **~500 Reads/Tag**
- **Völlig kostenlos** für Jahre!

---

## 🔄 **Migration von LocalStorage:**

### **1. Exportiere aktuelle Daten**
```javascript
// In Browser-Konsole auf deiner App
const data = localStorage.getItem('fgf-3d-druck-data');
console.log(data);
// Kopiere die Ausgabe
```

### **2. Importiere in Firebase**
```javascript
// Script für einmalige Migration
const importData = async () => {
  const localData = /* Deine kopierten Daten */;
  
  // Materialien hinzufügen
  for (const material of localData.materials) {
    await addDoc(collection(db, 'materials'), material);
  }
  
  // Masterbatches hinzufügen
  for (const masterbatch of localData.masterbatches) {
    await addDoc(collection(db, 'masterbatches'), masterbatch);
  }
  
  // Einträge hinzufügen
  for (const entry of localData.entries) {
    await addDoc(collection(db, 'entries'), entry);
  }
};
```

---

## ⚠️ **Wichtige Hinweise:**

1. **Testmodus** ist nur für Entwicklung - später Sicherheitsregeln aktivieren
2. **API-Keys** sind öffentlich sichtbar - das ist **normal** bei Firebase
3. **Sicherheit** wird über Firestore Rules kontrolliert
4. **Backup** ist automatisch bei Firebase

**Willst du dass ich dir beim Firebase-Setup helfe?** 🚀

# 🎵 DJ Tools Collection

Eine Sammlung moderner Web-Apps für DJs und Event-Profis, entwickelt mit Next.js, TypeScript und Firebase.

## 📱 Projekte

### 🎵 [Music Wish App](./music-wish-app/)
**Live-Event Musikwünsche & Voting-System**

Eine mobile-first Web-App für Live-Events, die es Gästen ermöglicht, Musikwünsche zu äußern und zu voten, während DJs die Warteschlange verwalten können.

**Features:**
- Real-time Musikwünsche mit Voting-System
- DJ-Admin-Panel mit Status-Management
- Mobile-optimiert für Events
- Automatisches Ranking nach Votes

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Firebase Firestore

---

### 💒 [DJ Wedding Survey App](./dj-wedding-survey/)
**Professionelle Hochzeits-Umfragen**

Eine mehrstufige Umfrage-App für DJs, um Hochzeitspaare bei der Planung ihrer perfekten Musik zu unterstützen.

**Features:**
- 4-stufige Umfrage mit Progress-Tracking
- Umfassende Fragen zu Musik & Veranstaltung
- Mobile-optimiert für Hochzeitspaare
- Automatische Datensammlung für DJs

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Firebase Firestore, React Hook Form

---

## 🚀 Schnellstart

### Voraussetzungen
- Node.js 18+
- npm oder yarn
- Firebase-Projekt

### Installation

1. **Repository klonen**
```bash
git clone <repository-url>
cd dj-tools-collection
```

2. **Music Wish App starten**
```bash
cd music-wish-app
npm install
npm run dev
# Öffne http://localhost:3000
```

3. **DJ Wedding Survey App starten**
```bash
cd dj-wedding-survey
npm install
npm run dev
# Öffne http://localhost:3001 (anderer Port)
```

## 🔧 Firebase Setup

Beide Apps benötigen ein Firebase-Projekt:

1. **Firebase Console** → Neues Projekt erstellen
2. **Firestore Database** aktivieren
3. **Web App** hinzufügen und Konfiguration kopieren
4. **Firebase-Konfiguration** in `src/app/page.tsx` einfügen:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

## 📊 Datenbank-Strukturen

### Music Wish App
```typescript
// Collection: songRequests
{
  id: string;
  title: string;           // Songtitel
  artist: string;          // Künstler
  requestedBy: string;     // Name des Wunschenden
  votes: number;           // Anzahl der Votes
  timestamp: Date;         // Erstellungszeitpunkt
  status: 'pending' | 'playing' | 'played' | 'rejected';
  ipAddress: string;       // IP für Vote-Tracking
}
```

### DJ Wedding Survey App
```typescript
// Collection: weddingSurveys
{
  id: string;
  coupleName: string;      // Namen des Brautpaares
  weddingDate: Date;       // Hochzeitsdatum
  guestCount: number;      // Anzahl der Gäste
  musicStyle: string[];    // Bevorzugte Musikstile
  budget: string;          // Budget für DJ-Service
  contactEmail: string;    // Kontakt-E-Mail
  submittedAt: Date;       // Einreichungszeitpunkt
  status: 'new' | 'contacted' | 'booked' | 'cancelled';
  // ... weitere Felder
}
```

## 🎨 Design-System

### Music Wish App
- **Theme:** Dark Mode mit Purple/Blue Gradient
- **Style:** Glassmorphism mit backdrop-blur
- **Target:** Event-Gäste und DJs

### DJ Wedding Survey App
- **Theme:** Light Mode mit Pink/Rose Gradient
- **Style:** Elegant und romantisch
- **Target:** Hochzeitspaare

## 🚀 Deployment

### Netlify (Empfohlen)
1. **Repository** mit Netlify verbinden
2. **Build-Command:** `npm run build`
3. **Publish-Directory:** `out`
4. **Umgebungsvariablen** konfigurieren

### Vercel
1. **Repository** mit Vercel verbinden
2. **Automatisches Deployment** bei Push
3. **Umgebungsvariablen** konfigurieren

## 📈 Roadmap

### Phase 1: Grundfunktionen ✅
- [x] Music Wish App mit Real-time Updates
- [x] DJ Wedding Survey mit Multi-Step Form
- [x] Mobile-optimiertes Design
- [x] Firebase Integration

### Phase 2: Admin-Dashboards 🚧
- [ ] DJ-Login mit Authentifizierung
- [ ] Umfrage-Übersicht und -Verwaltung
- [ ] E-Mail-Benachrichtigungen
- [ ] Export-Funktionen

### Phase 3: White-Label System 📋
- [ ] Multi-DJ Support
- [ ] Custom Branding
- [ ] Domain-Mapping
- [ ] Analytics Dashboard

### Phase 4: Advanced Features 📋
- [ ] Mobile Apps (React Native)
- [ ] Offline-Modus
- [ ] Multi-Language Support
- [ ] Payment Integration

## 🛠️ Entwicklung

### Projekt-Struktur
```
dj-tools-collection/
├── music-wish-app/          # Live-Event Musikwünsche
│   ├── src/
│   │   └── app/
│   │       └── page.tsx     # Haupt-App
│   ├── README.md
│   └── package.json
├── dj-wedding-survey/       # Hochzeits-Umfragen
│   ├── src/
│   │   └── app/
│   │       └── page.tsx     # Haupt-App
│   ├── README.md
│   └── package.json
└── README.md               # Diese Datei
```

### Scripts
```bash
# Music Wish App
cd music-wish-app
npm run dev          # Entwicklungsserver
npm run build        # Production Build
npm run start        # Production Server

# DJ Wedding Survey App
cd dj-wedding-survey
npm run dev          # Entwicklungsserver
npm run build        # Production Build
npm run start        # Production Server
```

## 🤝 Beitragen

1. **Fork** das Repository
2. **Feature-Branch** erstellen
3. **Änderungen** committen
4. **Push** zum Branch
5. **Pull Request** erstellen

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei für Details.

## 🆘 Support

Bei Fragen oder Problemen:
- **Issues** auf GitHub erstellen
- **Dokumentation** in den jeweiligen Projekt-READMEs
- **Entwicklungsteam** kontaktieren

---

**Entwickelt mit ❤️ für die Event- und DJ-Branche**

*Diese Tools sind speziell für DJs und Event-Profis entwickelt, um ihre Arbeitsabläufe zu optimieren und die Kundeninteraktion zu verbessern.* 
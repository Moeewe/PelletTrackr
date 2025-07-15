# PelletTrackr - 3D-Druck Abrechnung

## 🚀 Quick Start

1. **Clone & Setup**
   ```bash
   git clone https://github.com/Moeewe/PelletTrackr.git
   cd PelletTrackr-Production-Dev
   ```

2. **Configure Firebase**
   - Update `js/core/firebase-config.js` with your Firebase credentials
   - Set up Firestore database with required collections

3. **Deploy**
   ```bash
   ./build.sh && ./deploy.sh
   ```

4. **Access**
   - Open `index.html` or deploy to Netlify
   - Default admin password: `admin123` (change in `config.js`)

## 📋 Overview

Web-based 3D printing tracking and billing system for educational institutions. Manages material usage, printer status, user accounts, and cost calculations with real-time Firebase integration.

## ✨ Features

- **Material Tracking** - Monitor filament usage and costs
- **Printer Management** - Real-time status monitoring and problem reporting  
- **User Services** - Account management and payment tracking
- **Admin Dashboard** - User administration and system oversight
- **Equipment Management** - Hardware lending system (keys, tools, books)
- **Mobile Responsive** - Optimized for desktop and mobile devices

## 🛠 Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: Firebase/Firestore
- **Deployment**: Netlify
- **Build**: Custom shell scripts

## 📁 Project Structure

```
├── js/
│   ├── core/           # Core functionality (auth, navigation, utils)
│   ├── features/       # Feature modules (materials, printers, users)
│   └── ui/             # UI components (modals, buttons, sorting)
├── styles/             # Modular CSS files
├── HTML/               # Static pages (impressum, datenschutz)
├── config.js           # App configuration
├── build.sh            # Build script
└── deploy.sh           # Deployment script
```

## ⚙️ Configuration

### Firebase Setup
1. Create Firebase project with Firestore database
2. Update `js/core/firebase-config.js`:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-domain",
     projectId: "your-project-id",
     // ... other config
   };
   ```

### App Settings
Modify `config.js` for:
- Admin password
- App branding
- Theme colors
- Print costs

### Required Firestore Collections
- `entries` - Print job records
- `users` - User accounts  
- `printers` - Printer information
- `materials` - Material inventory
- `equipment` - Equipment lending
- `problemReports` - Issue tracking
- `paymentRequests` - Payment processing

## 🚀 Deployment

### Local Development
```bash
# Build project
./build.sh

# Open index.html in browser
open dist/index.html
```

### Netlify Deployment
```bash
# Build and deploy
./build.sh
./deploy.sh

# Or use Netlify auto-deploy from GitHub
```

## 📱 Usage

### User Workflow
1. **Login** with FH-Kennung
2. **Add Print Job** with material selection
3. **Track Costs** and usage history
4. **Request Materials** when needed

### Admin Workflow  
1. **Enable Admin Mode** with password
2. **Manage Users** and permissions
3. **Monitor Printers** and equipment
4. **Process Payments** and requests

## 🔧 Development

### Build System
- `build.sh` - Compiles project to `dist/` folder
- Copies and minifies all assets
- Preserves modular structure

### Code Structure
- **Modular JS** - Feature-based organization
- **Component CSS** - Scoped styling
- **Firebase Integration** - Real-time data sync
- **Mobile-First** - Responsive design

## 📄 License

Educational use - Fachhochschule Project

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Test changes locally
4. Submit pull request

---

**Production URL**: https://production-dev--pellettrackr.netlify.app/ 
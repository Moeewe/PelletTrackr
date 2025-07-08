// ==================== FIREBASE INTEGRATION ====================

// Firebase-Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyBaaMwmjxyytxHLinmigccF30-1Wl0tzD0",
  authDomain: "fgf-3d-druck.firebaseapp.com",
  databaseURL: "https://fgf-3d-druck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fgf-3d-druck",
  storageBucket: "fgf-3d-druck.firebasestorage.app",
  messagingSenderId: "37190466890",
  appId: "1:37190466890:web:cfb25f3c2f6bb62006d5b3"
};

// Firebase initialisieren
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firebase Data Manager
class FirebaseDataManager {
  constructor() {
    this.db = db;
    this.materialsCollection = 'materials';
    this.masterbatchesCollection = 'masterbatches';
    this.entriesCollection = 'entries';
  }

  // Neuen Druck hinzufügen
  async addEntry(name, kennung, material, materialMenge, masterbatch, masterbatchMenge) {
    try {
      // Preise abrufen
      const materialData = await this.getMaterialByName(material);
      const masterbatchData = await this.getMasterbatchByName(masterbatch);
      
      const materialCost = materialData ? materialData.price * materialMenge : 0;
      const masterbatchCost = masterbatchData ? masterbatchData.price * masterbatchMenge : 0;
      const totalCost = materialCost + masterbatchCost;
      
      // Druck in Firestore speichern
      const docRef = await addDoc(collection(this.db, this.entriesCollection), {
        timestamp: new Date(),
        name: name,
        kennung: kennung,
        material: material,
        materialMenge: materialMenge,
        materialCost: materialCost,
        masterbatch: masterbatch,
        masterbatchMenge: masterbatchMenge,
        masterbatchCost: masterbatchCost,
        totalCost: totalCost,
        paid: false,
        paidDate: null,
        createdAt: new Date()
      });
      
      return {
        success: true,
        id: docRef.id,
        totalCost: totalCost,
        materialCost: materialCost,
        masterbatchCost: masterbatchCost
      };
    } catch (error) {
      console.error("Fehler beim Hinzufügen:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Nutzer-Drucke abrufen
  async getUserEntries(name, kennung) {
    try {
      const q = query(
        collection(this.db, this.entriesCollection),
        where("name", "==", name),
        where("kennung", "==", kennung),
        orderBy("timestamp", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const entries = [];
      
      querySnapshot.forEach((doc) => {
        entries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return {
        success: true,
        entries: entries,
        count: entries.length
      };
    } catch (error) {
      console.error("Fehler beim Abrufen:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Alle Drucke abrufen (Admin)
  async getAllEntries() {
    try {
      const q = query(
        collection(this.db, this.entriesCollection),
        orderBy("timestamp", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const entries = [];
      
      querySnapshot.forEach((doc) => {
        entries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return {
        success: true,
        entries: entries,
        count: entries.length
      };
    } catch (error) {
      console.error("Fehler beim Abrufen:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Als bezahlt markieren
  async markAsPaid(entryId) {
    try {
      const docRef = doc(this.db, this.entriesCollection, entryId);
      await updateDoc(docRef, {
        paid: true,
        paidDate: new Date()
      });
      
      return {
        success: true
      };
    } catch (error) {
      console.error("Fehler beim Markieren:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Materialien abrufen
  async getMaterials() {
    try {
      const querySnapshot = await getDocs(collection(this.db, this.materialsCollection));
      const materials = [];
      
      querySnapshot.forEach((doc) => {
        materials.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return {
        success: true,
        materials: materials
      };
    } catch (error) {
      console.error("Fehler beim Abrufen der Materialien:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Material nach Name finden
  async getMaterialByName(name) {
    try {
      const q = query(
        collection(this.db, this.materialsCollection),
        where("name", "==", name)
      );
      
      const querySnapshot = await getDocs(q);
      let material = null;
      
      querySnapshot.forEach((doc) => {
        material = {
          id: doc.id,
          ...doc.data()
        };
      });
      
      return material;
    } catch (error) {
      console.error("Fehler beim Suchen des Materials:", error);
      return null;
    }
  }

  // Masterbatches abrufen
  async getMasterbatches() {
    try {
      const querySnapshot = await getDocs(collection(this.db, this.masterbatchesCollection));
      const masterbatches = [];
      
      querySnapshot.forEach((doc) => {
        masterbatches.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return {
        success: true,
        masterbatches: masterbatches
      };
    } catch (error) {
      console.error("Fehler beim Abrufen der Masterbatches:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Masterbatch nach Name finden
  async getMasterbatchByName(name) {
    try {
      const q = query(
        collection(this.db, this.masterbatchesCollection),
        where("name", "==", name)
      );
      
      const querySnapshot = await getDocs(q);
      let masterbatch = null;
      
      querySnapshot.forEach((doc) => {
        masterbatch = {
          id: doc.id,
          ...doc.data()
        };
      });
      
      return masterbatch;
    } catch (error) {
      console.error("Fehler beim Suchen des Masterbatch:", error);
      return null;
    }
  }

  // Kosten berechnen
  async calculateCost(material, materialMenge, masterbatch, masterbatchMenge) {
    try {
      const materialData = await this.getMaterialByName(material);
      const masterbatchData = await this.getMasterbatchByName(masterbatch);
      
      const materialCost = materialData ? materialData.price * materialMenge : 0;
      const masterbatchCost = masterbatchData ? masterbatchData.price * masterbatchMenge : 0;
      const totalCost = materialCost + masterbatchCost;
      
      return {
        success: true,
        materialCost: materialCost,
        masterbatchCost: masterbatchCost,
        totalCost: totalCost
      };
    } catch (error) {
      console.error("Fehler bei Kostenberechnung:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Nutzer-Statistiken
  async getUserStatistics(name, kennung) {
    try {
      const userEntries = await this.getUserEntries(name, kennung);
      
      if (!userEntries.success) {
        return userEntries;
      }
      
      const entries = userEntries.entries;
      
      const stats = {
        totalEntries: entries.length,
        totalCost: entries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0),
        totalMaterialUsage: entries.reduce((sum, entry) => sum + (entry.materialMenge || 0), 0),
        totalMasterbatchUsage: entries.reduce((sum, entry) => sum + (entry.masterbatchMenge || 0), 0),
        materialTypes: {},
        masterbatchTypes: {}
      };
      
      // Material-Aufschlüsselung
      entries.forEach(entry => {
        if (entry.material) {
          if (!stats.materialTypes[entry.material]) {
            stats.materialTypes[entry.material] = 0;
          }
          stats.materialTypes[entry.material] += entry.materialMenge || 0;
        }
        
        if (entry.masterbatch) {
          if (!stats.masterbatchTypes[entry.masterbatch]) {
            stats.masterbatchTypes[entry.masterbatch] = 0;
          }
          stats.masterbatchTypes[entry.masterbatch] += entry.masterbatchMenge || 0;
        }
      });
      
      return {
        success: true,
        statistics: stats
      };
    } catch (error) {
      console.error("Fehler bei Nutzer-Statistiken:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Admin-Statistiken
  async getAdminStatistics() {
    try {
      const allEntries = await this.getAllEntries();
      
      if (!allEntries.success) {
        return allEntries;
      }
      
      const entries = allEntries.entries;
      const uniqueUsers = [...new Set(entries.map(e => `${e.name}-${e.kennung}`))];
      
      const stats = {
        totalEntries: entries.length,
        totalUsers: uniqueUsers.length,
        totalPaidEntries: entries.filter(e => e.paid).length,
        totalUnpaidEntries: entries.filter(e => !e.paid).length,
        totalRevenue: entries.reduce((sum, entry) => sum + (entry.totalCost || 0), 0),
        unpaidRevenue: entries.filter(e => !e.paid).reduce((sum, entry) => sum + (entry.totalCost || 0), 0),
        totalMaterialUsage: entries.reduce((sum, entry) => sum + (entry.materialMenge || 0), 0),
        totalMasterbatchUsage: entries.reduce((sum, entry) => sum + (entry.masterbatchMenge || 0), 0),
        materialTypes: {},
        topUsers: []
      };
      
      // Material-Aufschlüsselung
      entries.forEach(entry => {
        if (entry.material) {
          if (!stats.materialTypes[entry.material]) {
            stats.materialTypes[entry.material] = 0;
          }
          stats.materialTypes[entry.material] += entry.materialMenge || 0;
        }
      });
      
      // Top-Nutzer
      const userStats = {};
      entries.forEach(entry => {
        const userKey = `${entry.name}-${entry.kennung}`;
        if (!userStats[userKey]) {
          userStats[userKey] = {
            name: entry.name,
            kennung: entry.kennung,
            entries: 0,
            totalCost: 0
          };
        }
        userStats[userKey].entries += 1;
        userStats[userKey].totalCost += entry.totalCost || 0;
      });
      
      stats.topUsers = Object.values(userStats)
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 10);
      
      return {
        success: true,
        statistics: stats
      };
    } catch (error) {
      console.error("Fehler bei Admin-Statistiken:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Globale Instanz
window.firebaseDataManager = new FirebaseDataManager();

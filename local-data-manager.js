// ==================== LOKALE DATEN-VERWALTUNG ====================

// Data Storage für Browser (LocalStorage)
class LocalDataManager {
  constructor() {
    this.storageKey = 'fgf-3d-druck-data';
    this.initializeData();
  }
  
  // Daten initialisieren
  initializeData() {
    if (!localStorage.getItem(this.storageKey)) {
      const initialData = {
        entries: [],
        materials: [
          { name: "PLA", price: 25.00, currency: "EUR" },
          { name: "ABS", price: 30.00, currency: "EUR" },
          { name: "PETG", price: 35.00, currency: "EUR" },
          { name: "TPU", price: 45.00, currency: "EUR" }
        ],
        masterbatches: [
          { name: "Schwarz", price: 8.00, currency: "EUR" },
          { name: "Weiß", price: 8.00, currency: "EUR" },
          { name: "Rot", price: 10.00, currency: "EUR" },
          { name: "Blau", price: 10.00, currency: "EUR" }
        ],
        statistics: {
          totalEntries: 0,
          totalRevenue: 0,
          totalMaterialUsage: 0,
          totalMasterbatchUsage: 0
        }
      };
      this.saveData(initialData);
    }
  }
  
  // Daten laden
  loadData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      return null;
    }
  }
  
  // Daten speichern
  saveData(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Fehler beim Speichern der Daten:', error);
      return false;
    }
  }
  
  // Neuen Eintrag hinzufügen
  addEntry(name, kennung, material, materialMenge, masterbatch, masterbatchMenge) {
    const data = this.loadData();
    if (!data) return { success: false, error: "Daten konnten nicht geladen werden" };
    
    // Preise berechnen
    const materialData = data.materials.find(m => m.name === material);
    const masterbatchData = data.masterbatches.find(m => m.name === masterbatch);
    
    const materialCost = materialData ? materialData.price * materialMenge : 0;
    const masterbatchCost = masterbatchData ? masterbatchData.price * masterbatchMenge : 0;
    const totalCost = materialCost + masterbatchCost;
    
    // Neuer Eintrag
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
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
      paidDate: null
    };
    
    data.entries.push(entry);
    
    // Statistiken aktualisieren
    data.statistics.totalEntries += 1;
    data.statistics.totalRevenue += totalCost;
    data.statistics.totalMaterialUsage += materialMenge;
    data.statistics.totalMasterbatchUsage += masterbatchMenge;
    
    const saved = this.saveData(data);
    
    return {
      success: saved,
      totalCost: totalCost,
      materialCost: materialCost,
      masterbatchCost: masterbatchCost,
      entry: entry
    };
  }
  
  // Nutzer-Einträge abrufen
  getUserEntries(name, kennung) {
    const data = this.loadData();
    if (!data) return { success: false, error: "Daten konnten nicht geladen werden" };
    
    const userEntries = data.entries.filter(entry => 
      entry.name.toLowerCase() === name.toLowerCase() && 
      entry.kennung.toLowerCase() === kennung.toLowerCase()
    );
    
    return {
      success: true,
      entries: userEntries,
      count: userEntries.length
    };
  }
  
  // Alle Einträge abrufen (Admin)
  getAllEntries() {
    const data = this.loadData();
    if (!data) return { success: false, error: "Daten konnten nicht geladen werden" };
    
    return {
      success: true,
      entries: data.entries,
      count: data.entries.length
    };
  }
  
  // Als bezahlt markieren
  markAsPaid(entryId) {
    const data = this.loadData();
    if (!data) return { success: false, error: "Daten konnten nicht geladen werden" };
    
    const entry = data.entries.find(e => e.id === entryId);
    if (!entry) return { success: false, error: "Eintrag nicht gefunden" };
    
    entry.paid = true;
    entry.paidDate = new Date().toISOString();
    
    const saved = this.saveData(data);
    
    return {
      success: saved,
      entry: entry
    };
  }
  
  // Materialien abrufen
  getMaterials() {
    const data = this.loadData();
    if (!data) return { success: false, error: "Daten konnten nicht geladen werden" };
    
    return {
      success: true,
      materials: data.materials
    };
  }
  
  // Masterbatches abrufen
  getMasterbatches() {
    const data = this.loadData();
    if (!data) return { success: false, error: "Daten konnten nicht geladen werden" };
    
    return {
      success: true,
      masterbatches: data.masterbatches
    };
  }
  
  // Kosten berechnen
  calculateCost(material, materialMenge, masterbatch, masterbatchMenge) {
    const data = this.loadData();
    if (!data) return { success: false, error: "Daten konnten nicht geladen werden" };
    
    const materialData = data.materials.find(m => m.name === material);
    const masterbatchData = data.masterbatches.find(m => m.name === masterbatch);
    
    const materialCost = materialData ? materialData.price * materialMenge : 0;
    const masterbatchCost = masterbatchData ? masterbatchData.price * masterbatchMenge : 0;
    const totalCost = materialCost + masterbatchCost;
    
    return {
      success: true,
      materialCost: materialCost,
      masterbatchCost: masterbatchCost,
      totalCost: totalCost
    };
  }
  
  // Statistiken abrufen
  getStatistics() {
    const data = this.loadData();
    if (!data) return { success: false, error: "Daten konnten nicht geladen werden" };
    
    return {
      success: true,
      statistics: data.statistics,
      totalEntries: data.entries.length,
      paidEntries: data.entries.filter(e => e.paid).length,
      unpaidEntries: data.entries.filter(e => !e.paid).length
    };
  }
  
  // Nutzer-Statistiken
  getUserStatistics(name, kennung) {
    const userEntries = this.getUserEntries(name, kennung);
    if (!userEntries.success) return userEntries;
    
    const entries = userEntries.entries;
    
    const stats = {
      totalEntries: entries.length,
      totalCost: entries.reduce((sum, entry) => sum + entry.totalCost, 0),
      totalMaterialUsage: entries.reduce((sum, entry) => sum + entry.materialMenge, 0),
      totalMasterbatchUsage: entries.reduce((sum, entry) => sum + entry.masterbatchMenge, 0),
      materialTypes: {},
      masterbatchTypes: {}
    };
    
    // Material-Aufschlüsselung
    entries.forEach(entry => {
      if (!stats.materialTypes[entry.material]) {
        stats.materialTypes[entry.material] = 0;
      }
      stats.materialTypes[entry.material] += entry.materialMenge;
      
      if (!stats.masterbatchTypes[entry.masterbatch]) {
        stats.masterbatchTypes[entry.masterbatch] = 0;
      }
      stats.masterbatchTypes[entry.masterbatch] += entry.masterbatchMenge;
    });
    
    return {
      success: true,
      statistics: stats
    };
  }
  
  // Admin-Statistiken
  getAdminStatistics() {
    const data = this.loadData();
    if (!data) return { success: false, error: "Daten konnten nicht geladen werden" };
    
    const entries = data.entries;
    const uniqueUsers = [...new Set(entries.map(e => `${e.name}-${e.kennung}`))];
    
    const stats = {
      totalEntries: entries.length,
      totalUsers: uniqueUsers.length,
      totalPaidEntries: entries.filter(e => e.paid).length,
      totalUnpaidEntries: entries.filter(e => !e.paid).length,
      totalRevenue: entries.reduce((sum, entry) => sum + entry.totalCost, 0),
      unpaidRevenue: entries.filter(e => !e.paid).reduce((sum, entry) => sum + entry.totalCost, 0),
      totalMaterialUsage: entries.reduce((sum, entry) => sum + entry.materialMenge, 0),
      totalMasterbatchUsage: entries.reduce((sum, entry) => sum + entry.masterbatchMenge, 0),
      materialTypes: {},
      topUsers: []
    };
    
    // Material-Aufschlüsselung
    entries.forEach(entry => {
      if (!stats.materialTypes[entry.material]) {
        stats.materialTypes[entry.material] = 0;
      }
      stats.materialTypes[entry.material] += entry.materialMenge;
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
      userStats[userKey].totalCost += entry.totalCost;
    });
    
    stats.topUsers = Object.values(userStats)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10);
    
    return {
      success: true,
      statistics: stats
    };
  }
  
  // Daten exportieren (für Backup)
  exportData() {
    const data = this.loadData();
    if (!data) return null;
    
    const exportData = {
      ...data,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  // Daten importieren (für Restore)
  importData(jsonString) {
    try {
      const importData = JSON.parse(jsonString);
      const saved = this.saveData(importData);
      return { success: saved };
    } catch (error) {
      return { success: false, error: "Ungültiges JSON-Format" };
    }
  }
}

// Globale Instanz
window.dataManager = new LocalDataManager();

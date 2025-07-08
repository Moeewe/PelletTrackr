// ==================== FIREBASE BULK IMPORT ====================
// Dieses Script einmalig in der Browser-Konsole ausführen

// 1. MATERIALIEN BULK IMPORT
const importMaterials = async () => {
  const materials = [
    { name: "PLA", price: 25.00, currency: "EUR" },
    { name: "ABS", price: 30.00, currency: "EUR" },
    { name: "PETG", price: 35.00, currency: "EUR" },
    { name: "TPU", price: 45.00, currency: "EUR" },
    { name: "WOOD-PLA", price: 28.00, currency: "EUR" },
    { name: "CARBON-PLA", price: 32.00, currency: "EUR" }
  ];

  console.log("Importiere Materialien...");
  
  for (const material of materials) {
    try {
      const docRef = await addDoc(collection(db, 'materials'), material);
      console.log(`✅ Material ${material.name} hinzugefügt:`, docRef.id);
    } catch (error) {
      console.error(`❌ Fehler bei ${material.name}:`, error);
    }
  }
  
  console.log("🎉 Materialien-Import abgeschlossen!");
};

// 2. MASTERBATCHES BULK IMPORT
const importMasterbatches = async () => {
  const masterbatches = [
    { name: "Schwarz", price: 8.00, currency: "EUR" },
    { name: "Weiß", price: 8.00, currency: "EUR" },
    { name: "Rot", price: 10.00, currency: "EUR" },
    { name: "Blau", price: 10.00, currency: "EUR" },
    { name: "Grün", price: 10.00, currency: "EUR" },
    { name: "Gelb", price: 10.00, currency: "EUR" },
    { name: "Orange", price: 10.00, currency: "EUR" },
    { name: "Transparent", price: 8.00, currency: "EUR" }
  ];

  console.log("Importiere Masterbatches...");
  
  for (const masterbatch of masterbatches) {
    try {
      const docRef = await addDoc(collection(db, 'masterbatches'), masterbatch);
      console.log(`✅ Masterbatch ${masterbatch.name} hinzugefügt:`, docRef.id);
    } catch (error) {
      console.error(`❌ Fehler bei ${masterbatch.name}:`, error);
    }
  }
  
  console.log("🎉 Masterbatches-Import abgeschlossen!");
};

// 3. EXCEL-DATEN IMPORT (Beispiel)
const importExcelData = async () => {
  // Hier fügst du deine Excel-Daten ein (als JSON konvertiert)
  const excelEntries = [
    {
      timestamp: "2025-01-01",
      name: "Max Mustermann",
      kennung: "mm123289", 
      material: "PLA",
      materialMenge: 1.5,
      masterbatch: "Schwarz",
      masterbatchMenge: 0.2,
      totalCost: 39.1,
      paid: false
    },
    {
      timestamp: "2025-01-02",
      name: "Anna Schmidt",
      kennung: "as987654",
      material: "ABS", 
      materialMenge: 2.0,
      masterbatch: "Weiß",
      masterbatchMenge: 0.3,
      totalCost: 62.4,
      paid: true
    }
    // ... weitere Einträge aus deiner Excel
  ];

  console.log("Importiere Excel-Daten...");
  
  for (const entry of excelEntries) {
    try {
      // Konvertiere Datum
      const entryData = {
        ...entry,
        timestamp: new Date(entry.timestamp),
        createdAt: new Date(),
        paidDate: entry.paid ? new Date() : null
      };
      
      const docRef = await addDoc(collection(db, 'entries'), entryData);
      console.log(`✅ Eintrag ${entry.name} hinzugefügt:`, docRef.id);
    } catch (error) {
      console.error(`❌ Fehler bei ${entry.name}:`, error);
    }
  }
  
  console.log("🎉 Excel-Import abgeschlossen!");
};

// 4. ALLES IMPORTIEREN
const importAll = async () => {
  console.log("🚀 Starte Bulk-Import...");
  
  await importMaterials();
  await importMasterbatches();
  await importExcelData();
  
  console.log("🎉 Kompletter Import abgeschlossen!");
};

// USAGE:
// importMaterials();     // Nur Materialien
// importMasterbatches(); // Nur Masterbatches  
// importExcelData();     // Nur Excel-Daten
// importAll();           // Alles auf einmal

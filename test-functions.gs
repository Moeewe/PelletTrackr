// Test-Funktionen für die 3D-Druck Abrechnung
// Diese Datei können Sie für Tests und Debugging verwenden

function testAllFunctions() {
  console.log("=== Test der 3D-Druck Abrechnung ===");
  
  // 1. Konfiguration testen
  console.log("\n1. Teste Konfiguration...");
  try {
    initializeConfig();
    console.log("✅ Konfiguration erfolgreich initialisiert");
  } catch (error) {
    console.error("❌ Konfigurationsfehler:", error);
    return;
  }
  
  // 2. Verbindung testen
  console.log("\n2. Teste Verbindung...");
  var connectionTest = testConnection();
  if (connectionTest.success) {
    console.log("✅ Verbindungstest erfolgreich");
    console.log("   Tabellenblatt:", connectionTest.sheetName);
    console.log("   Zeilen:", connectionTest.rowCount);
    console.log("   Spalten:", connectionTest.columnCount);
  } else {
    console.error("❌ Verbindungstest fehlgeschlagen:", connectionTest.error);
    return;
  }
  
  // 3. Materialien laden
  console.log("\n3. Teste Material-Laden...");
  var materials = getMaterials();
  if (materials.success) {
    console.log("✅ Materialien erfolgreich geladen:", materials.materials.length + " Materialien");
    materials.materials.forEach(function(mat) {
      console.log("   - " + mat.name + ": " + mat.price + " " + mat.currency + "/kg");
    });
  } else {
    console.error("❌ Materialien-Laden fehlgeschlagen:", materials.error);
  }
  
  // 4. Masterbatches laden
  console.log("\n4. Teste Masterbatch-Laden...");
  var masterbatches = getMasterbatches();
  if (masterbatches.success) {
    console.log("✅ Masterbatches erfolgreich geladen:", masterbatches.masterbatches.length + " Masterbatches");
    masterbatches.masterbatches.forEach(function(mb) {
      console.log("   - " + mb.name + ": " + mb.price + " " + mb.currency + "/kg");
    });
  } else {
    console.error("❌ Masterbatch-Laden fehlgeschlagen:", masterbatches.error);
  }
  
  // 5. Kostenberechnung testen (falls Materialien vorhanden)
  if (materials.success && materials.materials.length > 0 && 
      masterbatches.success && masterbatches.masterbatches.length > 0) {
    console.log("\n5. Teste Kostenberechnung...");
    var testMaterial = materials.materials[0].name;
    var testMasterbatch = masterbatches.masterbatches[0].name;
    
    var costCalc = calculateCost(testMaterial, "0.1", testMasterbatch, "0.01");
    if (costCalc.success) {
      console.log("✅ Kostenberechnung erfolgreich");
      console.log("   Material: " + testMaterial + " (0.1 kg) = " + costCalc.materialCost.toFixed(2) + " €");
      console.log("   Masterbatch: " + testMasterbatch + " (0.01 kg) = " + costCalc.masterbatchCost.toFixed(2) + " €");
      console.log("   Gesamtkosten: " + costCalc.formattedTotal);
    } else {
      console.error("❌ Kostenberechnung fehlgeschlagen:", costCalc.error);
    }
  }
  
  console.log("\n=== Test abgeschlossen ===");
}

function testAddEntry() {
  console.log("=== Test: Eintrag hinzufügen ===");
  
  // Test-Daten
  var testData = {
    name: "Test User",
    kennung: "test123",
    material: "Recycling PLA", // Passen Sie dies an Ihre verfügbaren Materialien an
    materialMenge: 0.05,
    masterbatch: "Masterbatch", // Passen Sie dies an Ihre verfügbaren Masterbatches an
    masterbatchMenge: 0.005
  };
  
  console.log("Teste mit Daten:", testData);
  
  var result = AddRecord(
    testData.name,
    testData.kennung,
    testData.material,
    testData.materialMenge,
    testData.masterbatch,
    testData.masterbatchMenge
  );
  
  if (result.success) {
    console.log("✅ Test-Eintrag erfolgreich hinzugefügt");
    console.log("   Kosten:", result.totalCost);
    console.log("   Zeitstempel:", result.timestamp);
    console.log("   Entry ID:", result.entryId);
  } else {
    console.error("❌ Test-Eintrag fehlgeschlagen:", result.error);
  }
  
  return result;
}

function testUserEntries() {
  console.log("=== Test: Benutzer-Einträge abrufen ===");
  
  var testName = "Test User";
  var testKennung = "test123";
  
  var entries = getUserEntries(testName, testKennung);
  
  if (entries.error) {
    console.error("❌ Fehler beim Abrufen der Einträge:", entries.error);
    return;
  }
  
  console.log("✅ Einträge erfolgreich abgerufen");
  console.log("   Anzahl Einträge:", entries.entries.length);
  
  if (entries.entries.length > 0) {
    console.log("   Erste Zeile:", entries.entries[0]);
  }
  
  // Statistiken testen
  console.log("\n--- Teste Statistiken ---");
  var stats = getUserStatistics(testName, testKennung);
  
  if (stats.success) {
    console.log("✅ Statistiken erfolgreich erstellt");
    console.log("   Gesamte Einträge:", stats.statistics.totalEntries);
    console.log("   Material verbraucht:", stats.statistics.totalMaterialUsage + " kg");
    console.log("   Masterbatch verbraucht:", stats.statistics.totalMasterbatchUsage + " kg");
    console.log("   Gesamtkosten:", stats.statistics.totalCost.toFixed(2) + " €");
  } else {
    console.error("❌ Statistiken fehlgeschlagen:", stats.error);
  }
}

function cleanupTestEntries() {
  console.log("=== Cleanup: Test-Einträge entfernen ===");
  
  try {
    var ss = getSpreadsheetWithRetry();
    var sheet = getSheetWithRetry(ss, getConfig('SHEET_NAME') || 'Uebersicht');
    
    var data = sheet.getDataRange().getValues();
    var rowsToDelete = [];
    
    // Finde alle Zeilen mit Test-Daten
    for (var i = data.length - 1; i >= 1; i--) { // Rückwärts durchgehen
      if (data[i][1] === "Test User" && data[i][2] === "test123") {
        rowsToDelete.push(i + 1); // +1 weil Sheet-Zeilen 1-basiert sind
      }
    }
    
    // Lösche gefundene Zeilen
    rowsToDelete.forEach(function(rowIndex) {
      sheet.deleteRow(rowIndex);
    });
    
    console.log("✅ " + rowsToDelete.length + " Test-Einträge entfernt");
    
  } catch (error) {
    console.error("❌ Fehler beim Cleanup:", error);
  }
}

// Hilfsfunktion für manuelle Tests
function runCompleteTest() {
  testAllFunctions();
  
  console.log("\n" + "=".repeat(50));
  console.log("Möchten Sie einen Test-Eintrag hinzufügen? (Dann testAddEntry() ausführen)");
  console.log("Möchten Sie Test-Einträge wieder löschen? (Dann cleanupTestEntries() ausführen)");
}

// Test für die korrigierten Material- und Masterbatch-Funktionen
function testMaterialsAndMasterbatches() {
  console.log("=== Test: Materials und Masterbatches ===");
  
  // Test getMaterials()
  try {
    var materials = getMaterials();
    console.log("Materials result:", materials);
    
    if (materials.success) {
      console.log("✓ getMaterials() erfolgreich");
      console.log("Anzahl Materialien:", materials.materials.length);
      console.log("Erste 3 Materialien:", materials.materials.slice(0, 3));
    } else {
      console.log("✗ getMaterials() fehlgeschlagen:", materials.error);
    }
  } catch (error) {
    console.log("✗ getMaterials() Exception:", error);
  }
  
  // Test getMasterbatches()
  try {
    var masterbatches = getMasterbatches();
    console.log("Masterbatches result:", masterbatches);
    
    if (masterbatches.success) {
      console.log("✓ getMasterbatches() erfolgreich");
      console.log("Anzahl Masterbatches:", masterbatches.masterbatches.length);
      console.log("Erste 3 Masterbatches:", masterbatches.masterbatches.slice(0, 3));
    } else {
      console.log("✗ getMasterbatches() fehlgeschlagen:", masterbatches.error);
    }
  } catch (error) {
    console.log("✗ getMasterbatches() Exception:", error);
  }
  
  // Test der Preisabfrage-Funktionen
  console.log("\n=== Test: Preisabfrage ===");
  
  try {
    var materials = getMaterials();
    if (materials.success && materials.materials.length > 0) {
      var testMaterial = materials.materials[0].name;
      var price = getMaterialPrice(testMaterial);
      console.log("✓ getMaterialPrice('" + testMaterial + "'):", price);
    }
  } catch (error) {
    console.log("✗ getMaterialPrice() Exception:", error);
  }
  
  try {
    var masterbatches = getMasterbatches();
    if (masterbatches.success && masterbatches.masterbatches.length > 0) {
      var testMasterbatch = masterbatches.masterbatches[0].name;
      var price = getMasterbatchPrice(testMasterbatch);
      console.log("✓ getMasterbatchPrice('" + testMasterbatch + "'):", price);
    }
  } catch (error) {
    console.log("✗ getMasterbatchPrice() Exception:", error);
  }
  
  console.log("=== Ende Material/Masterbatch Test ===\n");
}

// Test für vollständigen Workflow
function testCompleteWorkflow() {
  console.log("=== Test: Vollständiger Workflow ===");
  
  // Schritt 1: Verbindung testen
  var connection = testConnection();
  if (!connection.success) {
    console.log("✗ Verbindungstest fehlgeschlagen:", connection.error);
    return;
  }
  console.log("✓ Verbindung erfolgreich");
  
  // Schritt 2: Materialien und Masterbatches laden
  var materials = getMaterials();
  var masterbatches = getMasterbatches();
  
  if (!materials.success || !masterbatches.success) {
    console.log("✗ Materialien/Masterbatches laden fehlgeschlagen");
    return;
  }
  
  if (materials.materials.length === 0 || masterbatches.masterbatches.length === 0) {
    console.log("✗ Keine Materialien oder Masterbatches gefunden");
    return;
  }
  
  console.log("✓ Materialien und Masterbatches geladen");
  
  // Schritt 3: Kostenberechnung testen
  var testMaterial = materials.materials[0].name;
  var testMasterbatch = masterbatches.masterbatches[0].name;
  
  var costResult = calculateCost(testMaterial, 1.0, testMasterbatch, 0.1);
  
  if (costResult.success) {
    console.log("✓ Kostenberechnung erfolgreich:", costResult.formattedTotal);
  } else {
    console.log("✗ Kostenberechnung fehlgeschlagen:", costResult.error);
  }
  
  // Schritt 4: Test-Eintrag hinzufügen (optional - auskommentiert um echte Daten zu schützen)
  /*
  var addResult = AddRecord(
    "Test User",
    "TEST123",
    testMaterial,
    1.0,
    testMasterbatch,
    0.1
  );
  
  if (addResult.success) {
    console.log("✓ Test-Eintrag hinzugefügt:", addResult.message);
  } else {
    console.log("✗ Test-Eintrag fehlgeschlagen:", addResult.error);
  }
  */
  
  console.log("=== Ende Vollständiger Workflow Test ===\n");
}

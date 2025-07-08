function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('FGF Druck Menü')
    .addItem('Neuen Eintrag hinzufügen', 'addEntry')
    .addItem('Meine Übersicht anzeigen', 'showOverview')
    .addToUi();
}

function addEntry() {
  var ss = SpreadsheetApp.openById('1npM0-DHoN0xZjY0aKsNz2wECSM2rqPrlnSOUcwEI5Ww'); // ID der Datei
  var sheet = ss.getSheetByName('Uebersicht');

  var fhKennung = Browser.inputBox('Bitte geben Sie Ihre FH-Kennung ein:');
  if (!fhKennung) return;

  var material = Browser.inputBox('Bitte wählen Sie ein Material aus (z.B. Recycling PLA):');
  var materialPrice = getPrice(sheet, material, 'E', 'F');
  if (!materialPrice) {
    Browser.msgBox('Material nicht gefunden. Bitte erneut versuchen.');
    return;
  }

  var materialUsage = parseFloat(Browser.inputBox('Bitte geben Sie den Verbrauch des Materials in kg ein:'));
  if (isNaN(materialUsage)) {
    Browser.msgBox('Ungültige Eingabe für Materialverbrauch.');
    return;
  }

  var masterbatch = Browser.inputBox('Bitte wählen Sie einen Masterbatch aus (z.B. Masterbatch):');
  var masterbatchPrice = getPrice(sheet, masterbatch, 'H', 'I');
  if (!masterbatchPrice) {
    Browser.msgBox('Masterbatch nicht gefunden. Bitte erneut versuchen.');
    return;
  }

  var masterbatchUsage = parseFloat(Browser.inputBox('Bitte geben Sie den Verbrauch des Masterbatch in kg ein:'));
  if (isNaN(masterbatchUsage)) {
    Browser.msgBox('Ungültige Eingabe für Masterbatchverbrauch.');
    return;
  }

  var totalCost = (materialPrice * materialUsage) + (masterbatchPrice * masterbatchUsage);

  sheet.appendRow([
    new Date(),
    'Ihr Name',
    fhKennung,
    '',
    material,
    materialPrice,
    materialUsage,
    masterbatch,
    masterbatchPrice,
    masterbatchUsage,
    totalCost.toFixed(2) + ' €',
    'Nein',
    ''
  ]);

  Browser.msgBox('Eintrag erfolgreich hinzugefügt! Gesamtkosten: ' + totalCost.toFixed(2) + ' €');
}

function showOverview() {
  var ss = SpreadsheetApp.openById('1npM0-DHoN0xZjY0aKsNz2wECSM2rqPrlnSOUcwEI5Ww'); // ID der Datei
  var sheet = ss.getSheetByName('Uebersicht');

  var fhKennung = Browser.inputBox('Bitte geben Sie Ihre FH-Kennung ein:');
  if (!fhKennung) return;

  var data = sheet.getDataRange().getValues();
  var filteredData = data.filter(function(row) {
    return row[2] === fhKennung;
  });

  var overviewSheet = ss.getSheetByName('Meine Übersicht') || ss.insertSheet('Meine Übersicht');
  overviewSheet.clear();
  overviewSheet.appendRow(['Datum', 'Name', 'FH Kennung', 'Job - Notiz', 'Material', '€/kg', 'Verbrauch Material in kg', 'Masterbatch', '€/kg', 'Verbrauch Masterbatch in kg', 'Summe', 'Bezahlt', 'Info (automatisch)']);

  filteredData.forEach(function(row) {
    overviewSheet.appendRow(row);
  });

  Browser.msgBox('Übersicht aktualisiert!');
}

function getPrice(sheet, item, itemCol, priceCol) {
  try {
    // Verwende die neue getTablePrice-Funktion
    return getTablePrice(sheet, item, itemCol, priceCol);
  } catch (error) {
    console.error("Fehler in getPrice:", error);
    return null;
  }
}

function doGet() {
  try {
    var htmlOutput = HtmlService.createHtmlOutputFromFile('index')
      .setTitle("3D-Druck Abrechnung FGF")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    // Content Security Policy für bessere Sicherheit
    htmlOutput.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    
    return htmlOutput;
  } catch (error) {
    console.error("Fehler in doGet:", error);
    return HtmlService.createHtmlOutput("<p>Fehler beim Laden der Anwendung: " + error.toString() + "</p>");
  }
}

function AddRecord(name, kennung, material, materialMenge, masterbatch, masterbatchMenge) {
  try {
    // Konfiguration initialisieren
    initializeConfig();
    
    // Eingabe-Validierung mit der neuen Validierungsfunktion
    var validation = validateFormData(name, kennung, material, materialMenge, masterbatch, masterbatchMenge);
    
    if (!validation.isValid) {
      logOperation('AddRecord', { name: name, kennung: kennung }, false, validation.errors.join('; '));
      return { 
        success: false, 
        error: "Validierungsfehler: " + validation.errors.join(', ') 
      };
    }
    
    // Validierte Daten verwenden
    var validatedData = validation.data;
    
    // Spreadsheet mit Retry-Mechanismus öffnen
    var ss = getSpreadsheetWithRetry();
    var sheetName = getConfig('SHEET_NAME') || 'Uebersicht';
    var sheet = getSheetWithRetry(ss, sheetName);
    
    // Preise aus den separaten Tabellenblättern abrufen
    var materialPrice = getMaterialPrice(validatedData.material);
    var masterbatchPrice = getMasterbatchPrice(validatedData.masterbatch);
    
    // Gesamtkosten berechnen
    var totalCost = (materialPrice * validatedData.materialMenge) + (masterbatchPrice * validatedData.masterbatchMenge);
    var currency = getConfig('DEFAULT_CURRENCY') || '€';
    
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd.MM.yyyy HH:mm:ss");
    
    // Neuen Eintrag hinzufügen mit erweiterten Informationen
    var newRow = [
      today, 
      validatedData.name, 
      validatedData.kennung, 
      '', // Job-Notiz
      validatedData.material, 
      materialPrice, 
      validatedData.materialMenge, 
      validatedData.masterbatch, 
      masterbatchPrice, 
      validatedData.masterbatchMenge, 
      totalCost.toFixed(2) + ' ' + currency, 
      'Nein', 
      'Web-App v2.0 - ' + Session.getActiveUser().getEmail()
    ];
    
    // Atomare Operation: Row hinzufügen
    sheet.appendRow(newRow);
    SpreadsheetApp.flush(); // Sofortige Synchronisation
    
    var result = { 
      success: true, 
      message: "Eintrag erfolgreich hinzugefügt", 
      totalCost: totalCost.toFixed(2) + ' ' + currency,
      timestamp: today,
      entryId: newRow[0] + '_' + validatedData.kennung // Einfache ID-Generierung
    };
    
    logOperation('AddRecord', validatedData, true, null);
    return result;
    
  } catch (error) {
    var errorMsg = "Systemfehler beim Hinzufügen des Eintrags: " + error.toString();
    console.error("Fehler in AddRecord:", error);
    logOperation('AddRecord', { name: name, kennung: kennung }, false, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Hilfsfunktionen für Preis-Lookup
function getMaterialPrice(materialName) {
  try {
    var materials = getMaterials();
    if (!materials.success) {
      return 0.00;
    }
    
    var foundMaterial = materials.materials.find(function(m) {
      return m.name === materialName;
    });
    
    return foundMaterial ? foundMaterial.price : 0.00;
  } catch (error) {
    console.error("Fehler beim Abrufen des Materialpreises:", error);
    return 0.00;
  }
}

function getMasterbatchPrice(masterbatchName) {
  try {
    var masterbatches = getMasterbatches();
    if (!masterbatches.success) {
      return 0.00;
    }
    
    var foundMasterbatch = masterbatches.masterbatches.find(function(m) {
      return m.name === masterbatchName;
    });
    
    return foundMasterbatch ? foundMasterbatch.price : 0.00;
  } catch (error) {
    console.error("Fehler beim Abrufen des Masterbatch-Preises:", error);
    return 0.00;
  }
}

function getTablePrice(sheet, item, itemCol, priceCol) {
  try {
    var data = sheet.getDataRange().getValues();
    var itemColIndex = itemCol.charCodeAt(0) - 65; // A=0, B=1, etc.
    var priceColIndex = priceCol.charCodeAt(0) - 65;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][itemColIndex] && String(data[i][itemColIndex]).trim() === item) {
        var price = parseFloat(data[i][priceColIndex]);
        if (!isNaN(price)) {
          return price;
        }
      }
    }
    
    // Standardpreis zurückgeben, falls nicht gefunden
    return 0.00;
  } catch (error) {
    console.error("Fehler beim Abrufen des Preises:", error);
    return 0.00;
  }
}

function getUserEntries(name, kennung) {
  try {
    // Konfiguration initialisieren
    initializeConfig();
    
    // Eingabe-Validierung
    if (!name || !kennung) {
      return { 
        headers: [], 
        entries: [], 
        error: "Name und FH-Kennung sind erforderlich" 
      };
    }
    
    // Sicherstellen, dass Parameter als Strings behandelt werden
    var searchName = String(name).trim();
    var searchKennung = String(kennung).trim().toUpperCase(); // Kennung normalisieren
    
    if (searchName === '' || searchKennung === '') {
      return { 
        headers: [], 
        entries: [], 
        error: "Name und FH-Kennung dürfen nicht leer sein" 
      };
    }
    
    // Spreadsheet mit Retry-Mechanismus öffnen
    var ss = getSpreadsheetWithRetry();
    var sheetName = getConfig('SHEET_NAME') || 'Uebersicht';
    var sheet = getSheetWithRetry(ss, sheetName);
    
    var range = sheet.getDataRange();
    
    if (!range) {
      return { 
        headers: [], 
        entries: [], 
        error: "Datenbereich konnte nicht gelesen werden" 
      };
    }
    
    var data = range.getValues();
    
    if (!data || data.length === 0) {
      return { 
        headers: [], 
        entries: [], 
        debug: { message: "Keine Daten in der Tabelle gefunden" } 
      };
    }
    
    var headers = data[0] || [];
    var entries = [];
    var totalMatches = 0;
    
    // Optimierte Suche mit besserer Filterung
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      
      // Null-Check für die Zeile
      if (!row || row.length < 3) {
        continue;
      }
      
      // Sichere String-Konvertierung und Normalisierung
      var rowName = row[1] ? String(row[1]).trim() : '';
      var rowKennung = row[2] ? String(row[2]).trim().toUpperCase() : '';
      
      // Exakter Vergleich oder Teilstring-Suche für flexiblere Suche
      var nameMatch = rowName === searchName || 
                     (rowName.toLowerCase().includes(searchName.toLowerCase()) && searchName.length >= 3);
      var kennungMatch = rowKennung === searchKennung;
      
      if (nameMatch && kennungMatch) {
        entries.push(row);
        totalMatches++;
      }
    }
    
    // Sortiere Einträge nach Datum (neueste zuerst)
    entries.sort(function(a, b) {
      var dateA = new Date(a[0] || 0);
      var dateB = new Date(b[0] || 0);
      return dateB - dateA;
    });
    
    var result = { 
      headers: headers, 
      entries: entries,
      debug: {
        totalRows: data.length,
        filteredRows: entries.length,
        searchName: searchName,
        searchKennung: searchKennung,
        sampleRow: data.length > 1 ? data[1] : null,
        searchStrategy: "exact_and_partial_match"
      }
    };
    
    logOperation('getUserEntries', { name: searchName, kennung: searchKennung }, true, null);
    return result;
    
  } catch (error) {
    var errorMsg = "Systemfehler beim Abrufen der Einträge: " + error.toString();
    console.error("Fehler in getUserEntries:", error);
    logOperation('getUserEntries', { name: name, kennung: kennung }, false, errorMsg);
    return { 
      headers: [], 
      entries: [], 
      error: errorMsg 
    };
  }
}

function testConnection() {
  try {
    var ss = SpreadsheetApp.openById('1npM0-DHoN0xZjY0aKsNz2wECSM2rqPrlnSOUcwEI5Ww');
    
    if (!ss) {
      return {
        success: false,
        error: "Spreadsheet konnte nicht geöffnet werden"
      };
    }
    
    var sheet = ss.getSheetByName("Uebersicht");
    
    if (!sheet) {
      return {
        success: false,
        error: "Tabellenblatt 'Uebersicht' nicht gefunden"
      };
    }
    
    var range = sheet.getDataRange();
    
    if (!range) {
      return {
        success: false,
        error: "Datenbereich konnte nicht abgerufen werden"
      };
    }
    
    var data = range.getValues();
    
    if (!data) {
      return {
        success: false,
        error: "Daten konnten nicht gelesen werden"
      };
    }
    
    return {
      success: true,
      rowCount: data.length,
      columnCount: data.length > 0 ? data[0].length : 0,
      headers: data.length > 0 ? data[0] : [],
      firstDataRow: data.length > 1 ? data[1] : [],
      sheetName: sheet.getName(),
      lastUpdate: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd.MM.yyyy HH:mm:ss")
    };
    
  } catch (error) {
    console.error("Fehler in testConnection:", error);
    return {
      success: false,
      error: "Verbindungstest fehlgeschlagen: " + error.toString()
    };
  }
}

// Globale Konfiguration mit PropertiesService
function initializeConfig() {
  try {
    var properties = PropertiesService.getScriptProperties();
    
    // Standardkonfiguration setzen, falls nicht vorhanden
    var config = {
      'SPREADSHEET_ID': '1npM0-DHoN0xZjY0aKsNz2wECSM2rqPrlnSOUcwEI5Ww',
      'SHEET_NAME': 'Uebersicht',
      'DEFAULT_CURRENCY': '€',
      'MAX_RETRIES': 3,
      'ENABLE_DEBUG': 'true'
    };
    
    // Prüfe ob Konfiguration bereits vorhanden ist
    var existingConfig = properties.getProperties();
    
    if (Object.keys(existingConfig).length === 0) {
      properties.setProperties(config);
      console.log("Konfiguration initialisiert");
    }
    
    return config;
  } catch (error) {
    console.error("Fehler bei der Konfigurationsinitialisierung:", error);
    return null;
  }
}

function getConfig(key) {
  try {
    var properties = PropertiesService.getScriptProperties();
    return properties.getProperty(key);
  } catch (error) {
    console.error("Fehler beim Abrufen der Konfiguration:", error);
    return null;
  }
}

function setConfig(key, value) {
  try {
    var properties = PropertiesService.getScriptProperties();
    properties.setProperty(key, value);
    return true;
  } catch (error) {
    console.error("Fehler beim Setzen der Konfiguration:", error);
    return false;
  }
}

// Erweiterte Datenvalidierung
function validateFormData(name, kennung, material, materialMenge, masterbatch, masterbatchMenge) {
  var errors = [];
  
  // Name Validierung
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push("Name muss mindestens 2 Zeichen lang sein");
  }
  
  // Kennung Validierung (typische FH-Kennung Format)
  if (!kennung || typeof kennung !== 'string') {
    errors.push("FH-Kennung ist erforderlich");
  } else {
    // Einfache Validierung: mindestens 3 Zeichen, alphanumerisch
    var kennungPattern = /^[a-zA-Z0-9]{3,}$/;
    if (!kennungPattern.test(kennung.trim())) {
      errors.push("FH-Kennung muss mindestens 3 alphanumerische Zeichen enthalten");
    }
  }
  
  // Material Validierung
  if (!material || typeof material !== 'string' || material.trim().length < 2) {
    errors.push("Materialname muss mindestens 2 Zeichen lang sein");
  }
  
  // Masterbatch Validierung
  if (!masterbatch || typeof masterbatch !== 'string' || masterbatch.trim().length < 2) {
    errors.push("Masterbatch-Name muss mindestens 2 Zeichen lang sein");
  }
  
  // Mengen Validierung
  var materialMengeNum = parseFloat(materialMenge);
  var masterbatchMengeNum = parseFloat(masterbatchMenge);
  
  if (isNaN(materialMengeNum) || materialMengeNum <= 0 || materialMengeNum > 100) {
    errors.push("Materialmenge muss zwischen 0 und 100 kg liegen");
  }
  
  if (isNaN(masterbatchMengeNum) || masterbatchMengeNum <= 0 || masterbatchMengeNum > 50) {
    errors.push("Masterbatch-Menge muss zwischen 0 und 50 kg liegen");
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    data: {
      name: name.trim(),
      kennung: kennung.trim().toUpperCase(),
      material: material.trim(),
      materialMenge: materialMengeNum,
      masterbatch: masterbatch.trim(),
      masterbatchMenge: masterbatchMengeNum
    }
  };
}

// Neue Funktionen für Material- und Masterbatch-Verwaltung
function getMaterials() {
  try {
    initializeConfig();
    var ss = getSpreadsheetWithRetry();
    var sheet = getSheetWithRetry(ss, 'Material');
    
    var data = sheet.getDataRange().getValues();
    var materials = [];
    
    // Sammle alle verfügbaren Materialien (Spalte A = Name, Spalte E = Preis)
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][4]) { // Material und Preis
        var material = {
          name: String(data[i][0]).trim(),
          price: parseFloat(data[i][4]) || 0,
          currency: getConfig('DEFAULT_CURRENCY') || '€'
        };
        
        // Duplikate vermeiden
        var exists = materials.some(function(m) {
          return m.name === material.name;
        });
        
        if (!exists && material.name.length > 0) {
          materials.push(material);
        }
      }
    }
    
    return {
      success: true,
      materials: materials.sort(function(a, b) { return a.name.localeCompare(b.name); })
    };
    
  } catch (error) {
    console.error("Fehler beim Abrufen der Materialien:", error);
    return { success: false, error: error.toString() };
  }
}

function getMasterbatches() {
  try {
    initializeConfig();
    var ss = getSpreadsheetWithRetry();
    var sheet = getSheetWithRetry(ss, 'Masterbatch');
    
    var data = sheet.getDataRange().getValues();
    var masterbatches = [];
    
    // Sammle alle verfügbaren Masterbatches (Spalte A = Name, Spalte E = Preis)
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][4]) { // Masterbatch und Preis
        var masterbatch = {
          name: String(data[i][0]).trim(),
          price: parseFloat(data[i][4]) || 0,
          currency: getConfig('DEFAULT_CURRENCY') || '€'
        };
        
        // Duplikate vermeiden
        var exists = masterbatches.some(function(m) {
          return m.name === masterbatch.name;
        });
        
        if (!exists && masterbatch.name.length > 0) {
          masterbatches.push(masterbatch);
        }
      }
    }
    
    return {
      success: true,
      masterbatches: masterbatches.sort(function(a, b) { return a.name.localeCompare(b.name); })
    };
    
  } catch (error) {
    console.error("Fehler beim Abrufen der Masterbatches:", error);
    return { success: false, error: error.toString() };
  }
}

function calculateCost(material, materialMenge, masterbatch, masterbatchMenge) {
  try {
    var materials = getMaterials();
    var masterbatches = getMasterbatches();
    
    if (!materials.success || !masterbatches.success) {
      return { 
        success: false, 
        error: "Preislisten konnten nicht geladen werden",
        materialsError: materials.error || "OK",
        masterbatchesError: masterbatches.error || "OK"
      };
    }
    
    var materialPrice = 0;
    var masterbatchPrice = 0;
    
    // Sichere Behandlung der Eingaben mit deutscher Zahlenformat-Unterstützung
    var materialMengeNum = parseGermanFloat(materialMenge) || 0;
    var masterbatchMengeNum = parseGermanFloat(masterbatchMenge) || 0;
    
    // Finde Materialpreis (nur wenn Material ausgewählt)
    if (material && material !== "Material" && material !== "") {
      var foundMaterial = materials.materials.find(function(m) {
        return m.name === material;
      });
      
      if (foundMaterial) {
        materialPrice = foundMaterial.price;
      }
    }
    
    // Finde Masterbatch-Preis (nur wenn Masterbatch ausgewählt)
    if (masterbatch && masterbatch !== "Masterbatch" && masterbatch !== "") {
      var foundMasterbatch = masterbatches.masterbatches.find(function(m) {
        return m.name === masterbatch;
      });
      
      if (foundMasterbatch) {
        masterbatchPrice = foundMasterbatch.price;
      }
    }
    
    // Berechne Einzelkosten
    var materialCost = materialPrice * materialMengeNum;
    var masterbatchCost = masterbatchPrice * masterbatchMengeNum;
    
    // Gesamtkosten = Material-Kosten + Masterbatch-Kosten
    var totalCost = materialCost + masterbatchCost;
    var currency = getConfig('DEFAULT_CURRENCY') || '€';
    
    // Erweiterte Debug-Logging für Transparenz
    console.log("=== KOSTENBERECHNUNG DETAILS ===");
    console.log("Input Material:", material);
    console.log("Input Material Menge:", materialMenge, "-> Parsed:", materialMengeNum);
    console.log("Input Masterbatch:", masterbatch);
    console.log("Input Masterbatch Menge:", masterbatchMenge, "-> Parsed:", masterbatchMengeNum);
    console.log("Verfügbare Materialien:", materials.materials.map(function(m) { return m.name + ": " + m.price + "€"; }));
    console.log("Verfügbare Masterbatches:", masterbatches.masterbatches.map(function(m) { return m.name + ": " + m.price + "€"; }));
    console.log("Gefundener Material-Preis:", materialPrice, "€/kg");
    console.log("Gefundener Masterbatch-Preis:", masterbatchPrice, "€/kg");
    console.log("Material-Kosten:", materialPrice, "* ", materialMengeNum, "=", materialCost, "€");
    console.log("Masterbatch-Kosten:", masterbatchPrice, "* ", masterbatchMengeNum, "=", masterbatchCost, "€");
    console.log("Gesamtkosten:", materialCost, "+", masterbatchCost, "=", totalCost, "€");
    console.log("=== END DETAILS ===");
    
    return {
      success: true,
      materialPrice: materialPrice,
      masterbatchPrice: masterbatchPrice,
      materialCost: materialCost,
      masterbatchCost: masterbatchCost,
      totalCost: totalCost,
      formattedTotal: totalCost.toFixed(2).replace('.', ',') + ' ' + currency,
      // Debug-Informationen
      debug: {
        materialFound: materialPrice > 0,
        masterbatchFound: masterbatchPrice > 0,
        availableMaterials: materials.materials.length,
        availableMasterbatches: masterbatches.masterbatches.length
      }
    };
    
  } catch (error) {
    console.error("Fehler bei der Kostenberechnung:", error);
    return { success: false, error: error.toString() };
  }
}

// Hilfsfunktion für deutsche Zahlenformate im Backend
function parseGermanFloat(value) {
  if (!value || value === '') return 0;
  
  // Konvertiere zu String und entferne alle Zeichen außer Zahlen, Komma und Punkt
  var cleaned = value.toString().replace(/[^\d,.-]/g, '');
  
  // Konvertiere deutsches Komma zu Punkt
  var normalized = cleaned.replace(',', '.');
  var parsed = parseFloat(normalized);
  
  return isNaN(parsed) ? 0 : parsed;
}

// Funktion für Statistiken und Berichte
function getUserStatistics(name, kennung) {
  try {
    var userEntries = getUserEntries(name, kennung);
    
    if (!userEntries || userEntries.error) {
      return { success: false, error: userEntries.error || "Fehler beim Abrufen der Einträge" };
    }
    
    var entries = userEntries.entries;
    var stats = {
      totalEntries: entries.length,
      totalMaterialUsage: 0,
      totalMasterbatchUsage: 0,
      totalCost: 0,
      averageCost: 0,
      materialTypes: {},
      masterbatchTypes: {},
      entriesByMonth: {}
    };
    
    entries.forEach(function(entry) {
      // Materialverbrauch (Spalte 6)
      var materialUsage = parseFloat(entry[6]) || 0;
      stats.totalMaterialUsage += materialUsage;
      
      // Masterbatch-Verbrauch (Spalte 9)
      var masterbatchUsage = parseFloat(entry[9]) || 0;
      stats.totalMasterbatchUsage += masterbatchUsage;
      
      // Material-Typen zählen
      var material = String(entry[4] || '').trim();
      if (material) {
        stats.materialTypes[material] = (stats.materialTypes[material] || 0) + materialUsage;
      }
      
      // Masterbatch-Typen zählen
      var masterbatch = String(entry[7] || '').trim();
      if (masterbatch) {
        stats.masterbatchTypes[masterbatch] = (stats.masterbatchTypes[masterbatch] || 0) + masterbatchUsage;
      }
      
      // Kosten extrahieren (Spalte 10)
      var costStr = String(entry[10] || '');
      var costMatch = costStr.match(/(\d+\.?\d*)/);
      if (costMatch) {
        var cost = parseFloat(costMatch[1]);
        stats.totalCost += cost;
      }
      
      // Einträge nach Monat
      var dateStr = String(entry[0] || '');
      var date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        var monthKey = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0');
        stats.entriesByMonth[monthKey] = (stats.entriesByMonth[monthKey] || 0) + 1;
      }
    });
    
    stats.averageCost = stats.totalEntries > 0 ? stats.totalCost / stats.totalEntries : 0;
    
    return { success: true, statistics: stats };
    
  } catch (error) {
    console.error("Fehler bei der Statistik-Erstellung:", error);
    return { success: false, error: error.toString() };
  }
}

// Debug-Funktion zum Testen der Preisabfrage
function debugPrices() {
  try {
    console.log("=== DEBUG PREISE ===");
    
    // Teste Material-Tabelle
    var ss = getSpreadsheetWithRetry();
    var materialSheet = getSheetWithRetry(ss, 'Material');
    var materialData = materialSheet.getDataRange().getValues();
    
    console.log("Material-Tabelle Struktur:");
    console.log("Header:", materialData[0]);
    console.log("Alle Daten:");
    for (var i = 0; i < Math.min(materialData.length, 10); i++) {
      console.log("Zeile " + i + ":", materialData[i]);
    }
    
    // Teste Masterbatch-Tabelle
    var masterbatchSheet = getSheetWithRetry(ss, 'Masterbatch');
    var masterbatchData = masterbatchSheet.getDataRange().getValues();
    
    console.log("Masterbatch-Tabelle Struktur:");
    console.log("Header:", masterbatchData[0]);
    console.log("Alle Daten:");
    for (var i = 0; i < Math.min(masterbatchData.length, 10); i++) {
      console.log("Zeile " + i + ":", masterbatchData[i]);
    }
    
    // Teste die aktuellen Funktionen
    var materials = getMaterials();
    var masterbatches = getMasterbatches();
    
    console.log("getMaterials() Ergebnis:", materials);
    console.log("getMasterbatches() Ergebnis:", masterbatches);
    
    return {
      success: true,
      materialData: materialData,
      masterbatchData: masterbatchData,
      materials: materials,
      masterbatches: masterbatches
    };
    
  } catch (error) {
    console.error("Debug-Fehler:", error);
    return { success: false, error: error.toString() };
  }
}

// Erweiterte Spreadsheet-Funktionen mit Retry-Mechanismus
function getSpreadsheetWithRetry() {
  var maxRetries = parseInt(getConfig('MAX_RETRIES')) || 3;
  var spreadsheetId = getConfig('SPREADSHEET_ID');
  
  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      var ss = SpreadsheetApp.openById(spreadsheetId);
      if (ss) {
        return ss;
      }
    } catch (error) {
      console.warn("Versuch " + attempt + " fehlgeschlagen:", error);
      if (attempt === maxRetries) {
        throw new Error("Spreadsheet konnte nach " + maxRetries + " Versuchen nicht geöffnet werden: " + error.toString());
      }
      Utilities.sleep(1000 * attempt); // Exponential backoff
    }
  }
}

function getSheetWithRetry(spreadsheet, sheetName) {
  try {
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error("Tabellenblatt '" + sheetName + "' nicht gefunden");
    }
    return sheet;
  } catch (error) {
    console.error("Fehler beim Abrufen des Tabellenblatts:", error);
    throw error;
  }
}

// Logging-Funktionen für bessere Fehlerdiagnose
function logOperation(operation, data, success, error) {
  var debugEnabled = getConfig('ENABLE_DEBUG') === 'true';
  
  if (debugEnabled) {
    var logEntry = {
      timestamp: new Date().toISOString(),
      operation: operation,
      data: data,
      success: success,
      error: error
    };
    
    console.log("Operation Log:", JSON.stringify(logEntry));
  }
}

// Admin-Funktionen für die Verwaltung aller Einträge
function getAllEntries() {
  try {
    initializeConfig();
    var ss = getSpreadsheetWithRetry();
    var sheetName = getConfig('SHEET_NAME') || 'Uebersicht';
    var sheet = getSheetWithRetry(ss, sheetName);
    
    var range = sheet.getDataRange();
    if (!range) {
      return { success: false, error: "Datenbereich konnte nicht gelesen werden" };
    }
    
    var data = range.getValues();
    if (!data || data.length === 0) {
      return { success: true, entries: [], headers: [] };
    }
    
    var headers = data[0] || [];
    var entries = [];
    
    // Alle Einträge sammeln (außer Header)
    for (var i = 1; i < data.length; i++) {
      if (data[i] && data[i].length > 0) {
        // Prüfe ob die Zeile nicht komplett leer ist
        var hasContent = data[i].some(function(cell) {
          return cell !== null && cell !== undefined && cell !== '';
        });
        
        if (hasContent) {
          entries.push(data[i]);
        }
      }
    }
    
    // Sortiere nach Datum (neueste zuerst)
    entries.sort(function(a, b) {
      var dateA = new Date(a[0] || 0);
      var dateB = new Date(b[0] || 0);
      return dateB - dateA;
    });
    
    return {
      success: true,
      entries: entries,
      headers: headers,
      totalCount: entries.length,
      debug: {
        message: "Alle Einträge erfolgreich geladen",
        totalRows: data.length,
        dataRows: entries.length
      }
    };
    
  } catch (error) {
    console.error("Fehler beim Abrufen aller Einträge:", error);
    return { success: false, error: error.toString() };
  }
}

function markAsPaid(rowIndex, isPaid) {
  try {
    initializeConfig();
    var ss = getSpreadsheetWithRetry();
    var sheetName = getConfig('SHEET_NAME') || 'Uebersicht';
    var sheet = getSheetWithRetry(ss, sheetName);
    
    // Prüfe ob die Zeile existiert
    var range = sheet.getDataRange();
    var data = range.getValues();
    
    if (rowIndex < 1 || rowIndex >= data.length) {
      return { success: false, error: "Ungültiger Zeilenindex: " + rowIndex };
    }
    
    // Bestimme die Spalte für den Bezahlt-Status (Spalte L = Index 11)
    var paidColumn = 12; // Spalte L (1-basiert)
    var actualRowIndex = rowIndex + 1; // Apps Script ist 1-basiert
    
    // Setze den Bezahlt-Status
    var paidValue = isPaid ? "Bezahlt" : "";
    sheet.getRange(actualRowIndex, paidColumn).setValue(paidValue);
    
    // Setze auch das Bezahlt-Datum wenn als bezahlt markiert
    if (isPaid) {
      var paidDateColumn = 13; // Spalte M für Bezahlt-Datum
      sheet.getRange(actualRowIndex, paidDateColumn).setValue(new Date());
    } else {
      var paidDateColumn = 13;
      sheet.getRange(actualRowIndex, paidDateColumn).setValue("");
    }
    
    return {
      success: true,
      message: "Status erfolgreich aktualisiert",
      rowIndex: rowIndex,
      isPaid: isPaid,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Bezahlt-Status:", error);
    return { success: false, error: error.toString() };
  }
}

function getAdminStatistics() {
  try {
    var allEntries = getAllEntries();
    
    if (!allEntries.success) {
      return { success: false, error: allEntries.error };
    }
    
    var entries = allEntries.entries;
    var stats = {
      totalEntries: entries.length,
      paidEntries: 0,
      unpaidEntries: 0,
      totalRevenue: 0,
      pendingRevenue: 0,
      uniqueUsers: {},
      materialUsage: {},
      masterbatchUsage: {},
      entriesThisMonth: 0,
      entriesThisWeek: 0
    };
    
    var now = new Date();
    var thisMonth = now.getMonth();
    var thisYear = now.getFullYear();
    var oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    entries.forEach(function(entry) {
      // Benutzer zählen
      var user = (entry[1] || '') + ' (' + (entry[2] || '') + ')';
      stats.uniqueUsers[user] = (stats.uniqueUsers[user] || 0) + 1;
      
      // Materialverbrauch
      var material = entry[4] || 'Unbekannt';
      var materialAmount = parseFloat(entry[6]) || 0;
      stats.materialUsage[material] = (stats.materialUsage[material] || 0) + materialAmount;
      
      // Masterbatch-Verbrauch
      var masterbatch = entry[7] || 'Unbekannt';
      var masterbatchAmount = parseFloat(entry[9]) || 0;
      stats.masterbatchUsage[masterbatch] = (stats.masterbatchUsage[masterbatch] || 0) + masterbatchAmount;
      
      // Kosten extrahieren
      var costStr = String(entry[10] || '');
      var cost = 0;
      if (costStr) {
        var match = costStr.match(/[\d,]+/);
        if (match) {
          cost = parseFloat(match[0].replace(',', '.')) || 0;
        }
      }
      
      // Bezahlt-Status prüfen (Spalte L = Index 11)
      var isPaid = String(entry[11] || '').toLowerCase().includes('bezahlt');
      
      if (isPaid) {
        stats.paidEntries++;
        stats.totalRevenue += cost;
      } else {
        stats.unpaidEntries++;
        stats.pendingRevenue += cost;
      }
      
      // Zeitbasierte Statistiken
      var entryDate = new Date(entry[0]);
      if (entryDate.getMonth() === thisMonth && entryDate.getFullYear() === thisYear) {
        stats.entriesThisMonth++;
      }
      if (entryDate >= oneWeekAgo) {
        stats.entriesThisWeek++;
      }
    });
    
    return {
      success: true,
      statistics: stats
    };
    
  } catch (error) {
    console.error("Fehler beim Erstellen der Admin-Statistiken:", error);
    return { success: false, error: error.toString() };
  }
}
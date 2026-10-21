// Materialbestand: was ein neuer Auftrag vom Lagerbestand abzieht. Eigenes Material und Aufträge ohne
// Werkstattmaterial ändern den Bestand nicht.
function stockDeduction(entry) {
  if (!entry || entry.ownMaterialUsed === true) return null;
  const materialId = typeof entry.materialId === 'string' ? entry.materialId : '';
  const kg = Number(entry.materialMenge);
  if (!materialId || !Number.isFinite(kg) || kg <= 0) return null;
  return { materialId, kg };
}

// Neuer Bestand; nur wenn für das Material überhaupt ein Bestand geführt wird (Zahl), sonst null.
function nextStock(currentStock, kg) {
  if (typeof currentStock !== 'number' || !Number.isFinite(currentStock)) return null;
  return Math.round((currentStock - kg) * 1000) / 1000;
}

module.exports = { stockDeduction, nextStock };

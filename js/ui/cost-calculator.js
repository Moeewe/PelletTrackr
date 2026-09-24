// Shared pricing implementation for preview and save.
async function calculateCostPreview() { return window.Billing.preview(); }
let costCalculationTimeout = null;
function throttledCalculateCost() {
  clearTimeout(costCalculationTimeout);
  costCalculationTimeout = setTimeout(calculateCostPreview, 300);
}
window.calculateCostPreview = calculateCostPreview;
window.throttledCalculateCost = throttledCalculateCost;

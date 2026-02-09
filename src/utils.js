// src/utils.js

const ENCHANTMENT_COUNTS = {
    '1H_WEAPON': 288,
    '2H_WEAPON': 384,
    'ARMOR': 192,
    'OFF_HAND': 96,
    'UNKNOWN': 0
};

function getMaterialCount(category) {
    return ENCHANTMENT_COUNTS[category] || 0;
}

/**
 * Logic matches your screenshot:
 * Profit = SellPrice - (BaseItemPrice + UpgradeMaterialCost) - Tax
 */
function calculateFlipData(
    baseItemName,     // e.g. "Expert's Holy Staff [5.0]"
    targetItemName,   // e.g. "Expert's Holy Staff [5.1]"
    basePrice,        // Buy Price
    targetPrice,      // Sell Price (BM)
    materialCostUnit, // Cost of 1 Rune/Soul
    materialCount,    // e.g. 192
    isPremium
) {
    if (!basePrice || !targetPrice) return null;

    const upgradeCost = materialCostUnit * materialCount; // The "Upgrade Cost" column
    const totalInputCost = basePrice + upgradeCost;
    
    // Tax: Premium = 4%, Non-Premium = 8% (4% Setup + 4% Sales)
    // Note: Some players argue BM only has sales tax, but usually, setup fees apply. 
    // We will stick to the standard 4% (Premium) vs 8% (Non-Premium) total deduction on Sales.
    const taxRate = isPremium ? 0.04 : 0.08;
    const tax = targetPrice * taxRate;

    const profit = targetPrice - totalInputCost - tax;
    const roi = (profit / totalInputCost) * 100;

    return {
        itemBase: baseItemName,
        itemTarget: targetItemName,
        buyPrice: basePrice,
        sellPrice: targetPrice,
        upgradeCost: upgradeCost, // Materials only
        profit: Math.floor(profit),
        roi: roi.toFixed(2)
    };
}

module.exports = { calculateFlipData, getMaterialCount };
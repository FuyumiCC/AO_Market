// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getMarketData, getAllMaterials } = require('./src/fetchMarketData');
const { getMaterialCount } = require('./src/utils');
const { CATEGORIES } = require('./src/itemLists');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const QUALITY_NAMES = {
    1: 'Normal',
    2: 'Good',
    3: 'Outstanding',
    4: 'Excellent',
    5: 'Masterpiece'
};

app.get('/api/scan-category', async (req, res) => {
    const { city, category } = req.query;

    if (!city || !category || !CATEGORIES[category]) {
        return res.status(400).json({ error: "Invalid parameters" });
    }

    const baseItems = CATEGORIES[category];
    const tiers = [4, 5, 6, 7, 8];
    const matCount = getMaterialCount(category);
    const results = [];

    try {
        // 1. Fetch Materials (Runes, Souls, Relics only)
        const matPromises = tiers.map(t => getAllMaterials(t, city));
        const matResponses = await Promise.all(matPromises);
        
        const materialMap = {};
        tiers.forEach((tier, index) => {
            const data = matResponses[index] || [];
            materialMap[tier] = {
                RUNE: data.find(d => d.item_id.includes('RUNE'))?.sell_price_min || 9999999,
                SOUL: data.find(d => d.item_id.includes('SOUL'))?.sell_price_min || 9999999,
                RELIC: data.find(d => d.item_id.includes('RELIC'))?.sell_price_min || 9999999
            };
        });

        // 2. Prepare IDs (.0 to .3)
        let itemIdsToFetch = [];
        tiers.forEach(tier => {
            baseItems.forEach(base => {
                for(let i=0; i<=3; i++) { // STRICTLY STOP AT 3
                    itemIdsToFetch.push(i === 0 ? `T${tier}_${base}` : `T${tier}_${base}@${i}`);
                }
            });
        });

        // 3. Fetch Items
        const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
        const idChunks = chunk(itemIdsToFetch, 70); 
        
        let allItemData = [];
        for (const ids of idChunks) {
            const data = await getMarketData(ids.join(','), `${city},Black Market`);
            if (data) allItemData = allItemData.concat(data);
        }

        // 4. Analysis Loop
        for (const tier of tiers) {
            const mats = materialMap[tier];
            if (!mats) continue;

            const costRunes = mats.RUNE * matCount;
            const costSouls = mats.SOUL * matCount;
            const costRelics = mats.RELIC * matCount;

            for (const base of baseItems) {
                const ids = [
                    `T${tier}_${base}`,      // 0
                    `T${tier}_${base}@1`,    // 1
                    `T${tier}_${base}@2`,    // 2
                    `T${tier}_${base}@3`     // 3
                ];

                for (let q = 1; q <= 5; q++) {
                    const getPrice = (id, loc, type) => {
                        const entry = allItemData.find(d => d.item_id === id && d.city === loc && d.quality === q);
                        return entry ? (type === 'buy' ? entry.sell_price_min : entry.buy_price_max) : 0;
                    };

                    const p = ids.map(id => getPrice(id, city, 'buy'));
                    
                    // Loop through Targets (.0, .1, .2, .3)
                    for (let target = 0; target <= 3; target++) {
                        
                        const sellPriceBM = getPrice(ids[target], 'Black Market', 'sell');
                        if (sellPriceBM <= 0) continue;

                        let bestCost = Infinity;
                        let strategy = '';
                        let itemStartId = ''; 
                        let startPrice = 0;
                        let upgradeCost = 0;
                        let upgradeDetails = [];

                        // Strategy A: Direct Flip
                        if (p[target] > 0) {
                            bestCost = p[target];
                            strategy = 'Direct Flip';
                            itemStartId = ids[target]; 
                            startPrice = p[target];
                            upgradeCost = 0;
                        }

                        // Strategy B: Buy Previous + Upgrade
                        if (target > 0) {
                            const prev = target - 1;
                            if (p[prev] > 0) {
                                let matCost = 0;
                                let matObj = null;

                                if (target === 1) { matCost = costRunes; matObj = {name:'Rune', price: mats.RUNE}; }
                                else if (target === 2) { matCost = costSouls; matObj = {name:'Soul', price: mats.SOUL}; }
                                else if (target === 3) { matCost = costRelics; matObj = {name:'Relic', price: mats.RELIC}; }

                                const totalUpgradeCost = p[prev] + matCost;
                                
                                if (totalUpgradeCost < bestCost) {
                                    bestCost = totalUpgradeCost;
                                    strategy = `Enchant .${prev} -> .${target}`;
                                    itemStartId = ids[prev]; 
                                    startPrice = p[prev];
                                    upgradeCost = matCost;
                                    upgradeDetails = [{ name: matObj.name, count: matCount, price: matObj.price }];
                                }
                            }
                        }

                        // Strategy C: Buy .0 + Full Upgrade (Only for .3 target)
                        if (target === 3 && p[0] > 0) {
                            const fullCost = p[0] + costRunes + costSouls + costRelics;
                            if (fullCost < bestCost) {
                                bestCost = fullCost;
                                strategy = 'Enchant .0 -> .3';
                                itemStartId = ids[0]; 
                                startPrice = p[0];
                                upgradeCost = costRunes + costSouls + costRelics;
                                upgradeDetails = [
                                    { name: 'Rune', count: matCount, price: mats.RUNE },
                                    { name: 'Soul', count: matCount, price: mats.SOUL },
                                    { name: 'Relic', count: matCount, price: mats.RELIC }
                                ];
                            }
                        }

                        if (bestCost === Infinity) continue;

                        const profitPrem = sellPriceBM - bestCost - (sellPriceBM * 0.04);
                        const profitNonPrem = sellPriceBM - bestCost - (sellPriceBM * 0.08);

                        if (profitPrem > 0) {
                            results.push({
                                itemStart: itemStartId,
                                itemEnd: ids[target],
                                tier,
                                quality: q,
                                qualityName: QUALITY_NAMES[q],
                                strategy,
                                startPrice,
                                upgradeCost,
                                upgradeDetails,
                                sellPrice: sellPriceBM,
                                profitPrem: Math.floor(profitPrem),
                                profitNonPrem: Math.floor(profitNonPrem)
                            });
                        }
                    }
                }
            }
        }

        results.sort((a, b) => b.profitPrem - a.profitPrem);
        res.json(results);

    } catch (e) {
        console.error("Scan Error:", e);
        res.status(500).json({ error: "Failed to scan market" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
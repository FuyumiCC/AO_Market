// src/fetchMarketData.js
const axios = require('axios');

async function getMarketData(itemIds, locations) {
    // Fetch qualities 1-5 (Normal to Masterpiece)
    const url = `${process.env.ALBION_API_URL}/${itemIds}?locations=${locations}&qualities=1,2,3,4,5`;
    try {
        const response = await axios.get(url, { timeout: 8000 });
        return response.data;
    } catch (error) {
        console.error(`[API Error] Failed to fetch items: ${error.message}`);
        return [];
    }
}

async function getAllMaterials(tier, city) {
    // Added SHARD_AVALONIAN for .4 upgrades
    const materials = [
        `T${tier}_RUNE`, 
        `T${tier}_SOUL`, 
        `T${tier}_RELIC`, 
        `T${tier}_SHARD_AVALONIAN`
    ].join(',');

    const url = `${process.env.ALBION_API_URL}/${materials}?locations=${city}&qualities=1`;
    
    try {
        const response = await axios.get(url, { timeout: 5000 });
        return response.data;
    } catch (error) {
        console.error(`[API Error] Failed to fetch materials: ${error.message}`);
        return [];
    }
}

module.exports = { getMarketData, getAllMaterials };
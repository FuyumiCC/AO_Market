// public/app.js

let allResults = [];      
let filteredResults = []; 
let currentPage = 1;

// --- CHANGE THIS VALUE ---
const ITEMS_PER_PAGE = 50; 
// -------------------------

let itemLookup = {}; 
let sortDescending = true; 
let hiddenItems = new Set(); 


// The categories to scan in batch
const SCAN_CATEGORIES = ['1H_WEAPON', '2H_WEAPON', 'ARMOR', 'OFF_HAND'];

document.addEventListener('DOMContentLoaded', () => {
    loadItemDatabase();
    loadHiddenItems();
});

// --- HELPER: Detect Item Type from ID ---
function getItemType(id) {
    // Standardize ID string
    const s = id.toUpperCase();
    
    // Weapons
    if (s.includes('SWORD') || s.includes('CLAYMORE') || s.includes('GALATINE')) return 'Sword';
    if (s.includes('AXE') || s.includes('SCYTHE') || s.includes('HALBERD')) return 'Axe';
    if (s.includes('MACE')) return 'Mace';
    if (s.includes('HAMMER')) return 'Hammer';
    if (s.includes('SPEAR') || s.includes('PIKE') || s.includes('GLAIVE')) return 'Spear';
    if (s.includes('DAGGER') || s.includes('CLAWS')) return 'Dagger';
    if (s.includes('QSTAFF') || s.includes('QUARTERSTAFF') || s.includes('IRONCLAD') || s.includes('STAFF_COMBAT')) return 'Quarterstaff';
    if (s.includes('BOW')) return 'Bow';
    if (s.includes('CROSSBOW')) return 'Crossbow';
    
    // Magic Staffs
    if (s.includes('CURSED')) return 'Cursed Staff';
    if (s.includes('FIRE')) return 'Fire Staff';
    if (s.includes('FROST') || s.includes('ICICLE')) return 'Frost Staff';
    if (s.includes('ARCANE')) return 'Arcane Staff';
    if (s.includes('HOLY')) return 'Holy Staff';
    if (s.includes('NATURE') || s.includes('WILDSTAFF')) return 'Nature Staff';

    // Armor
    if (s.includes('ARMOR_PLATE') || s.includes('HELM_PLATE') || s.includes('SHOES_PLATE')) return 'Plate Armor';
    if (s.includes('ARMOR_LEATHER') || s.includes('HELM_LEATHER') || s.includes('SHOES_LEATHER')) return 'Leather Armor';
    if (s.includes('ARMOR_CLOTH') || s.includes('HELM_CLOTH') || s.includes('SHOES_CLOTH')) return 'Cloth Armor';

    // Offhand
    if (s.includes('OFF_')) return 'Off-Hand';

    return 'Other';
}

function loadHiddenItems() {
    const saved = localStorage.getItem('albionHiddenItems');
    if (saved) hiddenItems = new Set(JSON.parse(saved));
}

function saveHiddenItems() {
    localStorage.setItem('albionHiddenItems', JSON.stringify([...hiddenItems]));
}

async function loadItemDatabase() {
    const statusText = document.querySelector('.empty-state');
    if(statusText) statusText.innerText = "Loading Item Database...";
    try {
        const res = await fetch('https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json');
        const items = await res.json();
        items.forEach(item => {
            if (item.LocalizedNames && item.LocalizedNames['EN-US']) {
                itemLookup[item.UniqueName] = item.LocalizedNames['EN-US'];
            }
        });
        if(statusText) statusText.innerText = "Database Loaded. Click 'Scan All Markets' to begin.";
    } catch (error) {
        console.error("Failed to load item names:", error);
    }
}

function getRealName(id) {
    if (itemLookup[id]) return itemLookup[id];
    const baseId = id.split('@')[0];
    if (itemLookup[baseId]) return itemLookup[baseId];
    return id.replace(/_/g, ' ').replace(/T\d+/, '').trim(); 
}

function getEnchantTag(id) {
    if (id.includes('@1')) return '.1';
    if (id.includes('@2')) return '.2';
    if (id.includes('@3')) return '.3';
    return '.0';
}

// --- NEW BATCH SCAN FUNCTION ---
async function startBatchScan() {
    const city = document.getElementById('citySelect').value;
    const tbody = document.getElementById('resultsBody');
    const btn = document.querySelector('.scan-btn');
    
    // UI Reset
    allResults = []; // Clear previous results
    filteredResults = [];
    currentPage = 1;
    btn.disabled = true;
    
    try {
        // Loop through all categories defined at top
        for (let i = 0; i < SCAN_CATEGORIES.length; i++) {
            const cat = SCAN_CATEGORIES[i];
            
            // Update UI to show progress
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-text" style="text-align:center; padding:30px;">
                        <i class="fas fa-spinner fa-spin"></i> 
                        Scanning Category ${i + 1}/${SCAN_CATEGORIES.length}: <strong>${cat}</strong>...<br>
                        <small>Found ${allResults.length} profitable items so far.</small>
                    </td>
                </tr>`;
            btn.innerHTML = `<i class="fas fa-sync fa-spin"></i> Scanning ${i + 1}/${SCAN_CATEGORIES.length}...`;

            // Fetch
            const response = await fetch(`/api/scan-category?city=${city}&category=${cat}`);
            const data = await response.json();
            
            if (Array.isArray(data)) {
                allResults = allResults.concat(data);
            }
        }

        // Finalize
        applyFiltersAndSort(); 

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="error-text" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search"></i> Scan All Markets';
    }
}

function getRowKey(row) {
    return `${row.itemStart}_${row.itemEnd}_${row.quality}`;
}

function hideItem(indexInPage) {
    const realIndex = (currentPage - 1) * ITEMS_PER_PAGE + indexInPage;
    const row = filteredResults[realIndex];
    if (row) {
        hiddenItems.add(getRowKey(row));
        saveHiddenItems();
        applyFiltersAndSort();
    }
}

function resetHidden() {
    if(confirm("Show all hidden items?")) {
        hiddenItems.clear();
        saveHiddenItems();
        applyFiltersAndSort();
    }
}

function toggleSort() {
    sortDescending = !sortDescending;
    const icon = document.getElementById('sortIcon');
    icon.className = sortDescending ? 'fas fa-sort-down' : 'fas fa-sort-up';
    applyFiltersAndSort();
}

function applyFiltersAndSort() {
    // 1. Get current Filter Value
    const filterType = document.getElementById('typeFilter').value;

    // 2. Filter Logic
    filteredResults = allResults.filter(row => {
        // A. Check Hidden
        if (hiddenItems.has(getRowKey(row))) return false;

        // B. Check Type Filter
        if (filterType !== 'ALL') {
            const type = getItemType(row.itemStart); // Use itemStart ID to determine type
            if (type !== filterType) return false;
        }
        
        return true;
    });

    // 3. Sort Logic
    filteredResults.sort((a, b) => {
        return sortDescending 
            ? b.profitPrem - a.profitPrem 
            : a.profitPrem - b.profitPrem;
    });

    // 4. Render
    const maxPage = Math.ceil(filteredResults.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > maxPage) currentPage = maxPage;
    
    renderPage();
}

function renderPage() {
    const tbody = document.getElementById('resultsBody');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!filteredResults || filteredResults.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state" style="text-align:center; padding:20px;">No items match your filter.</td></tr>';
        pageInfo.innerText = '0 items';
        return;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = filteredResults.slice(start, end);

    tbody.innerHTML = '';

    pageData.forEach((row, index) => {
        const fmt = (num) => num ? num.toLocaleString() : '0';
        const nameStart = getRealName(row.itemStart);
        const nameEnd = getRealName(row.itemEnd);
        const tagStart = `[${row.tier}${getEnchantTag(row.itemStart)}]`;
        const tagEnd = `[${row.tier}${getEnchantTag(row.itemEnd)}]`;

        let qClass = 'q-normal';
        if(row.quality === 2) qClass = 'q-good';
        if(row.quality === 3) qClass = 'q-outstanding';
        if(row.quality === 4) qClass = 'q-excellent';
        if(row.quality === 5) qClass = 'q-masterpiece';

        let itemDisplayHtml = '';
        if (row.itemStart === row.itemEnd) {
            itemDisplayHtml = `
                <div class="item-stack">
                    <div class="item-row target">
                        <span class="tier-tag highlight">${tagStart}</span>
                        <span class="item-name highlight">${nameStart}</span>
                    </div>
                    <div class="quality-row"><span class="quality-badge ${qClass}">${row.qualityName}</span></div>
                </div>`;
        } else {
            itemDisplayHtml = `
                <div class="item-stack">
                    <div class="item-row">
                        <span class="tier-tag">${tagStart}</span>
                        <span class="item-name">${nameStart}</span>
                    </div>
                    <div class="quality-row"><span class="quality-badge ${qClass}">${row.qualityName}</span></div>
                    <i class="fas fa-arrow-down arrow-icon"></i>
                    <div class="item-row target">
                        <span class="tier-tag highlight">${tagEnd}</span>
                        <span class="item-name highlight">${nameEnd}</span>
                    </div>
                </div>`;
        }

        let materialHtml = '';
        if (row.upgradeDetails.length === 0) {
             materialHtml = '<span style="color:#666; font-size:0.8rem;">None</span>';
        } else {
            row.upgradeDetails.forEach(mat => {
                materialHtml += `
                    <div class="mat-row-detail">
                        <span class="mat-name">${mat.count} x ${mat.name}:</span>
                        <span class="mat-cost">$${fmt(mat.count * mat.price)}</span>
                    </div>`;
            });
        }

        const html = `
            <tr>
                <td>${itemDisplayHtml}</td>
                <td><div class="price-block"><span class="price">${fmt(row.startPrice)}</span></div></td>
                <td><div class="price-block"><span class="price warning">${fmt(row.sellPrice)}</span></div></td>
                <td><span class="strategy-badge">${row.strategy}</span></td>
                <td><div class="materials-list">${materialHtml}</div></td>
                <td class="cost-cell">${fmt(row.upgradeCost)}</td>
                <td class="profit-cell">${fmt(row.profitPrem)}</td>
                <td style="text-align:center;">
                    <button class="hide-btn" onclick="hideItem(${index})" title="Hide Item">
                        <i class="fas fa-eye-slash"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });

    pageInfo.innerText = `Showing ${start + 1}-${Math.min(end, filteredResults.length)} of ${filteredResults.length}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = end >= filteredResults.length;
}

function changePage(direction) {
    currentPage += direction;
    renderPage();
}

// Add this new function to public/app.js

async function verifyCurrentItems() {
    // 1. Get items to verify (use filteredResults to only check what user sees)
    if (filteredResults.length === 0) {
        alert("No items to verify.");
        return;
    }

    const city = document.getElementById('citySelect').value;
    const btn = document.querySelector('.refresh-btn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

    // 2. Prepare payload
    // We need to send enough data for the server to reconstruct the trade
    const itemsPayload = filteredResults.map(row => ({
        startId: row.itemStart,
        endId: row.itemEnd,
        tier: row.tier,
        quality: row.quality,
        matCount: row.matCount || getMaterialCount_Helper(row.itemStart), // Need to ensure we have this
        // Pass other UI fields so we don't lose them
        itemBase: row.itemBase,
        qualityName: row.qualityName,
        strategy: row.strategy,
        upgradeDetails: row.upgradeDetails
    }));

    try {
        const response = await fetch('/api/verify-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city, items: itemsPayload })
        });

        const verifiedData = await response.json();

        // 3. Update State
        // If an item is NOT in verifiedData, it means it was removed (not profitable)
        const oldCount = filteredResults.length;
        const newCount = verifiedData.length;
        const removedCount = oldCount - newCount;

        allResults = verifiedData; // Overwrite master list
        
        // Re-run filters to ensure sort/hide logic persists
        applyFiltersAndSort(); 

        alert(`Refresh complete!\n${removedCount} items disappeared (no longer profitable).\n${newCount} items updated.`);

    } catch (error) {
        console.error("Verification failed:", error);
        alert("Failed to refresh prices. Server error.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// --- HELPER: We need to make sure we know matCount on frontend ---
// Add this simple helper to app.js to guess mat count if missing
function getMaterialCount_Helper(id) {
    if (id.includes('2H')) return 384; // 2H Weapon
    if (id.includes('MAIN')) return 384; // 1H (Most)
    if (id.includes('ARMOR')) return 192; // Chest
    if (id.includes('HEAD') || id.includes('SHOES')) return 96; // Head/Shoes
    if (id.includes('OFF')) return 96; // Offhand
    return 192; // Default fallback
}
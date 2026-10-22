// public/app.js

let allResults = [];      
let filteredResults = []; 
let currentPage = 1;
let pageSize = 50;

let itemLookup = {}; 

// --- SORTING STATE ---
let sortColumn = 'profitPrem'; // Default sort column ('profitPrem', 'profitNonPrem', 'roiPrem')
let sortDescending = true;     // Default High-to-Low
let hiddenItems = new Set(); 

const SCAN_CATEGORIES = ['1H_WEAPON', '2H_WEAPON', 'ARMOR', 'OFF_HAND'];

document.addEventListener('DOMContentLoaded', () => {
    loadItemDatabase();
    loadHiddenItems();
});

function getItemType(id) {
    const s = id.toUpperCase();
    if (s.includes('SWORD') || s.includes('CLAYMORE') || s.includes('GALATINE')) return 'Sword';
    if (s.includes('AXE') || s.includes('SCYTHE') || s.includes('HALBERD')) return 'Axe';
    if (s.includes('MACE')) return 'Mace';
    if (s.includes('HAMMER')) return 'Hammer';
    if (s.includes('SPEAR') || s.includes('PIKE') || s.includes('GLAIVE')) return 'Spear';
    if (s.includes('DAGGER') || s.includes('CLAWS')) return 'Dagger';
    if (s.includes('QSTAFF') || s.includes('QUARTERSTAFF') || s.includes('IRONCLAD') || s.includes('STAFF_COMBAT')) return 'Quarterstaff';
    if (s.includes('BOW')) return 'Bow';
    if (s.includes('CROSSBOW')) return 'Crossbow';
    if (s.includes('CURSED')) return 'Cursed Staff';
    if (s.includes('FIRE')) return 'Fire Staff';
    if (s.includes('FROST') || s.includes('ICICLE')) return 'Frost Staff';
    if (s.includes('ARCANE')) return 'Arcane Staff';
    if (s.includes('HOLY')) return 'Holy Staff';
    if (s.includes('NATURE') || s.includes('WILDSTAFF')) return 'Nature Staff';
    if (s.includes('ARMOR_PLATE') || s.includes('HELM_PLATE') || s.includes('SHOES_PLATE')) return 'Plate Armor';
    if (s.includes('ARMOR_LEATHER') || s.includes('HELM_LEATHER') || s.includes('SHOES_LEATHER')) return 'Leather Armor';
    if (s.includes('ARMOR_CLOTH') || s.includes('HELM_CLOTH') || s.includes('SHOES_CLOTH')) return 'Cloth Armor';
    if (s.includes('OFF_')) return 'Off-Hand';
    return 'Other';
}

function loadHiddenItems() {
    const saved = localStorage.getItem('albionHiddenItems');
    if (saved) {
        try {
            hiddenItems = new Set(JSON.parse(saved));
        } catch (e) {
            hiddenItems = new Set();
        }
    }
}

function saveHiddenItems() {
    localStorage.setItem('albionHiddenItems', JSON.stringify([...hiddenItems]));
}

async function loadItemDatabase() {
    const statusText = document.getElementById('statusText');
    if (statusText) statusText.innerText = "Loading Item Database...";
    try {
        const res = await fetch('https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json');
        const items = await res.json();
        items.forEach(item => {
            if (item.LocalizedNames && item.LocalizedNames['EN-US']) {
                itemLookup[item.UniqueName] = item.LocalizedNames['EN-US'];
            }
        });
        if (statusText) statusText.innerText = "Database Loaded";
    } catch (error) {
        console.error("Failed to load item names:", error);
        if (statusText) statusText.innerText = "Database Error (Using Fallback Names)";
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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

async function startBatchScan() {
    const city = document.getElementById('citySelect').value;
    const tbody = document.getElementById('resultsBody');
    const btn = document.querySelector('.scan-btn');
    const progressWrapper = document.getElementById('progressWrapper');
    const progressBar = document.getElementById('progressBar');
    const progressLabel = document.getElementById('progressLabel');
    const progressCount = document.getElementById('progressCount');

    allResults = []; 
    filteredResults = [];
    currentPage = 1;
    btn.disabled = true;
    
    progressWrapper.classList.remove('hidden');
    progressBar.style.width = '0%';

    try {
        for (let i = 0; i < SCAN_CATEGORIES.length; i++) {
            const cat = SCAN_CATEGORIES[i];
            const pct = Math.round(((i) / SCAN_CATEGORIES.length) * 100);
            progressBar.style.width = `${pct}%`;
            progressLabel.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Scanning category ${i + 1}/${SCAN_CATEGORIES.length}: <strong>${cat}</strong>`;
            progressCount.innerText = `${allResults.length} deals found so far`;

            const response = await fetch(`/api/scan-category?city=${city}&category=${cat}`);
            const data = await response.json();
            
            if (Array.isArray(data)) {
                allResults = allResults.concat(data);
            }
        }

        progressBar.style.width = '100%';
        progressLabel.innerHTML = `<i class="fas fa-check-circle"></i> Scan complete!`;
        progressCount.innerText = `Found ${allResults.length} total deals`;

        setTimeout(() => {
            progressWrapper.classList.add('hidden');
        }, 3000);

        applyFiltersAndSort(); 
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="11" class="empty-state" style="color:var(--accent-red);">Error scanning market: ${escapeHtml(error.message)}</td></tr>`;
        progressWrapper.classList.add('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search"></i> Scan All Markets';
    }
}

async function verifyCurrentItems() {
    if (filteredResults.length === 0) {
        alert("No items to verify.");
        return;
    }

    const city = document.getElementById('citySelect').value;
    const btn = document.querySelector('.refresh-btn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

    const itemsPayload = filteredResults.map(row => ({
        startId: row.itemStart,
        endId: row.itemEnd,
        tier: row.tier,
        quality: row.quality,
        matCount: row.matCount || getMaterialCount_Helper(row.itemStart),
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
        const removedCount = filteredResults.length - verifiedData.length;

        allResults = verifiedData; 
        applyFiltersAndSort(); 

        alert(`Refresh complete!\n${removedCount} items removed (no longer profitable).`);

    } catch (error) {
        console.error("Verification failed:", error);
        alert("Failed to refresh prices. Server error.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function getMaterialCount_Helper(id) {
    if (id.includes('2H')) return 384;
    if (id.includes('MAIN')) return 384; 
    if (id.includes('ARMOR')) return 192; 
    if (id.includes('HEAD') || id.includes('SHOES')) return 96; 
    if (id.includes('OFF')) return 96; 
    return 192; 
}

function getRowKey(row) {
    return `${row.itemStart}_${row.itemEnd}_${row.quality}`;
}

function hideItem(indexInPage) {
    const realIndex = (currentPage - 1) * pageSize + indexInPage;
    const row = filteredResults[realIndex];
    if (row) {
        hiddenItems.add(getRowKey(row));
        saveHiddenItems();
        applyFiltersAndSort();
    }
}

function resetHidden() {
    if (hiddenItems.size === 0) {
        alert("No items are currently hidden.");
        return;
    }
    if (confirm(`Show all ${hiddenItems.size} hidden items?`)) {
        hiddenItems.clear();
        saveHiddenItems();
        applyFiltersAndSort();
    }
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    applyFiltersAndSort();
}

function changePageSize() {
    pageSize = parseInt(document.getElementById('pageSizeSelect').value, 10) || 50;
    currentPage = 1;
    renderPage();
}

// --- SORT LOGIC ---
function handleSort(column) {
    if (sortColumn === column) {
        sortDescending = !sortDescending;
    } else {
        sortColumn = column;
        sortDescending = true;
    }
    updateSortIcons();
    applyFiltersAndSort();
}

function updateSortIcons() {
    const columns = ['profitPrem', 'profitNonPrem', 'roiPrem'];
    columns.forEach(col => {
        const icon = document.getElementById(`icon-${col}`);
        if (!icon) return;
        if (sortColumn === col) {
            icon.className = sortDescending ? 'fas fa-sort-down' : 'fas fa-sort-up';
            icon.style.color = 'var(--accent-cyan)';
        } else {
            icon.className = 'fas fa-sort';
            icon.style.color = 'var(--text-muted)';
        }
    });
}

function applyFiltersAndSort() {
    const filterType = document.getElementById('typeFilter').value;
    const filterTier = document.getElementById('tierFilter').value;
    const filterMinProfit = parseInt(document.getElementById('minProfitFilter').value, 10) || 0;
    const searchQuery = document.getElementById('searchInput').value.trim().toLowerCase();

    // Calculate ROI for all results
    allResults.forEach(row => {
        const totalInputCost = (row.startPrice || 0) + (row.upgradeCost || 0);
        row.totalCost = totalInputCost;
        row.roiPrem = totalInputCost > 0 ? (row.profitPrem / totalInputCost) * 100 : 0;
        row.roiNonPrem = totalInputCost > 0 ? (row.profitNonPrem / totalInputCost) * 100 : 0;
    });

    filteredResults = allResults.filter(row => {
        if (hiddenItems.has(getRowKey(row))) return false;

        // Tier Filter
        if (filterTier !== 'ALL' && parseInt(row.tier, 10) !== parseInt(filterTier, 10)) {
            return false;
        }

        // Category / Type Filter
        if (filterType !== 'ALL') {
            const type = getItemType(row.itemStart);
            if (type !== filterType) return false;
        }

        // Min Profit Filter
        if (row.profitPrem < filterMinProfit) {
            return false;
        }

        // Search Query Filter
        if (searchQuery.length > 0) {
            const nameStart = getRealName(row.itemStart).toLowerCase();
            const nameEnd = getRealName(row.itemEnd).toLowerCase();
            const strat = row.strategy.toLowerCase();
            if (!nameStart.includes(searchQuery) && !nameEnd.includes(searchQuery) && !strat.includes(searchQuery)) {
                return false;
            }
        }

        return true;
    });

    // Sort using active column
    filteredResults.sort((a, b) => {
        const valA = a[sortColumn] !== undefined ? a[sortColumn] : 0;
        const valB = b[sortColumn] !== undefined ? b[sortColumn] : 0;
        return sortDescending ? valB - valA : valA - valB;
    });

    const maxPage = Math.ceil(filteredResults.length / pageSize) || 1;
    if (currentPage > maxPage) currentPage = maxPage;
    
    updateSummaryPills();
    renderPage();
}

function updateSummaryPills() {
    const pillsContainer = document.getElementById('summaryPills');
    if (!pillsContainer) return;

    const filterType = document.getElementById('typeFilter').value;
    const filterTier = document.getElementById('tierFilter').value;
    const filterMinProfit = parseInt(document.getElementById('minProfitFilter').value, 10) || 0;
    const searchQuery = document.getElementById('searchInput').value.trim();

    let pills = [];
    if (searchQuery) pills.push(`Search: "${escapeHtml(searchQuery)}"`);
    if (filterType !== 'ALL') pills.push(`Category: ${escapeHtml(filterType)}`);
    if (filterTier !== 'ALL') pills.push(`Tier ${escapeHtml(filterTier)}`);
    if (filterMinProfit > 0) pills.push(`Min Profit: $${filterMinProfit.toLocaleString()}`);
    if (hiddenItems.size > 0) pills.push(`Hidden: ${hiddenItems.size}`);

    pillsContainer.innerHTML = pills.map(p => `<span class="pill">${p}</span>`).join('');
}

function renderPage() {
    const tbody = document.getElementById('resultsBody');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const summaryRange = document.getElementById('summaryRange');
    const summaryTotal = document.getElementById('summaryTotal');

    if (!filteredResults || filteredResults.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    <i class="fas fa-search-minus empty-icon"></i>
                    <p>No deals match your active filters.</p>
                </td>
            </tr>`;
        pageInfo.innerText = 'Page 0 of 0';
        summaryRange.innerText = '0-0';
        summaryTotal.innerText = '0';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filteredResults.slice(start, end);
    const totalPages = Math.ceil(filteredResults.length / pageSize);

    const rowsHtml = pageData.map((row, index) => {
        const fmt = (num) => num !== undefined && num !== null ? Math.round(num).toLocaleString() : '0';
        const nameStart = escapeHtml(getRealName(row.itemStart));
        const nameEnd = escapeHtml(getRealName(row.itemEnd));
        const tagStart = `T${row.tier}${getEnchantTag(row.itemStart)}`;
        const tagEnd = `T${row.tier}${getEnchantTag(row.itemEnd)}`;

        let itemDisplayHtml = '';
        if (row.itemStart === row.itemEnd) {
            itemDisplayHtml = `
                <div class="item-stack">
                    <div class="item-row target">
                        <span class="tier-badge highlight">${tagStart}</span>
                        <span class="item-name highlight">${nameStart}</span>
                    </div>
                    <div><span class="quality-badge q-${row.quality}">${escapeHtml(row.qualityName)}</span></div>
                </div>`;
        } else {
            itemDisplayHtml = `
                <div class="item-stack">
                    <div class="item-row">
                        <span class="tier-badge">${tagStart}</span>
                        <span class="item-name">${nameStart}</span>
                    </div>
                    <div><span class="quality-badge q-${row.quality}">${escapeHtml(row.qualityName)}</span></div>
                    <i class="fas fa-arrow-down arrow-icon"></i>
                    <div class="item-row target">
                        <span class="tier-badge highlight">${tagEnd}</span>
                        <span class="item-name highlight">${nameEnd}</span>
                    </div>
                </div>`;
        }

        let materialHtml = '';
        if (!row.upgradeDetails || row.upgradeDetails.length === 0) {
             materialHtml = '<span style="color:var(--text-muted); font-size:0.8rem;">None</span>';
        } else {
            row.upgradeDetails.forEach(mat => {
                materialHtml += `
                    <div class="mat-item">
                        <span>${mat.count}x ${escapeHtml(mat.name)}</span>
                        <span class="mat-cost">$${fmt(mat.count * mat.price)}</span>
                    </div>`;
            });
        }

        const roiVal = row.roiPrem || 0;
        let roiClass = 'roi-low';
        if (roiVal >= 30) roiClass = 'roi-high';
        else if (roiVal >= 15) roiClass = 'roi-med';

        return `
            <tr>
                <td>${itemDisplayHtml}</td>
                <td><span class="price-val">${fmt(row.startPrice)}</span></td>
                <td><span class="cost-val">${fmt(row.upgradeCost)}</span></td>
                <td><span class="price-val" style="font-weight:600;">${fmt(row.totalCost)}</span></td>
                <td><span class="price-val sell">${fmt(row.sellPrice)}</span></td>
                <td><span class="strategy-tag">${escapeHtml(row.strategy)}</span></td>
                <td><div class="materials-list">${materialHtml}</div></td>
                <td><span class="roi-badge ${roiClass}">${roiVal.toFixed(1)}%</span></td>
                <td><span class="profit-val">$${fmt(row.profitPrem)}</span></td>
                <td><span class="profit-val muted">$${fmt(row.profitNonPrem)}</span></td>
                <td style="text-align:center;">
                    <button class="hide-btn" onclick="hideItem(${index})" title="Hide item">
                        <i class="fas fa-eye-slash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml.join('');

    summaryRange.innerText = `${start + 1}-${Math.min(end, filteredResults.length)}`;
    summaryTotal.innerText = filteredResults.length.toLocaleString();
    pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = end >= filteredResults.length;
}

function changePage(direction) {
    currentPage += direction;
    renderPage();
}

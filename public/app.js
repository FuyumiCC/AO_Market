// public/app.js
let allResults = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 25;
let itemLookup = {}; 

document.addEventListener('DOMContentLoaded', () => {
    loadItemDatabase();
});

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
        if(statusText) statusText.innerText = "Database Loaded. Select a category to scan.";
    } catch (error) {
        console.error("Failed to load item names:", error);
        if(statusText) statusText.innerText = "Error loading item names. IDs will be used instead.";
    }
}

function getRealName(id) {
    if (itemLookup[id]) return itemLookup[id];
    const baseId = id.split('@')[0];
    if (itemLookup[baseId]) return itemLookup[baseId];
    return id.replace(/_/g, ' ').replace(/T\d+/, '').trim(); 
}

// Helper to extract ".1", ".2" from ID
// public/app.js - Update this helper function only
function getEnchantTag(id) {
    if (id.includes('@1')) return '.1';
    if (id.includes('@2')) return '.2';
    if (id.includes('@3')) return '.3';
    return '.0'; // Default
}

async function startScan() {
    const city = document.getElementById('citySelect').value;
    const category = document.getElementById('categorySelect').value;
    const tbody = document.getElementById('resultsBody');
    const btn = document.querySelector('.scan-btn');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
    tbody.innerHTML = '<tr><td colspan="8" class="loading-text" style="text-align:center; padding:20px;">Scanning T4-T8 items... This may take a few seconds.</td></tr>';

    try {
        const response = await fetch(`/api/scan-category?city=${city}&category=${category}`);
        const data = await response.json();

        allResults = data;
        currentPage = 1;
        renderPage();

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="error-text" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search"></i> Analyze Market';
    }
}

function renderPage() {
    const tbody = document.getElementById('resultsBody');
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!allResults || allResults.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state" style="text-align:center; padding:20px;">No profitable items found.</td></tr>';
        pageInfo.innerText = '0 items';
        return;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = allResults.slice(start, end);

    tbody.innerHTML = '';

    pageData.forEach(row => {
        const fmt = (num) => num ? num.toLocaleString() : '0';
        const nameStart = getRealName(row.itemStart);
        const nameEnd = getRealName(row.itemEnd);
        const tagStart = `[${row.tier}${getEnchantTag(row.itemStart)}]`;
        const tagEnd = `[${row.tier}${getEnchantTag(row.itemEnd)}]`;

        // Quality Color
        let qClass = 'q-normal';
        if(row.quality === 2) qClass = 'q-good';
        if(row.quality === 3) qClass = 'q-outstanding';
        if(row.quality === 4) qClass = 'q-excellent';
        if(row.quality === 5) qClass = 'q-masterpiece';

        // Item Display Logic
        let itemDisplayHtml = '';
        
        if (row.itemStart === row.itemEnd) {
            // DIRECT FLIP (Single Line)
            itemDisplayHtml = `
                <div class="item-stack">
                    <div class="item-row target">
                        <span class="tier-tag highlight">${tagStart}</span>
                        <span class="item-name highlight">${nameStart}</span>
                    </div>
                    <div class="quality-row">
                        <span class="quality-badge ${qClass}">${row.qualityName}</span>
                    </div>
                </div>
            `;
        } else {
            // UPGRADE (Stack)
            itemDisplayHtml = `
                <div class="item-stack">
                    <div class="item-row">
                        <span class="tier-tag">${tagStart}</span>
                        <span class="item-name">${nameStart}</span>
                    </div>
                    <div class="quality-row">
                        <span class="quality-badge ${qClass}">${row.qualityName}</span>
                    </div>
                    <i class="fas fa-arrow-down arrow-icon"></i>
                    <div class="item-row target">
                        <span class="tier-tag highlight">${tagEnd}</span>
                        <span class="item-name highlight">${nameEnd}</span>
                    </div>
                </div>
            `;
        }

        // Material List
        let materialHtml = '';
        if (row.upgradeDetails.length === 0) {
             materialHtml = '<span style="color:#666; font-size:0.8rem;">None</span>';
        } else {
            row.upgradeDetails.forEach(mat => {
                const totalMatCost = mat.count * mat.price;
                materialHtml += `
                    <div class="mat-row-detail">
                        <span class="mat-name">${mat.count} x ${mat.name}:</span>
                        <span class="mat-cost">$${fmt(totalMatCost)}</span>
                    </div>
                `;
            });
        }

        const html = `
            <tr>
                <td>${itemDisplayHtml}</td>
                <td>
                    <div class="price-block">
                        <span class="location">Start</span>
                        <span class="price">${fmt(row.startPrice)}</span>
                    </div>
                </td>
                <td>
                    <div class="price-block">
                        <span class="location">BM</span>
                        <span class="price warning">${fmt(row.sellPrice)}</span>
                    </div>
                </td>
                <td>
                    <span class="strategy-badge">${row.strategy}</span>
                </td>
                <td>
                    <div class="materials-list">
                        ${materialHtml}
                    </div>
                </td>
                <td class="cost-cell">${fmt(row.upgradeCost)}</td>
                <td class="profit-cell">${fmt(row.profitPrem)}</td>
                <td class="profit-cell muted">${fmt(row.profitNonPrem)}</td>
            </tr>
        `;
        tbody.innerHTML += html;
    });

    pageInfo.innerText = `Showing ${start + 1}-${Math.min(end, allResults.length)} of ${allResults.length}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = end >= allResults.length;
}
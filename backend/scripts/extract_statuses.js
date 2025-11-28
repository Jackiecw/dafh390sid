const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
    { path: 'd:\\Code\\internal-site\\资料\\XP-9.xlsx', platform: 'SHOPEE' },
    { path: 'd:\\Code\\internal-site\\资料\\XP-10.xlsx', platform: 'SHOPEE' },
    { path: 'd:\\Code\\internal-site\\资料\\XP-11.xlsx', platform: 'SHOPEE' },
    { path: 'd:\\Code\\internal-site\\资料\\TK-ALl.xlsx', platform: 'TIKTOK' },
    { path: 'd:\\Code\\internal-site\\资料\\TK-7.xlsx', platform: 'TIKTOK' }
];

const statuses = {
    SHOPEE: new Set(),
    TIKTOK: new Set()
};

files.forEach(file => {
    try {
        if (!fs.existsSync(file.path)) {
            console.log(`File not found: ${file.path}`);
            return;
        }
        const workbook = XLSX.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: null });

        if (file.platform === 'TIKTOK') {
            console.log(`File: ${path.basename(file.path)}, Rows: ${data.length}`);
        }

        data.forEach((row, index) => {
            if (file.platform === 'SHOPEE') {
                if (row['Status Pesanan']) {
                    statuses.SHOPEE.add(String(row['Status Pesanan']).trim());
                }
            } else if (file.platform === 'TIKTOK') {
                // Debug: print first 3 rows
                if (index < 3) {
                    console.log(`TK Row ${index}: ID=${row['Order ID']}, Status=${row['Order Status']}`);
                }

                // Skip comment row for TikTok
                if (row['Order ID'] && String(row['Order ID']).trim() !== 'Platform unique order ID.') {
                    if (row['Order Status']) {
                        statuses.TIKTOK.add(String(row['Order Status']).trim());
                    }
                }
            }
        });
    } catch (e) {
        console.error(`Error reading ${file.path}:`, e.message);
    }
});

console.log('--- SHOPEE STATUSES ---');
console.log(Array.from(statuses.SHOPEE).sort());
console.log('\n--- TIKTOK STATUSES ---');
console.log(Array.from(statuses.TIKTOK).sort());

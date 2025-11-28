const XLSX = require('xlsx');

class ExcelParser {
    /**
     * Parse Excel file and return standardized order data
     * @param {string} filePath 
     * @param {string} [platform] - Optional, if not provided, will try to detect
     */
    static parse(filePath, platform) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Use raw: false to get formatted strings if needed, but raw: true is better for numbers usually.
        // However, Shopee might be text. Let's use default (raw: true usually).
        const data = XLSX.utils.sheet_to_json(sheet, { defval: null });

        if (!platform) {
            platform = this.detectPlatform(data);
        }

        if (platform === 'SHOPEE') {
            return { platform, data: this.parseShopee(data) };
        } else if (platform === 'TIKTOK_SHOP') {
            return { platform, data: this.parseTikTok(data) };
        } else {
            throw new Error('Unknown platform or unable to detect platform');
        }
    }

    static detectPlatform(data) {
        if (!data || data.length === 0) return null;
        // Check first row keys
        const keys = Object.keys(data[0]);

        // Shopee usually has 'No. Pesanan'
        if (keys.some(k => k.includes('No. Pesanan') || k.includes('Order ID'))) {
            // Both might have Order ID, need to distinguish
            if (keys.includes('Status Pesanan')) return 'SHOPEE';
            if (keys.includes('Order Status')) return 'TIKTOK_SHOP';
        }
        return null;
    }

    static mapStatus(platform, rawStatus) {
        if (!rawStatus) return null;
        const status = rawStatus.trim();

        const STATUS_MAP = {
            SHOPEE: {
                'Belum Bayar': 'PENDING',
                'Perlu Dikirim': 'READY_TO_SHIP',
                'Sedang Dikirim': 'SHIPPED',
                'Telah Dikirim': 'SHIPPED',
                'Selesai': 'COMPLETED',
                'Batal': 'CANCELLED',
                'Pengembalian': 'RETURNED'
            },
            TIKTOK_SHOP: {
                'Unpaid': 'PENDING',
                'Awaiting Shipment': 'READY_TO_SHIP',
                'Awaiting Collection': 'READY_TO_SHIP',
                'Shipped': 'SHIPPED',
                'In Transit': 'SHIPPED',
                'Delivered': 'DELIVERED',
                'Completed': 'COMPLETED',
                'Canceled': 'CANCELLED',
                'Returned': 'RETURNED'
            }
        };

        return STATUS_MAP[platform]?.[status] || status; // Fallback to raw status if not mapped
    }

    static parseShopee(data) {
        return data.map(row => {
            // Shopee: "2.866.250" -> need to remove dots
            const revenue = this.parseAmount(row['Total Harga Produk']);
            const unitPrice = this.parseAmount(row['Harga Setelah Diskon']);

            // Date: "Waktu Pesanan Dibuat" -> "2023-10-27 10:00"
            let orderDate = new Date();
            if (row['Waktu Pesanan Dibuat']) {
                orderDate = new Date(row['Waktu Pesanan Dibuat']);
            }

            return {
                platformOrderId: String(row['No. Pesanan']).trim(),
                orderStatus: this.mapStatus('SHOPEE', row['Status Pesanan']),
                title: row['Nama Produk'] ? String(row['Nama Produk']).trim() : null,
                sku: row['Nomor Referensi SKU'] ? String(row['Nomor Referensi SKU']).trim() : (row['SKU Induk'] ? String(row['SKU Induk']).trim() : null),
                quantity: parseInt(row['Jumlah'] || '1', 10),
                unitPrice: unitPrice,
                revenue: revenue,
                orderDate: orderDate,
                platform: 'SHOPEE',
                rawData: row
            };
        });
    }

    static parseTikTok(data) {
        return data
            .filter(row => {
                const orderId = row['Order ID'];
                // Filter out empty rows or comment rows (TikTok export has a comment row below header)
                return orderId && String(orderId).trim() !== 'Platform unique order ID.';
            })
            .map(row => {
                // TikTok: usually raw numbers
                const revenue = this.parseAmount(row['SKU Subtotal After Discount']);
                const unitPrice = this.parseAmount(row['SKU Unit Original Price']);

                // Date: "Order Created Time"
                let orderDate = new Date();
                if (row['Order Created Time']) {
                    orderDate = new Date(row['Order Created Time']);
                }

                return {
                    platformOrderId: String(row['Order ID']).trim(), // Ensure string
                    orderStatus: this.mapStatus('TIKTOK_SHOP', row['Order Status']),
                    title: row['Product Name'] ? String(row['Product Name']).trim() : null,
                    sku: row['Seller SKU'] ? String(row['Seller SKU']).trim() : null,
                    quantity: parseInt(row['Quantity'] || '1', 10),
                    unitPrice: unitPrice,
                    revenue: revenue,
                    orderDate: orderDate,
                    platform: 'TIKTOK_SHOP',
                    rawData: row
                };
            });
    }

    static parseAmount(value) {
        if (typeof value === 'number') return value;
        if (!value) return 0;

        let str = value.toString();
        // Remove 'Rp', spaces
        str = str.replace(/[Rp\s]/g, '');

        // Indonesian format: 1.000.000,00
        // Remove dots (thousand separator)
        // Replace comma with dot (decimal)
        if (str.includes('.') && str.includes(',')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else if (str.includes(',')) {
            // 1000,00 -> 1000.00
            str = str.replace(',', '.');
        } else if (str.includes('.')) {
            // If only dots: "1.000" -> 1000
            // But "1.5" -> 1.5?
            // Context matters. For price "2.866.250", it's 2 million.
            // If it has 3 decimal places or more, likely thousand separator.
            // Or if it matches \d{1,3}(\.\d{3})*
            if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
                str = str.replace(/\./g, '');
            }
        }

        return parseFloat(str) || 0;
    }
}

module.exports = ExcelParser;

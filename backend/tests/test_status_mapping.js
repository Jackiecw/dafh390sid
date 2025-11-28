const ExcelParser = require('../services/ExcelParser');

// Mock data for Shopee
const shopeeData = [
    { 'No. Pesanan': 'S1', 'Status Pesanan': 'Perlu Dikirim', 'Total Harga Produk': 1000 },
    { 'No. Pesanan': 'S2', 'Status Pesanan': 'Selesai', 'Total Harga Produk': 2000 },
    { 'No. Pesanan': 'S3', 'Status Pesanan': 'Batal', 'Total Harga Produk': 0 },
    { 'No. Pesanan': 'S4', 'Status Pesanan': 'Unknown Status', 'Total Harga Produk': 0 }
];

// Mock data for TikTok
const tiktokData = [
    { 'Order ID': 'T1', 'Order Status': 'Awaiting Shipment', 'SKU Subtotal After Discount': 100 },
    { 'Order ID': 'T2', 'Order Status': 'Completed', 'SKU Subtotal After Discount': 200 },
    { 'Order ID': 'T3', 'Order Status': 'Canceled', 'SKU Subtotal After Discount': 0 },
    { 'Order ID': 'Platform unique order ID.', 'Order Status': 'Comment Row', 'SKU Subtotal After Discount': 0 } // Should be filtered
];

console.log('--- Testing Shopee Parsing ---');
const parsedShopee = ExcelParser.parseShopee(shopeeData);
parsedShopee.forEach(item => {
    console.log(`ID: ${item.platformOrderId}, Raw: ${item.rawData['Status Pesanan']}, Mapped: ${item.orderStatus}`);
});

console.log('\n--- Testing TikTok Parsing ---');
const parsedTikTok = ExcelParser.parseTikTok(tiktokData);
parsedTikTok.forEach(item => {
    console.log(`ID: ${item.platformOrderId}, Raw: ${item.rawData['Order Status']}, Mapped: ${item.orderStatus}`);
});

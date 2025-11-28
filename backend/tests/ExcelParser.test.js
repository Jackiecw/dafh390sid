import { describe, it, expect } from 'vitest';
const path = require('path');
const ExcelParser = require('../services/ExcelParser');

describe('ExcelParser', () => {
    // Adjust path to where the sample files are located
    // User said: internal-site/资料
    // backend is in internal-site/backend
    // so ../../资料
    const shopeeFile = path.resolve(__dirname, '../../资料/xp-1.xlsx');
    const tiktokFile = path.resolve(__dirname, '../../资料/TK-7.xlsx');

    it('should detect SHOPEE platform and parse data', () => {
        const result = ExcelParser.parse(shopeeFile);
        expect(result.platform).toBe('SHOPEE');
        expect(result.data.length).toBeGreaterThan(0);

        const firstRow = result.data[0];
        expect(firstRow.platformOrderId).toBeDefined();
        expect(firstRow.revenue).toBeTypeOf('number');
        expect(firstRow.orderDate).toBeInstanceOf(Date);

        // Check specific value from summary if known, e.g. revenue 2866250
        // Based on previous summary reading
        // row 0 revenue was 2.866.250
        // expect(firstRow.revenue).toBe(2866250);
    });

    it('should detect TIKTOK_SHOP platform and parse data', () => {
        const result = ExcelParser.parse(tiktokFile);
        expect(result.platform).toBe('TIKTOK_SHOP');
        expect(result.data.length).toBeGreaterThan(0);

        const firstRow = result.data[0];
        expect(firstRow.platformOrderId).toBeDefined();
        expect(firstRow.revenue).toBeTypeOf('number');
        expect(firstRow.orderDate).toBeInstanceOf(Date);
    });

    it('should parse Shopee amount correctly', () => {
        expect(ExcelParser.parseAmount("2.866.250")).toBe(2866250);
        expect(ExcelParser.parseAmount("Rp 10.000")).toBe(10000);
        expect(ExcelParser.parseAmount("1.000,00")).toBe(1000);
        expect(ExcelParser.parseAmount(100)).toBe(100);
    });
});

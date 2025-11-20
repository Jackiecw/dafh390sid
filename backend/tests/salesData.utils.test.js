import { describe, it, expect, vi } from 'vitest';

vi.mock('../prismaClient', () => ({}));

const salesDataRouter = require('../routes/salesData');
const {
  buildRecordDateFilter,
  buildSalesDataWhere,
  buildSalesDataOrder,
  normalizePagination,
  appendManagePermission,
} = salesDataRouter.__testables;

describe('sales-data helper utilities', () => {
  describe('buildRecordDateFilter', () => {
    it('returns null when no dates provided', () => {
      expect(buildRecordDateFilter()).toBeNull();
    });

    it('builds range when both dates are valid', () => {
      const result = buildRecordDateFilter('2025-01-01', '2025-01-05');
      expect(result).toEqual(
        expect.objectContaining({
          gte: new Date('2025-01-01'),
        }),
      );
    });
  });

  describe('normalizePagination', () => {
    it('clamps page and pageSize', () => {
      const { page, pageSize, skip } = normalizePagination({ page: '-1', pageSize: '9999' });
      expect(page).toBe(1);
      expect(pageSize).toBeLessThanOrEqual(200);
      expect(skip).toBe(0);
    });
  });

  describe('buildSalesDataOrder', () => {
    it('preserves sort order even when field invalid', () => {
      const order = buildSalesDataOrder({ sortBy: 'unknown', sortOrder: 'asc' });
      expect(order).toEqual({ recordDate: 'asc' });
    });
  });

  describe('buildSalesDataWhere', () => {
    const baseUser = {
      role: 'operation',
      operatedCountries: ['ID'],
    };

    it('returns error when non-admin queries unauthorized country', () => {
      const { error } = buildSalesDataWhere({ countryCode: 'TH' }, baseUser);
      expect(error).toEqual(
        expect.objectContaining({
          status: 403,
        }),
      );
    });

    it('allows admin to query any country', () => {
      const { where } = buildSalesDataWhere({ countryCode: 'TH' }, { role: 'admin' });
      expect(where.store).toEqual(expect.objectContaining({ countryCode: 'TH' }));
    });
  });

  describe('appendManagePermission', () => {
    it('sets canManage based on supervised countries or admin', () => {
      const rows = [
        { store: { countryCode: 'ID' } },
        { store: { countryCode: 'TH' } },
      ];
      const result = appendManagePermission(rows, ['ID'], false);
      expect(result[0].canManage).toBe(true);
      expect(result[1].canManage).toBe(false);
    });
  });
});

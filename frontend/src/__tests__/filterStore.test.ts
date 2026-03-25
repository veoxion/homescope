import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '@/stores/filterStore';

describe('filterStore', () => {
  beforeEach(() => {
    useFilterStore.getState().resetFilters();
  });

  describe('setTradeType', () => {
    it('거래유형을 설정한다', () => {
      useFilterStore.getState().setTradeType('매매');
      expect(useFilterStore.getState().tradeType).toBe('매매');
    });

    it('거래유형 전환 시 priceRange가 초기화된다', () => {
      useFilterStore.getState().setPriceRange({ min: 5000, max: 50000 });
      useFilterStore.getState().setTradeType('전세');
      expect(useFilterStore.getState().priceRange).toEqual({ min: null, max: null });
    });

    it('거래유형 전환 시 depositRange가 초기화된다', () => {
      useFilterStore.getState().setDepositRange({ min: 1000, max: 10000 });
      useFilterStore.getState().setTradeType('매매');
      expect(useFilterStore.getState().depositRange).toEqual({ min: null, max: null });
    });

    it('거래유형 전환 시 monthlyRentRange가 초기화된다', () => {
      useFilterStore.getState().setMonthlyRentRange({ min: 30, max: 100 });
      useFilterStore.getState().setTradeType('전세');
      expect(useFilterStore.getState().monthlyRentRange).toEqual({ min: null, max: null });
    });
  });

  describe('toggleResidenceType', () => {
    it('주거형태를 토글한다', () => {
      useFilterStore.getState().toggleResidenceType('아파트');
      expect(useFilterStore.getState().residenceTypes).toContain('아파트');

      useFilterStore.getState().toggleResidenceType('아파트');
      expect(useFilterStore.getState().residenceTypes).not.toContain('아파트');
    });

    it('여러 주거형태를 동시에 선택할 수 있다', () => {
      useFilterStore.getState().toggleResidenceType('아파트');
      useFilterStore.getState().toggleResidenceType('오피스텔');
      expect(useFilterStore.getState().residenceTypes).toEqual(['아파트', '오피스텔']);
    });
  });

  describe('setPriceRange', () => {
    it('가격 범위를 설정한다', () => {
      useFilterStore.getState().setPriceRange({ min: 10000, max: 50000 });
      expect(useFilterStore.getState().priceRange).toEqual({ min: 10000, max: 50000 });
    });

    it('min만 설정할 수 있다', () => {
      useFilterStore.getState().setPriceRange({ min: 10000, max: null });
      expect(useFilterStore.getState().priceRange).toEqual({ min: 10000, max: null });
    });
  });

  describe('resetFilters', () => {
    it('모든 필터를 초기 상태로 리셋한다', () => {
      useFilterStore.getState().setTradeType('매매');
      useFilterStore.getState().toggleResidenceType('아파트');
      useFilterStore.getState().setPriceRange({ min: 5000, max: 50000 });
      useFilterStore.getState().setDepositRange({ min: 1000, max: 10000 });
      useFilterStore.getState().setAreaRange({ min: 30, max: 100 });

      useFilterStore.getState().resetFilters();

      const state = useFilterStore.getState();
      expect(state.tradeType).toBeNull();
      expect(state.residenceTypes).toEqual([]);
      expect(state.priceRange).toEqual({ min: null, max: null });
      expect(state.depositRange).toEqual({ min: null, max: null });
      expect(state.monthlyRentRange).toEqual({ min: null, max: null });
      expect(state.areaRange).toEqual({ min: null, max: null });
    });
  });
});

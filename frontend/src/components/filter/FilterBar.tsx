'use client';
import { useState } from 'react';
import { useFilterStore, TradeType, ResidenceType } from '@/stores/filterStore';

const TRADE_TYPES: TradeType[] = ['매매', '전세', '월세'];
const RESIDENCE_TYPES: ResidenceType[] = ['아파트', '오피스텔', '빌라', '원룸'];

// 가격 범위 프리셋 (만원 단위)
const SALE_PRICE_MAX = 200000; // 20억
const JEONSE_PRICE_MAX = 100000; // 10억
const DEPOSIT_MAX = 50000; // 5억
const MONTHLY_RENT_MAX = 500; // 500만원
const AREA_MAX = 200; // 200㎡

function formatManwon(value: number): string {
  if (value >= 10000) {
    const eok = Math.floor(value / 10000);
    const remain = value % 10000;
    return remain > 0 ? `${eok}억 ${remain / 1000 > 0 ? (remain / 1000).toFixed(0) + '천' : ''}` : `${eok}억`;
  }
  if (value >= 1000) return `${(value / 1000).toFixed(0)}천만`;
  return `${value}만`;
}

export default function FilterBar() {
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  const tradeType = useFilterStore((s) => s.tradeType);
  const residenceTypes = useFilterStore((s) => s.residenceTypes);
  const priceRange = useFilterStore((s) => s.priceRange);
  const depositRange = useFilterStore((s) => s.depositRange);
  const monthlyRentRange = useFilterStore((s) => s.monthlyRentRange);
  const setTradeType = useFilterStore((s) => s.setTradeType);
  const toggleResidenceType = useFilterStore((s) => s.toggleResidenceType);
  const setPriceRange = useFilterStore((s) => s.setPriceRange);
  const setDepositRange = useFilterStore((s) => s.setDepositRange);
  const setMonthlyRentRange = useFilterStore((s) => s.setMonthlyRentRange);
  const areaRange = useFilterStore((s) => s.areaRange);
  const setAreaRange = useFilterStore((s) => s.setAreaRange);
  const resetFilters = useFilterStore((s) => s.resetFilters);

  const [showAreaFilter, setShowAreaFilter] = useState(false);

  const hasPriceFilter =
    priceRange.min != null || priceRange.max != null ||
    depositRange.min != null || depositRange.max != null ||
    monthlyRentRange.min != null || monthlyRentRange.max != null;

  const hasAreaFilter = areaRange.min != null || areaRange.max != null;

  return (
    <div className="bg-white shadow-sm">
      {/* Main filter row */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide max-md:px-3 max-md:py-1.5">
        {/* 거래유형 */}
        <div className="flex gap-1 shrink-0">
          {TRADE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTradeType(tradeType === t ? null : t)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                tradeType === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200 shrink-0" />

        {/* 주거형태 */}
        <div className="flex gap-1 shrink-0">
          {RESIDENCE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleResidenceType(t)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                residenceTypes.includes(t)
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200 shrink-0" />

        {/* 가격 필터 토글 */}
        <button
          onClick={() => setShowPriceFilter(!showPriceFilter)}
          className={`px-3 py-1 rounded-full text-sm border transition-colors shrink-0 ${
            hasPriceFilter
              ? 'bg-orange-500 text-white border-orange-500'
              : showPriceFilter
              ? 'bg-gray-100 text-gray-700 border-gray-400'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}
        >
          가격{hasPriceFilter ? ' ✓' : ''}
        </button>

        {/* 면적 필터 토글 */}
        <button
          onClick={() => setShowAreaFilter(!showAreaFilter)}
          className={`px-3 py-1 rounded-full text-sm border transition-colors shrink-0 ${
            hasAreaFilter
              ? 'bg-purple-500 text-white border-purple-500'
              : showAreaFilter
              ? 'bg-gray-100 text-gray-700 border-gray-400'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}
        >
          면적{hasAreaFilter ? ' ✓' : ''}
        </button>

        <div className="ml-auto shrink-0">
          <button
            onClick={() => { resetFilters(); setShowPriceFilter(false); setShowAreaFilter(false); }}
            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
          >
            초기화
          </button>
        </div>
      </div>

      {/* Price filter panel */}
      {showPriceFilter && (
        <div className="px-4 pb-3 border-t bg-gray-50">
          <div className="pt-3 space-y-3">
            {(!tradeType || tradeType === '매매') && (
              <PriceRangeFilter
                label="매매가"
                max={SALE_PRICE_MAX}
                value={priceRange}
                onChange={setPriceRange}
              />
            )}
            {(!tradeType || tradeType === '전세') && (
              <PriceRangeFilter
                label="전세가"
                max={JEONSE_PRICE_MAX}
                value={priceRange}
                onChange={setPriceRange}
              />
            )}
            {(!tradeType || tradeType === '월세') && (
              <>
                <PriceRangeFilter
                  label="보증금"
                  max={DEPOSIT_MAX}
                  value={depositRange}
                  onChange={setDepositRange}
                />
                <PriceRangeFilter
                  label="월세"
                  max={MONTHLY_RENT_MAX}
                  value={monthlyRentRange}
                  onChange={setMonthlyRentRange}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Area filter panel */}
      {showAreaFilter && (
        <div className="px-4 pb-3 border-t bg-gray-50">
          <div className="pt-3">
            <AreaRangeFilter
              max={AREA_MAX}
              value={areaRange}
              onChange={setAreaRange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PriceRangeFilter({
  label,
  max,
  value,
  onChange,
}: {
  label: string;
  max: number;
  value: { min: number | null; max: number | null };
  onChange: (range: { min: number | null; max: number | null }) => void;
}) {
  const currentMin = value.min ?? 0;
  const currentMax = value.max ?? max;

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span className="font-medium">{label}</span>
        <span>
          {currentMin === 0 ? '하한 없음' : formatManwon(currentMin)}
          {' ~ '}
          {currentMax >= max ? '상한 없음' : formatManwon(currentMax)}
        </span>
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="range"
          min={0}
          max={max}
          step={max / 100}
          value={currentMin}
          onChange={(e) => {
            const v = Number(e.target.value);
            const newMin = v === 0 ? null : v;
            // min이 max를 넘으면 max를 min 이상으로 올림
            const adjustedMax = value.max != null && v > value.max ? newMin : value.max;
            onChange({ min: newMin, max: adjustedMax });
          }}
          className="flex-1 accent-blue-600"
        />
        <input
          type="range"
          min={0}
          max={max}
          step={max / 100}
          value={currentMax}
          onChange={(e) => {
            const v = Number(e.target.value);
            const newMax = v >= max ? null : v;
            // max가 min 아래로 내려가면 min을 max 이하로 내림
            const adjustedMin = value.min != null && v < value.min ? newMax : value.min;
            onChange({ min: adjustedMin, max: newMax });
          }}
          className="flex-1 accent-blue-600"
        />
      </div>
      {value.min != null && value.max != null && value.min > value.max && (
        <p className="text-xs text-red-500 mt-1">최솟값이 최댓값보다 큽니다.</p>
      )}
    </div>
  );
}

function AreaRangeFilter({
  max,
  value,
  onChange,
}: {
  max: number;
  value: { min: number | null; max: number | null };
  onChange: (range: { min: number | null; max: number | null }) => void;
}) {
  const currentMin = value.min ?? 0;
  const currentMax = value.max ?? max;

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span className="font-medium">전용면적</span>
        <span>
          {currentMin === 0 ? '하한 없음' : `${currentMin}㎡`}
          {' ~ '}
          {currentMax >= max ? '상한 없음' : `${currentMax}㎡`}
        </span>
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={currentMin}
          onChange={(e) => {
            const v = Number(e.target.value);
            const newMin = v === 0 ? null : v;
            const adjustedMax = value.max != null && v > value.max ? newMin : value.max;
            onChange({ min: newMin, max: adjustedMax });
          }}
          className="flex-1 accent-purple-600"
        />
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={currentMax}
          onChange={(e) => {
            const v = Number(e.target.value);
            const newMax = v >= max ? null : v;
            const adjustedMin = value.min != null && v < value.min ? newMax : value.min;
            onChange({ min: adjustedMin, max: newMax });
          }}
          className="flex-1 accent-purple-600"
        />
      </div>
      {value.min != null && value.max != null && value.min > value.max && (
        <p className="text-xs text-red-500 mt-1">최솟값이 최댓값보다 큽니다.</p>
      )}
    </div>
  );
}

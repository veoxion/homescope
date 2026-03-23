'use client';
import { useDetailStore } from '@/stores/detailStore';
import { useListing } from '@/hooks/useListing';
import { useTransactions } from '@/hooks/useTransactions';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { usePois } from '@/hooks/usePois';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/axios';
import type { Listing as RawListing, Transaction, MarketPrice, Poi, RepaymentType, FinanceResult } from '@/types/api';

// ---- helpers ----

function formatManwon(value?: number | null): string {
  if (value == null) return '-';
  if (value >= 10000) {
    const eok = Math.floor(value / 10000);
    const remain = value % 10000;
    return remain > 0 ? `${eok}억 ${remain.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${value.toLocaleString()}만원`;
}

function formatPrice(listing: RawListing): string {
  if (listing.trade_type === '매매') return formatManwon(listing.sale_price);
  if (listing.trade_type === '전세') return formatManwon(listing.jeonse_price);
  if (listing.trade_type === '월세') {
    return `${formatManwon(listing.deposit)} / 월 ${formatManwon(listing.monthly_rent)}`;
  }
  return '-';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ---- Sub-components ----

function ListingTab({ listing }: { listing: RawListing }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500">{listing.address}</p>
        {listing.building_name && (
          <p className="text-base font-semibold mt-0.5 text-gray-900">{listing.building_name}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <InfoRow label="거래유형" value={listing.trade_type} />
        <InfoRow label="주거형태" value={listing.residence_type} />
        <InfoRow label="가격" value={formatPrice(listing)} />
        <InfoRow label="면적" value={`${Number(listing.area_m2).toFixed(1)}㎡`} />
        <InfoRow label="층수" value={`${listing.floor}층`} />
        <InfoRow label="방 개수" value={`${listing.room_count}개`} />
        <InfoRow label="건축연도" value={`${listing.build_year}년`} />
        <InfoRow label="등록일" value={formatDate(listing.listed_at)} />
      </div>
      <NearbySection lat={listing.lat} lng={listing.lng} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium mt-0.5 text-gray-900">{value}</p>
    </div>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  '지하철역': '🚇',
  '버스정류장': '🚌',
  '학교': '🏫',
};

function NearbySection({ lat, lng }: { lat: number; lng: number }) {
  const { data, isLoading } = usePois(lat, lng, 500);
  const pois = data?.pois ?? [];

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">주변 정보 (반경 500m)</p>
      {isLoading && <p className="text-xs text-gray-400">불러오는 중...</p>}
      {!isLoading && pois.length === 0 && (
        <p className="text-xs text-gray-400">주변 정보가 없습니다.</p>
      )}
      {!isLoading && pois.length > 0 && (
        <ul className="space-y-1">
          {pois.map((poi) => (
            <li key={poi.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <span>{CATEGORY_ICONS[poi.category] ?? '📍'}</span>
                <span className="text-gray-700">{poi.name}</span>
              </span>
              <span className="text-xs text-gray-400 shrink-0 ml-2">{poi.distance}m</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MarketTab({ buildingId }: { buildingId: string }) {
  const { data: prices = [], isLoading } = useMarketPrices(buildingId);

  if (isLoading) return <LoadingSpinner />;
  if (!prices.length) return <EmptyState message="시세 정보가 없습니다." />;

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">최근 12개월 실거래 기준 중위값</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b">
            <th className="text-left pb-2">거래유형</th>
            <th className="text-right pb-2">면적</th>
            <th className="text-right pb-2">중위가</th>
            <th className="text-right pb-2">건수</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {(prices as MarketPrice[]).map((mp) => (
            <tr key={mp.id} className="py-2">
              <td className="py-2 text-gray-800">{mp.tradeType}</td>
              <td className="text-right py-2 text-gray-800">{Number(mp.areaM2).toFixed(0)}㎡</td>
              <td className="text-right py-2 font-medium text-gray-900">{formatManwon(mp.medianPrice)}</td>
              <td className="text-right py-2 text-gray-500">{mp.transactionCount}건</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionTab({ buildingId }: { buildingId: string }) {
  const { data: txs = [], isLoading } = useTransactions(buildingId);

  if (isLoading) return <LoadingSpinner />;
  if (!txs.length) return <EmptyState message="실거래 내역이 없습니다." />;

  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b">
            <th className="text-left pb-2">거래일</th>
            <th className="text-left pb-2">유형</th>
            <th className="text-right pb-2">면적</th>
            <th className="text-right pb-2">가격</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {(txs as Transaction[]).map((tx) => (
            <tr key={tx.id}>
              <td className="py-2 text-gray-600">{formatDate(tx.tradedAt)}</td>
              <td className="py-2 text-gray-800">{tx.tradeType}</td>
              <td className="text-right py-2 text-gray-800">{Number(tx.areaM2).toFixed(0)}㎡</td>
              <td className="text-right py-2 font-medium text-gray-900">
                {tx.tradeType === '월세'
                  ? `${formatManwon(tx.deposit)} / ${formatManwon(tx.monthlyRent)}`
                  : formatManwon(tx.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FinanceTab({ listing }: { listing: RawListing }) {
  const propertyPrice =
    listing.trade_type === '매매'
      ? (listing.sale_price ?? 0)
      : listing.trade_type === '전세'
      ? (listing.jeonse_price ?? 0)
      : (listing.deposit ?? 0);

  const [ltv, setLtv] = useState(70);
  const [annualRatePct, setAnnualRatePct] = useState(3.5);
  const [termYears, setTermYears] = useState(30);
  const [repaymentType, setRepaymentType] = useState<RepaymentType>('equalPayment');

  const loanAmount = useMemo(
    () => Math.round(propertyPrice * (ltv / 100)),
    [propertyPrice, ltv]
  );

  const [result, setResult] = useState<FinanceResult | null>(null);

  useEffect(() => {
    if (loanAmount <= 0) { setResult(null); return; }
    const controller = new AbortController();
    const repType = repaymentType === 'equalPayment' ? '원리금균등' : '원금균등';
    apiClient
      .get('/finance/interest', {
        params: {
          loanAmount,
          annualRate: annualRatePct,
          repaymentType: repType,
          months: termYears * 12,
        },
        signal: controller.signal,
      })
      .then((res) => {
        const s = res.data.summary;
        setResult({
          monthlyPayment: s.firstMonthPayment,
          totalInterest: s.totalInterest,
          totalPayment: s.totalPayment,
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [loanAmount, annualRatePct, termYears, repaymentType]);

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <div className="bg-blue-50 rounded-lg p-3">
        <p className="text-xs text-blue-600 mb-1">매물 가격</p>
        <p className="text-lg font-bold text-blue-800">{formatManwon(propertyPrice)}</p>
      </div>

      <div className="space-y-3">
        <SliderRow
          label={`LTV ${ltv}%`}
          min={10} max={100} step={5} value={ltv}
          onChange={setLtv}
        />
        <SliderRow
          label={`금리 ${annualRatePct.toFixed(1)}%`}
          min={0.1} max={15} step={0.1} value={annualRatePct}
          onChange={setAnnualRatePct}
        />
        <SliderRow
          label={`기간 ${termYears}년`}
          min={1} max={50} step={1} value={termYears}
          onChange={setTermYears}
        />

        <div className="flex gap-2">
          {(['equalPayment', 'equalPrincipal'] as RepaymentType[]).map((type) => (
            <button
              key={type}
              onClick={() => setRepaymentType(type)}
              className={`flex-1 py-1.5 rounded border text-xs font-medium transition-colors ${
                repaymentType === type
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              {type === 'equalPayment' ? '원리금균등' : '원금균등'}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="border rounded-lg divide-y divide-gray-100">
          <ResultRow label="대출 가능 금액" value={formatManwon(loanAmount)} highlight />
          <ResultRow label="자기자본" value={formatManwon(propertyPrice - loanAmount)} />
          <ResultRow
            label={repaymentType === 'equalPayment' ? '월 상환금 (고정)' : '1회차 월 상환금'}
            value={formatManwon(result.monthlyPayment)}
            highlight
          />
          <ResultRow label="총 이자" value={formatManwon(result.totalInterest)} />
          <ResultRow label="총 상환금" value={formatManwon(result.totalPayment)} />
        </div>
      )}
    </div>
  );
}

function SliderRow({
  label, min, max, step, value, onChange,
}: {
  label: string;
  min: number; max: number; step: number; value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center px-3 py-2">
      <span className="text-gray-600 text-xs">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
      불러오는 중...
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
      {message}
    </div>
  );
}

// ---- Main Panel ----

const TABS = [
  { key: 'listing', label: '매물정보' },
  { key: 'market', label: '시세' },
  { key: 'transaction', label: '실거래' },
  { key: 'finance', label: '금융계산' },
] as const;

// 모바일 하단 시트 snap 포인트 (vh 단위)
const SNAP_POINTS = { collapsed: 30, half: 60, full: 90 };
const SWIPE_CLOSE_THRESHOLD = 150;

export default function DetailPanel() {
  const isPanelOpen = useDetailStore((s) => s.isPanelOpen);
  const selectedListingId = useDetailStore((s) => s.selectedListingId);
  const activeTab = useDetailStore((s) => s.activeTab);
  const closePanel = useDetailStore((s) => s.closePanel);
  const setActiveTab = useDetailStore((s) => s.setActiveTab);

  const { data: listing, isLoading, isError } = useListing(selectedListingId);

  // 모바일 드래그 상태
  const [sheetHeight, setSheetHeight] = useState(SNAP_POINTS.half);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const isDragging = useRef(false);

  // 패널 열릴 때 초기 높이 리셋
  useEffect(() => {
    if (isPanelOpen) setSheetHeight(SNAP_POINTS.half);
  }, [isPanelOpen, selectedListingId]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = sheetHeight;
  }, [sheetHeight]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const deltaY = dragStartY.current - e.touches[0].clientY;
    const deltaVh = (deltaY / window.innerHeight) * 100;
    const newHeight = Math.min(SNAP_POINTS.full, Math.max(15, dragStartHeight.current + deltaVh));
    setSheetHeight(newHeight);
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    // 낮은 위치로 드래그하면 닫기
    if (sheetHeight < 20) {
      closePanel();
      return;
    }
    // 가장 가까운 snap 포인트로 이동
    const points = [SNAP_POINTS.collapsed, SNAP_POINTS.half, SNAP_POINTS.full];
    const nearest = points.reduce((prev, curr) =>
      Math.abs(curr - sheetHeight) < Math.abs(prev - sheetHeight) ? curr : prev
    );
    setSheetHeight(nearest);
  }, [sheetHeight, closePanel]);

  if (!isPanelOpen || !selectedListingId) return null;

  const rawListing = listing as RawListing | undefined;
  const buildingId = rawListing?.building_id ?? null;

  return (
    <>
      {/* 모바일 오버레이 배경 */}
      <div
        className="md:hidden fixed inset-0 bg-black/30 z-[9]"
        onClick={closePanel}
      />

      <div
        className="absolute z-10 flex flex-col bg-white shadow-lg
          max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:rounded-t-2xl max-md:z-10
          md:top-0 md:right-0 md:w-96 md:h-full"
        style={{
          // 모바일에서만 동적 높이 적용
          maxHeight: undefined,
        }}
      >
        {/* 모바일 전용: 드래그 핸들 */}
        <div
          className="md:hidden flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h2 className="text-base font-semibold text-gray-900">매물 상세</h2>
          <button
            onClick={closePanel}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="닫기"
          >
            &times;
          </button>
        </div>

        {/* Tabs - 모바일에서 스크롤 가능 */}
        <div className="flex border-b shrink-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
          {isLoading && <LoadingSpinner />}
          {isError && (
            <div className="text-center py-8 text-red-500 text-sm">
              매물 정보를 불러올 수 없습니다.
            </div>
          )}
          {rawListing && (
            <>
              {activeTab === 'listing' && <ListingTab listing={rawListing} />}
              {activeTab === 'market' && (buildingId ? <MarketTab buildingId={buildingId} /> : <EmptyState message="건물 정보를 불러올 수 없습니다." />)}
              {activeTab === 'transaction' && (buildingId ? <TransactionTab buildingId={buildingId} /> : <EmptyState message="건물 정보를 불러올 수 없습니다." />)}
              {activeTab === 'finance' && <FinanceTab listing={rawListing} />}
            </>
          )}
        </div>
      </div>

      {/* 모바일에서 동적 높이를 적용하는 스타일 */}
      <style>{`
        @media (max-width: 767px) {
          .absolute.z-10.flex.flex-col.bg-white.shadow-lg {
            height: ${sheetHeight}vh !important;
            transition: ${isDragging.current ? 'none' : 'height 0.3s ease-out'};
          }
        }
      `}</style>
    </>
  );
}

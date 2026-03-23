'use client';
import { useDetailStore } from '@/stores/detailStore';
import { useListing } from '@/hooks/useListing';
import { useTransactions } from '@/hooks/useTransactions';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { usePois } from '@/hooks/usePois';
import { useState, useMemo } from 'react';

// ---- types ----

interface RawListing {
  id: string;
  building_id: string;
  trade_type: string;
  sale_price?: number;
  jeonse_price?: number;
  deposit?: number;
  monthly_rent?: number;
  area_m2: number;
  floor: number;
  room_count: number;
  status: string;
  listed_at: string;
  address: string;
  building_name?: string;
  residence_type: string;
  build_year: number;
  lat: number;
  lng: number;
}

interface Transaction {
  id: string;
  tradeType: string;
  price: number;
  deposit?: number;
  monthlyRent?: number;
  areaM2: number;
  floor: number;
  tradedAt: string;
}

interface MarketPrice {
  id: string;
  tradeType: string;
  areaM2: number;
  medianPrice: number;
  medianMonthlyRent?: number;
  transactionCount: number;
  periodStart: string;
  periodEnd: string;
}

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

// ---- Finance calculator ----

type RepaymentType = 'equalPayment' | 'equalPrincipal';

function roundToManwon(v: number): number {
  return Math.round(v);
}

function calcEqualPayment(principal: number, annualRate: number, termMonths: number) {
  const r = annualRate / 12;
  let pmt: number;
  if (annualRate === 0) {
    pmt = roundToManwon(principal / termMonths);
  } else {
    const cf = Math.pow(1 + r, termMonths);
    pmt = roundToManwon(principal * r * cf / (cf - 1));
  }
  let totalInterest = 0;
  let remaining = principal;
  for (let i = 1; i <= termMonths; i++) {
    const interest = roundToManwon(remaining * r);
    const principalPart = i === termMonths ? remaining : pmt - interest;
    remaining -= principalPart;
    totalInterest += interest;
  }
  return { monthlyPayment: pmt, totalInterest, totalPayment: principal + totalInterest };
}

function calcEqualPrincipal(principal: number, annualRate: number, termMonths: number) {
  const r = annualRate / 12;
  const monthlyPrincipal = roundToManwon(principal / termMonths);
  let totalInterest = 0;
  let remaining = principal;
  const firstMonthPayment = monthlyPrincipal + roundToManwon(remaining * r);
  for (let i = 1; i <= termMonths; i++) {
    totalInterest += roundToManwon(remaining * r);
    remaining -= i === termMonths ? remaining : monthlyPrincipal;
  }
  return { monthlyPayment: firstMonthPayment, totalInterest, totalPayment: principal + totalInterest };
}

// ---- Sub-components ----

function ListingTab({ listing }: { listing: RawListing }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-500">{listing.address}</p>
        {listing.building_name && (
          <p className="text-base font-semibold mt-0.5">{listing.building_name}</p>
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
      <p className="font-medium mt-0.5">{value}</p>
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
              <td className="py-2">{mp.tradeType}</td>
              <td className="text-right py-2">{Number(mp.areaM2).toFixed(0)}㎡</td>
              <td className="text-right py-2 font-medium">{formatManwon(mp.medianPrice)}</td>
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
              <td className="py-2">{tx.tradeType}</td>
              <td className="text-right py-2">{Number(tx.areaM2).toFixed(0)}㎡</td>
              <td className="text-right py-2 font-medium">
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

  const result = useMemo(() => {
    if (loanAmount <= 0) return null;
    const annualRate = annualRatePct / 100;
    const termMonths = termYears * 12;
    return repaymentType === 'equalPayment'
      ? calcEqualPayment(loanAmount, annualRate, termMonths)
      : calcEqualPrincipal(loanAmount, annualRate, termMonths);
  }, [loanAmount, annualRatePct, termYears, repaymentType]);

  return (
    <div className="space-y-4 text-sm">
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
      <span className={`font-semibold ${highlight ? 'text-blue-700' : ''}`}>{value}</span>
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

export default function DetailPanel() {
  const isPanelOpen = useDetailStore((s) => s.isPanelOpen);
  const selectedListingId = useDetailStore((s) => s.selectedListingId);
  const activeTab = useDetailStore((s) => s.activeTab);
  const closePanel = useDetailStore((s) => s.closePanel);
  const setActiveTab = useDetailStore((s) => s.setActiveTab);

  const { data: listing, isLoading, isError } = useListing(selectedListingId);

  if (!isPanelOpen || !selectedListingId) return null;

  const rawListing = listing as RawListing | undefined;
  const buildingId = rawListing?.building_id ?? null;

  return (
    <div className="absolute top-0 right-0 w-96 h-full bg-white shadow-lg z-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h2 className="text-base font-semibold">매물 상세</h2>
        <button
          onClick={closePanel}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          aria-label="닫기"
        >
          &times;
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
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
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && <LoadingSpinner />}
        {isError && (
          <div className="text-center py-8 text-red-500 text-sm">
            매물 정보를 불러올 수 없습니다.
          </div>
        )}
        {rawListing && (
          <>
            {activeTab === 'listing' && <ListingTab listing={rawListing} />}
            {activeTab === 'market' && buildingId && <MarketTab buildingId={buildingId} />}
            {activeTab === 'transaction' && buildingId && <TransactionTab buildingId={buildingId} />}
            {activeTab === 'finance' && <FinanceTab listing={rawListing} />}
          </>
        )}
      </div>
    </div>
  );
}

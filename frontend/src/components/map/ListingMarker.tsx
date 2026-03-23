'use client';
import { CustomOverlayMap } from 'react-kakao-maps-sdk';
import type { Listing } from '@/types/api';

// 거래유형별 색상
const TRADE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '매매': { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
  '전세': { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' },
  '월세': { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' },
};

const DEFAULT_COLOR = { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-600' };

function formatShortPrice(listing: Listing): string {
  const price =
    listing.trade_type === '매매'
      ? listing.sale_price
      : listing.trade_type === '전세'
      ? listing.jeonse_price
      : listing.deposit;

  if (price == null) return '-';

  if (price >= 10000) {
    const eok = Math.floor(price / 10000);
    const remain = Math.round((price % 10000) / 1000);
    return remain > 0 ? `${eok}.${remain}억` : `${eok}억`;
  }
  if (price >= 1000) {
    return `${(price / 1000).toFixed(1)}천`;
  }
  return `${price}만`;
}

interface ListingMarkerProps {
  listing: Listing;
  onClick: () => void;
  isSelected?: boolean;
}

export default function ListingMarker({ listing, onClick, isSelected }: ListingMarkerProps) {
  const color = TRADE_TYPE_COLORS[listing.trade_type] ?? DEFAULT_COLOR;
  const priceText = formatShortPrice(listing);

  return (
    <CustomOverlayMap
      position={{ lat: listing.lat, lng: listing.lng }}
      yAnchor={1.3}
    >
      <button
        onClick={onClick}
        className={`
          flex items-center gap-1 px-2 py-1 rounded-full shadow-md
          border ${color.border} ${color.bg} ${color.text}
          text-xs font-semibold whitespace-nowrap cursor-pointer
          hover:scale-105 active:scale-95 transition-transform
          ${isSelected ? 'ring-2 ring-white scale-110' : ''}
        `}
        style={{ transform: 'translate(-50%, 0)' }}
      >
        <span className="text-[10px] opacity-80">{listing.trade_type}</span>
        <span>{priceText}</span>
      </button>
      {/* 화살표 꼬리 */}
      <div
        className={`w-2 h-2 ${color.bg} rotate-45 mx-auto -mt-1`}
        style={{ transform: 'translateX(-50%) rotate(45deg)' }}
      />
    </CustomOverlayMap>
  );
}

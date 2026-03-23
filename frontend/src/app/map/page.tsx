'use client';
import dynamic from 'next/dynamic';
import FilterBar from '@/components/filter/FilterBar';
import DetailPanel from '@/components/detail/DetailPanel';
import AddressSearch from '@/components/search/AddressSearch';

const KakaoMap = dynamic(() => import('@/components/map/KakaoMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      지도 로딩 중...
    </div>
  ),
});

export default function MapPage() {
  return (
    <div className="flex flex-col h-screen">
      <FilterBar />
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute top-3 left-3 z-20 w-72 max-w-[calc(100%-6rem)] max-md:w-[calc(100%-1.5rem)] max-md:left-3 max-md:right-3">
          <AddressSearch />
        </div>
        <KakaoMap />
        <DetailPanel />
      </div>
    </div>
  );
}

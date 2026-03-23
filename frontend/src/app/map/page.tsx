'use client';
import dynamic from 'next/dynamic';
import FilterBar from '@/components/filter/FilterBar';
import DetailPanel from '@/components/detail/DetailPanel';

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
        <KakaoMap />
        <DetailPanel />
      </div>
    </div>
  );
}

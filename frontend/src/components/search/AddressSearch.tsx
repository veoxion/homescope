'use client';
import { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/axios';
import { useMapStore } from '@/stores/mapStore';

interface SearchResult {
  id: string;
  address: string;
  buildingName?: string;
  lat: number;
  lng: number;
}

export default function AddressSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    clearTimeout(timerRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get('/buildings/search', { params: { q: value.trim() } });
        setResults(res.data ?? []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }

  function handleSelect(result: SearchResult) {
    setCenter({ lat: result.lat, lng: result.lng });
    setZoom(5);
    setQuery(result.buildingName || result.address);
    setIsOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        placeholder="주소 또는 건물명 검색"
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 shadow-sm"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          검색중...
        </div>
      )}
      {isOpen && results.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
          {results.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
              >
                {r.buildingName && (
                  <span className="font-medium text-gray-800">{r.buildingName} </span>
                )}
                <span className="text-gray-500">{r.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {isOpen && results.length === 0 && query.trim().length >= 2 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-400 text-center z-50">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  );
}

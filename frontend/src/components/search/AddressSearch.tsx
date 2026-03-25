'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/axios';
import { useMapStore } from '@/stores/mapStore';
import type { SearchResult } from '@/types/api';

const RECENT_SEARCHES_KEY = 'homescope_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches(): SearchResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(result: SearchResult) {
  const recent = getRecentSearches().filter((r) => r.id !== result.id);
  recent.unshift(result);
  if (recent.length > MAX_RECENT) recent.pop();
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
}

export default function AddressSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentResults, setRecentResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showRecent, setShowRecent] = useState(false);
  const setCenter = useMapStore((s) => s.setCenter);
  const setZoom = useMapStore((s) => s.setZoom);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowRecent(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayedResults = showRecent && query.trim().length < 2 ? recentResults : results;

  function handleChange(value: string) {
    setQuery(value);
    setActiveIndex(-1);
    clearTimeout(timerRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setShowRecent(false);
    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get('/buildings/search', { params: { q: value.trim() } });
        setResults(res.data ?? []);
        setIsOpen(true);
      } catch (err) {
        console.warn('주소 검색 실패:', err instanceof Error ? err.message : String(err));
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }

  const handleSelect = useCallback((result: SearchResult) => {
    setCenter({ lat: result.lat, lng: result.lng });
    setZoom(5);
    setQuery(result.buildingName || result.address);
    setIsOpen(false);
    setShowRecent(false);
    setActiveIndex(-1);
    saveRecentSearch(result);
  }, [setCenter, setZoom]);

  function handleFocus() {
    if (results.length > 0) {
      setIsOpen(true);
    } else if (query.trim().length < 2) {
      const recent = getRecentSearches();
      if (recent.length > 0) {
        setRecentResults(recent);
        setShowRecent(true);
        setIsOpen(true);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || displayedResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < displayedResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : displayedResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < displayedResults.length) {
        handleSelect(displayedResults[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setShowRecent(false);
      inputRef.current?.blur();
    }
  }

  function clearQuery() {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setShowRecent(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="주소 또는 건물명 검색"
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 shadow-sm"
          role="combobox"
          aria-expanded={isOpen}
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
        />
        {/* Clear button or loading indicator */}
        {isLoading ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-gray-400 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : query.length > 0 ? (
          <button
            onClick={clearQuery}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="검색어 지우기"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Dropdown */}
      {isOpen && displayedResults.length > 0 && (
        <ul
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50"
          role="listbox"
        >
          {showRecent && (
            <li className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100">
              최근 검색
            </li>
          )}
          {displayedResults.map((r, index) => (
            <li key={r.id} id={`search-result-${index}`} role="option" aria-selected={index === activeIndex}>
              <button
                onClick={() => handleSelect(r)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  index === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
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
      {isOpen && displayedResults.length === 0 && query.trim().length >= 2 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-400 text-center z-50">
          검색 결과가 없습니다
        </div>
      )}
    </div>
  );
}

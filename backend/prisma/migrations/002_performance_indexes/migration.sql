-- =============================================================
-- Homescope 성능 최적화 인덱스
-- 대량 데이터 조회 시 성능 개선을 위한 추가 인덱스
-- =============================================================

-- 1. listings: 공간 조회 시 building_id JOIN + status 필터 복합 인덱스
-- findInBounds 쿼리에서 status='ACTIVE' 필터 + building_id JOIN 최적화
CREATE INDEX IF NOT EXISTS idx_listings_active_building
  ON listings (building_id)
  WHERE status = 'ACTIVE';

-- 2. buildings: 건물명 텍스트 검색 (trigram) - 주소 검색 UI용
CREATE INDEX IF NOT EXISTS idx_buildings_name
  ON buildings USING GIN (building_name gin_trgm_ops)
  WHERE building_name IS NOT NULL;

-- 3. transactions: 시세 계산 최적화 (최근 12개월 거래 집계)
-- calculateForBuilding 쿼리에서 building_id + traded_at 범위 검색
CREATE INDEX IF NOT EXISTS idx_transactions_building_traded
  ON transactions (building_id, traded_at DESC);

-- 4. market_prices: 건물별 시세 조회 최적화
CREATE INDEX IF NOT EXISTS idx_market_prices_building
  ON market_prices (building_id);

-- 5. ANALYZE: 통계 정보 갱신 (쿼리 플래너 최적화)
ANALYZE buildings;
ANALYZE listings;
ANALYZE transactions;
ANALYZE market_prices;
ANALYZE pois;

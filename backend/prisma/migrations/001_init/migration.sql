-- =============================================================
-- Homescope DB 마이그레이션
-- PostgreSQL 14+ / PostGIS 3+
-- =============================================================

-- 확장 활성화
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================
-- 1. buildings
-- =============================================================
CREATE TABLE buildings (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    location        GEOGRAPHY(Point, 4326) NOT NULL,
    address         VARCHAR(300)    NOT NULL UNIQUE,
    building_name   VARCHAR(100),
    build_year      SMALLINT        NOT NULL,
    residence_type  VARCHAR(20)     NOT NULL
                    CHECK (residence_type IN ('아파트', '오피스텔', '빌라', '원룸')),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 좌표 기반 범위 검색
CREATE INDEX idx_buildings_location ON buildings USING GIST (location);

-- 주거형태 필터
CREATE INDEX idx_buildings_residence_type ON buildings (residence_type);

-- 주소 텍스트 검색 (trigram)
CREATE INDEX idx_buildings_address ON buildings USING GIN (address gin_trgm_ops);

-- =============================================================
-- 2. listings
-- =============================================================
CREATE TABLE listings (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id     UUID            NOT NULL REFERENCES buildings(id),
    trade_type      VARCHAR(10)     NOT NULL
                    CHECK (trade_type IN ('매매', '전세', '월세')),
    sale_price      INTEGER,
    jeonse_price    INTEGER,
    deposit         INTEGER,
    monthly_rent    INTEGER,
    area_m2         NUMERIC(7,2)    NOT NULL,
    floor           SMALLINT        NOT NULL,
    room_count      SMALLINT        NOT NULL,
    status          VARCHAR(10)     NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'CLOSED', 'HIDDEN')),
    listed_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    -- 거래유형별 필수 가격 필드 보장
    CONSTRAINT chk_listing_price_sale
        CHECK (trade_type <> '매매' OR sale_price IS NOT NULL),
    CONSTRAINT chk_listing_price_jeonse
        CHECK (trade_type <> '전세' OR jeonse_price IS NOT NULL),
    CONSTRAINT chk_listing_price_monthly
        CHECK (trade_type <> '월세' OR (deposit IS NOT NULL AND monthly_rent IS NOT NULL))
);

CREATE INDEX idx_listings_building_id ON listings (building_id);
CREATE INDEX idx_listings_status_trade_type ON listings (status, trade_type);
CREATE INDEX idx_listings_sale_price ON listings (sale_price) WHERE sale_price IS NOT NULL;
CREATE INDEX idx_listings_jeonse_price ON listings (jeonse_price) WHERE jeonse_price IS NOT NULL;
CREATE INDEX idx_listings_deposit_monthly ON listings (deposit, monthly_rent) WHERE deposit IS NOT NULL;
CREATE INDEX idx_listings_area_m2 ON listings (area_m2);
CREATE INDEX idx_listings_listed_at ON listings (listed_at);

-- =============================================================
-- 3. transactions
-- =============================================================
CREATE TABLE transactions (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id     UUID            NOT NULL REFERENCES buildings(id),
    trade_type      VARCHAR(10)     NOT NULL
                    CHECK (trade_type IN ('매매', '전세', '월세')),
    price           INTEGER         NOT NULL,
    deposit         INTEGER,
    monthly_rent    INTEGER,
    area_m2         NUMERIC(7,2)    NOT NULL,
    floor           SMALLINT        NOT NULL,
    traded_at       DATE            NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_building_id ON transactions (building_id);
CREATE INDEX idx_transactions_traded_at ON transactions (traded_at);
CREATE INDEX idx_transactions_building_trade_area ON transactions (building_id, trade_type, area_m2);

-- 공공 데이터 중복 수집 방지 (ON CONFLICT DO NOTHING 대상 키)
ALTER TABLE transactions
    ADD CONSTRAINT uq_transactions_dedup
    UNIQUE (building_id, traded_at, area_m2, floor, trade_type);

-- =============================================================
-- 4. market_prices
-- =============================================================
CREATE TABLE market_prices (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id         UUID            NOT NULL REFERENCES buildings(id),
    trade_type          VARCHAR(10)     NOT NULL
                        CHECK (trade_type IN ('매매', '전세', '월세')),
    area_m2             NUMERIC(7,2)    NOT NULL,
    median_price        INTEGER         NOT NULL,
    median_monthly_rent INTEGER,
    transaction_count   INTEGER         NOT NULL,
    period_start        DATE            NOT NULL,
    period_end          DATE            NOT NULL,
    calculated_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),

    -- 건물 + 거래유형 + 면적 조합 유일성 (UPSERT 키)
    CONSTRAINT uq_market_prices_bta UNIQUE (building_id, trade_type, area_m2)
);

-- =============================================================
-- 5. pois
-- =============================================================
CREATE TABLE pois (
    id          UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR                 NOT NULL,
    category    VARCHAR                 NOT NULL,
    location    GEOGRAPHY(Point, 4326)  NOT NULL
);

-- 좌표 기반 주변 POI 검색
CREATE INDEX idx_pois_location ON pois USING GIST (location);

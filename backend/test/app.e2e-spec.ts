import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FinanceModule } from '../src/finance/finance.module';

describe('Finance API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [FinanceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ──────────────────────────────────────────────
  // GET /finance/loan-limit
  // ──────────────────────────────────────────────

  describe('GET /finance/loan-limit', () => {
    it('기본 LTV 70%로 대출 한도를 계산한다', () => {
      return request(app.getHttpServer())
        .get('/finance/loan-limit')
        .query({ price: 100000 })
        .expect(200)
        .expect((res) => {
          expect(res.body.loanLimit).toBe(70000);
          expect(res.body.ltvPercent).toBe(70);
          expect(res.body.price).toBe(100000);
        });
    });

    it('LTV를 지정하면 해당 비율로 계산한다', () => {
      return request(app.getHttpServer())
        .get('/finance/loan-limit')
        .query({ price: 50000, ltvPercent: 40 })
        .expect(200)
        .expect((res) => {
          expect(res.body.loanLimit).toBe(20000);
        });
    });

    it('price 누락 시 400을 반환한다', () => {
      return request(app.getHttpServer())
        .get('/finance/loan-limit')
        .expect(400);
    });

    it('price가 문자열이면 400을 반환한다', () => {
      return request(app.getHttpServer())
        .get('/finance/loan-limit')
        .query({ price: 'abc' })
        .expect(400);
    });

    it('ltvPercent가 100 초과면 400을 반환한다', () => {
      return request(app.getHttpServer())
        .get('/finance/loan-limit')
        .query({ price: 50000, ltvPercent: 150 })
        .expect(400);
    });
  });

  // ──────────────────────────────────────────────
  // GET /finance/interest
  // ──────────────────────────────────────────────

  describe('GET /finance/interest', () => {
    it('원리금균등 상환 결과를 반환한다', () => {
      return request(app.getHttpServer())
        .get('/finance/interest')
        .query({
          loanAmount: 100000,
          annualRate: 3.5,
          repaymentType: '원리금균등',
          months: 12,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.repaymentType).toBe('원리금균등');
          expect(res.body.schedule).toHaveLength(12);
          expect(res.body.summary.totalPayment).toBeGreaterThan(100000);
          expect(res.body.summary.totalInterest).toBeGreaterThan(0);
          const last = res.body.schedule[11];
          expect(last.balance).toBe(0);
        });
    });

    it('원금균등 상환 결과를 반환한다', () => {
      return request(app.getHttpServer())
        .get('/finance/interest')
        .query({
          loanAmount: 120000,
          annualRate: 4,
          repaymentType: '원금균등',
          months: 24,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.repaymentType).toBe('원금균등');
          expect(res.body.schedule).toHaveLength(24);
          // 원금균등: 매월 상환금이 감소
          expect(res.body.schedule[0].payment).toBeGreaterThanOrEqual(
            res.body.schedule[23].payment,
          );
        });
    });

    it('필수 파라미터 누락 시 400을 반환한다', () => {
      return request(app.getHttpServer())
        .get('/finance/interest')
        .query({ loanAmount: 100000 })
        .expect(400);
    });

    it('잘못된 repaymentType이면 400을 반환한다', () => {
      return request(app.getHttpServer())
        .get('/finance/interest')
        .query({
          loanAmount: 100000,
          annualRate: 3,
          repaymentType: '잘못된유형',
          months: 12,
        })
        .expect(400);
    });

    it('months가 0이면 400을 반환한다', () => {
      return request(app.getHttpServer())
        .get('/finance/interest')
        .query({
          loanAmount: 100000,
          annualRate: 3,
          repaymentType: '원리금균등',
          months: 0,
        })
        .expect(400);
    });
  });
});

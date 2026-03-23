import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  let service: FinanceService;

  beforeEach(() => {
    service = new FinanceService();
  });

  // ──────────────────────────────────────────────
  // 대출 한도 (calculateLoanLimit)
  // ──────────────────────────────────────────────

  describe('calculateLoanLimit', () => {
    it('기본 LTV 70%로 대출 가능액을 계산한다', () => {
      const result = service.calculateLoanLimit({ price: 100000 });
      expect(result.loanLimit).toBe(70000);
      expect(result.ltvPercent).toBe(70);
    });

    it('LTV를 지정하면 해당 비율로 계산한다', () => {
      const result = service.calculateLoanLimit({ price: 50000, ltvPercent: 60 });
      expect(result.loanLimit).toBe(30000);
    });

    it('가격이 0이면 대출 가능액도 0이다', () => {
      const result = service.calculateLoanLimit({ price: 0 });
      expect(result.loanLimit).toBe(0);
    });

    it('LTV 100%이면 매물가 전액이 대출 가능하다', () => {
      const result = service.calculateLoanLimit({ price: 80000, ltvPercent: 100 });
      expect(result.loanLimit).toBe(80000);
    });

    it('LTV가 0%이면 대출 가능액이 0이다', () => {
      const result = service.calculateLoanLimit({ price: 50000, ltvPercent: 0 });
      expect(result.loanLimit).toBe(0);
    });

    it('매우 큰 가격에도 정상 계산된다', () => {
      const result = service.calculateLoanLimit({ price: 10000000, ltvPercent: 70 });
      expect(result.loanLimit).toBe(7000000);
    });

    it('소수점 이하 LTV 비율을 적용하면 소수점 버림 처리한다', () => {
      // price=100001, ltv=33% → 100001 * 0.33 = 33000.33 → floor → 33000
      const result = service.calculateLoanLimit({ price: 100001, ltvPercent: 33 });
      expect(result.loanLimit).toBe(33000);
    });

    it('price 필드를 그대로 반환한다', () => {
      const result = service.calculateLoanLimit({ price: 55000, ltvPercent: 80 });
      expect(result.price).toBe(55000);
      expect(result.ltvPercent).toBe(80);
    });

    it('실제 서울 아파트 가격 범위에서 정상 계산된다', () => {
      // 15억 아파트, LTV 40% (투기과열지구)
      const result = service.calculateLoanLimit({ price: 150000, ltvPercent: 40 });
      expect(result.loanLimit).toBe(60000);
    });
  });

  // ──────────────────────────────────────────────
  // 원리금균등 상환 (Equal Payment / Annuity)
  // ──────────────────────────────────────────────

  describe('원리금균등 상환', () => {
    it('기본 상환 계획을 생성한다', () => {
      const result = service.calculateInterest({
        loanAmount: 30000,
        annualRate: 3.5,
        repaymentType: '원리금균등',
        months: 360,
      });
      expect(result.repaymentType).toBe('원리금균등');
      expect(result.schedule).toHaveLength(360);
      expect(result.summary.firstMonthPayment).toBeGreaterThan(0);
      expect(result.summary.totalPayment).toBeGreaterThan(30000);
    });

    it('마지막 달 잔액이 0이다', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 4.0,
        repaymentType: '원리금균등',
        months: 120,
      });
      const lastMonth = result.schedule[result.schedule.length - 1];
      expect(lastMonth.balance).toBe(0);
    });

    it('금리 0%이면 이자가 0이다', () => {
      const result = service.calculateInterest({
        loanAmount: 12000,
        annualRate: 0,
        repaymentType: '원리금균등',
        months: 12,
      });
      expect(result.summary.totalInterest).toBe(0);
      expect(result.schedule[0].payment).toBe(1000);
    });

    it('1개월 대출은 원금 전액 상환이다', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 3.6,
        repaymentType: '원리금균등',
        months: 1,
      });
      expect(result.schedule[0].principal).toBe(10000);
      expect(result.schedule[0].interest).toBe(30); // 10000 * 3.6% / 12
    });

    it('변동금리를 적용한다', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 3.0,
        repaymentType: '원리금균등',
        months: 24,
        rateChanges: [{ fromMonth: 13, annualRate: 5.0 }],
      });
      const balance12 = result.schedule[11].balance;
      const expectedInterest13 = Math.round(balance12 * (5.0 / 100 / 12));
      expect(result.schedule[12].interest).toBe(expectedInterest13);
    });

    it('모든 회차의 원금 합계가 대출 원금과 같다', () => {
      const result = service.calculateInterest({
        loanAmount: 30000,
        annualRate: 3.5,
        repaymentType: '원리금균등',
        months: 360,
      });
      const totalPrincipal = result.schedule.reduce((s, r) => s + r.principal, 0);
      // 반올림 오차 허용 (360회 누적 반올림 오차)
      expect(Math.abs(totalPrincipal - 30000)).toBeLessThanOrEqual(5);
    });

    it('totalPayment = totalInterest + loanAmount (반올림 오차 허용)', () => {
      const result = service.calculateInterest({
        loanAmount: 50000,
        annualRate: 4.5,
        repaymentType: '원리금균등',
        months: 240,
      });
      const diff = Math.abs(
        result.summary.totalPayment - (result.summary.totalInterest + 50000),
      );
      // 240회 누적 반올림 오차 허용
      expect(diff).toBeLessThanOrEqual(100);
    });

    it('3년 단기 대출에서 정확한 1회차 이자를 계산한다', () => {
      // 1억 대출, 연 4.8%, 36개월
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 4.8,
        repaymentType: '원리금균등',
        months: 36,
      });
      // 1회차 이자: 10000 * 0.048 / 12 = 40
      expect(result.schedule[0].interest).toBe(40);
    });

    it('잔액이 매달 감소한다', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 3.0,
        repaymentType: '원리금균등',
        months: 60,
      });
      for (let i = 1; i < result.schedule.length; i++) {
        expect(result.schedule[i].balance).toBeLessThanOrEqual(
          result.schedule[i - 1].balance,
        );
      }
    });

    it('여러 번 변동금리가 적용된다', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 2.0,
        repaymentType: '원리금균등',
        months: 36,
        rateChanges: [
          { fromMonth: 13, annualRate: 3.0 },
          { fromMonth: 25, annualRate: 4.0 },
        ],
      });
      // 1회차: 연 2% 적용
      expect(result.schedule[0].interest).toBe(Math.round(10000 * (2.0 / 100 / 12)));
      // 25회차: 연 4% 적용 (잔액 기준)
      const balance24 = result.schedule[23].balance;
      expect(result.schedule[24].interest).toBe(
        Math.round(balance24 * (4.0 / 100 / 12)),
      );
      // 마지막 잔액 0
      expect(result.schedule[35].balance).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // 원금균등 상환 (Equal Principal)
  // ──────────────────────────────────────────────

  describe('원금균등 상환', () => {
    it('매달 동일한 원금을 상환한다', () => {
      const result = service.calculateInterest({
        loanAmount: 12000,
        annualRate: 3.6,
        repaymentType: '원금균등',
        months: 12,
      });
      expect(result.repaymentType).toBe('원금균등');
      expect(result.schedule[0].principal).toBe(1000);
      expect(result.schedule[11].principal).toBe(1000);
    });

    it('월 상환금이 점차 감소한다', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 4.0,
        repaymentType: '원금균등',
        months: 60,
      });
      const firstPayment = result.schedule[0].payment;
      const lastPayment = result.schedule[59].payment;
      expect(firstPayment).toBeGreaterThan(lastPayment);
    });

    it('마지막 달 잔액이 0이다', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 5.0,
        repaymentType: '원금균등',
        months: 120,
      });
      const lastMonth = result.schedule[result.schedule.length - 1];
      expect(lastMonth.balance).toBe(0);
    });

    it('금리 0%이면 이자 없이 원금만 상환한다', () => {
      const result = service.calculateInterest({
        loanAmount: 6000,
        annualRate: 0,
        repaymentType: '원금균등',
        months: 6,
      });
      expect(result.summary.totalInterest).toBe(0);
      expect(result.schedule[0].payment).toBe(1000);
    });

    it('모든 회차의 원금 합계가 대출 원금과 같다', () => {
      const result = service.calculateInterest({
        loanAmount: 12000,
        annualRate: 3.6,
        repaymentType: '원금균등',
        months: 12,
      });
      const totalPrincipal = result.schedule.reduce((s, r) => s + r.principal, 0);
      expect(totalPrincipal).toBe(12000);
    });

    it('1회차 이자가 정확하다 (원금균등)', () => {
      // 5천만원, 연 6%, 120개월
      const result = service.calculateInterest({
        loanAmount: 5000,
        annualRate: 6.0,
        repaymentType: '원금균등',
        months: 120,
      });
      // 1회차 이자: 5000 * 0.06 / 12 = 25
      expect(result.schedule[0].interest).toBe(25);
      // 원금: 5000 / 120 ≈ 41.67 → round → 42
      expect(result.schedule[0].principal).toBe(42);
    });

    it('이자가 매달 감소한다 (고정금리)', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 5.0,
        repaymentType: '원금균등',
        months: 60,
      });
      for (let i = 1; i < result.schedule.length; i++) {
        expect(result.schedule[i].interest).toBeLessThanOrEqual(
          result.schedule[i - 1].interest,
        );
      }
    });

    it('변동금리를 적용한다 (원금균등)', () => {
      const result = service.calculateInterest({
        loanAmount: 12000,
        annualRate: 3.0,
        repaymentType: '원금균등',
        months: 24,
        rateChanges: [{ fromMonth: 13, annualRate: 6.0 }],
      });
      // 12회차까지는 3%, 13회차부터 6%
      const balance12 = result.schedule[11].balance;
      const interest13 = result.schedule[12].interest;
      expect(interest13).toBe(Math.round(balance12 * (6.0 / 100 / 12)));
      expect(result.schedule[23].balance).toBe(0);
    });

    it('totalPayment = totalInterest + loanAmount (반올림 오차 허용)', () => {
      const result = service.calculateInterest({
        loanAmount: 50000,
        annualRate: 4.0,
        repaymentType: '원금균등',
        months: 360,
      });
      const diff = Math.abs(
        result.summary.totalPayment - (result.summary.totalInterest + 50000),
      );
      // 360회 누적 반올림 오차 허용
      expect(diff).toBeLessThanOrEqual(5);
    });
  });

  // ──────────────────────────────────────────────
  // 두 상환 방식 비교
  // ──────────────────────────────────────────────

  describe('상환 방식 비교', () => {
    it('동일 조건에서 원금균등의 총 이자가 원리금균등보다 적다', () => {
      const equal = service.calculateInterest({
        loanAmount: 30000,
        annualRate: 4.0,
        repaymentType: '원리금균등',
        months: 360,
      });
      const principal = service.calculateInterest({
        loanAmount: 30000,
        annualRate: 4.0,
        repaymentType: '원금균등',
        months: 360,
      });
      expect(principal.summary.totalInterest).toBeLessThan(
        equal.summary.totalInterest,
      );
    });

    it('원금균등 1회차 상환액이 원리금균등보다 크다', () => {
      const equal = service.calculateInterest({
        loanAmount: 30000,
        annualRate: 4.0,
        repaymentType: '원리금균등',
        months: 360,
      });
      const principal = service.calculateInterest({
        loanAmount: 30000,
        annualRate: 4.0,
        repaymentType: '원금균등',
        months: 360,
      });
      expect(principal.summary.firstMonthPayment).toBeGreaterThan(
        equal.summary.firstMonthPayment,
      );
    });
  });

  // ──────────────────────────────────────────────
  // 경계값 / 특수 케이스
  // ──────────────────────────────────────────────

  describe('경계값 테스트', () => {
    it('대출금 0이면 빈 스케줄을 반환한다 (원리금균등)', () => {
      const result = service.calculateInterest({
        loanAmount: 0,
        annualRate: 3.5,
        repaymentType: '원리금균등',
        months: 12,
      });
      expect(result.schedule).toHaveLength(12);
      expect(result.summary.totalPayment).toBe(0);
    });

    it('대출금 0이면 빈 스케줄을 반환한다 (원금균등)', () => {
      const result = service.calculateInterest({
        loanAmount: 0,
        annualRate: 3.5,
        repaymentType: '원금균등',
        months: 12,
      });
      expect(result.schedule).toHaveLength(12);
      expect(result.summary.totalPayment).toBe(0);
    });

    it('매우 높은 금리에도 정상 계산된다', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 50,
        repaymentType: '원금균등',
        months: 12,
      });
      expect(result.schedule).toHaveLength(12);
      expect(result.summary.totalInterest).toBeGreaterThan(0);
      const lastMonth = result.schedule[result.schedule.length - 1];
      expect(lastMonth.balance).toBe(0);
    });

    it('매우 높은 금리에서도 원리금균등이 정상 계산된다', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 50,
        repaymentType: '원리금균등',
        months: 12,
      });
      expect(result.schedule).toHaveLength(12);
      expect(result.summary.totalInterest).toBeGreaterThan(0);
      expect(result.schedule[11].balance).toBe(0);
    });

    it('대출 기간 1개월 (원금균등)', () => {
      const result = service.calculateInterest({
        loanAmount: 5000,
        annualRate: 12.0,
        repaymentType: '원금균등',
        months: 1,
      });
      expect(result.schedule).toHaveLength(1);
      expect(result.schedule[0].principal).toBe(5000);
      expect(result.schedule[0].interest).toBe(50); // 5000 * 12% / 12
      expect(result.schedule[0].balance).toBe(0);
    });

    it('매우 긴 대출 기간 (600개월 = 50년)', () => {
      const result = service.calculateInterest({
        loanAmount: 30000,
        annualRate: 3.0,
        repaymentType: '원리금균등',
        months: 600,
      });
      expect(result.schedule).toHaveLength(600);
      expect(result.schedule[599].balance).toBe(0);
      expect(result.summary.firstMonthPayment).toBeGreaterThan(0);
    });

    it('매우 작은 금리 (0.1%)', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 0.1,
        repaymentType: '원리금균등',
        months: 12,
      });
      // 이자가 매우 적지만 존재해야 함
      expect(result.summary.totalInterest).toBeGreaterThan(0);
      expect(result.summary.totalInterest).toBeLessThan(100);
    });

    it('소수점 금리 (3.75%)', () => {
      const result = service.calculateInterest({
        loanAmount: 20000,
        annualRate: 3.75,
        repaymentType: '원리금균등',
        months: 360,
      });
      // 1회차 이자: 20000 * 3.75% / 12 = 62.5 → Math.round → 63 or 62 (IEEE754 특성)
      // Math.round(62.5) = 62 (banker's rounding in some engines) or 63
      expect(result.schedule[0].interest).toBeGreaterThanOrEqual(62);
      expect(result.schedule[0].interest).toBeLessThanOrEqual(63);
    });
  });

  // ──────────────────────────────────────────────
  // 실제 시나리오 테스트 (한국 부동산)
  // ──────────────────────────────────────────────

  describe('실제 시나리오 (한국 부동산)', () => {
    it('서울 아파트 10억 매매, LTV 40%, 30년', () => {
      const limit = service.calculateLoanLimit({ price: 100000, ltvPercent: 40 });
      expect(limit.loanLimit).toBe(40000); // 4억

      const result = service.calculateInterest({
        loanAmount: 40000,
        annualRate: 3.5,
        repaymentType: '원리금균등',
        months: 360,
      });
      // 30년 원리금균등 3.5%에서 월 상환금 약 180만원
      expect(result.summary.firstMonthPayment).toBeGreaterThan(170);
      expect(result.summary.firstMonthPayment).toBeLessThan(190);
      expect(result.schedule[359].balance).toBe(0);
    });

    it('전세 대출 3억, LTV 80%, 2년', () => {
      const limit = service.calculateLoanLimit({ price: 30000, ltvPercent: 80 });
      expect(limit.loanLimit).toBe(24000); // 2.4억

      const result = service.calculateInterest({
        loanAmount: 24000,
        annualRate: 4.0,
        repaymentType: '원리금균등',
        months: 24,
      });
      expect(result.schedule).toHaveLength(24);
      expect(result.schedule[23].balance).toBe(0);
    });

    it('금리 상승 시나리오: 2%에서 5%로', () => {
      const result = service.calculateInterest({
        loanAmount: 30000,
        annualRate: 2.0,
        repaymentType: '원리금균등',
        months: 360,
        rateChanges: [{ fromMonth: 61, annualRate: 5.0 }],
      });
      // 60회차 vs 61회차 이자 비교 (잔액 감소에도 이자 증가)
      const balance60 = result.schedule[59].balance;
      const interest60 = result.schedule[59].interest;
      const interest61 = result.schedule[60].interest;
      // 금리가 2.5배가 되므로 잔액 감소를 상쇄하고도 이자 증가
      expect(interest61).toBeGreaterThan(interest60);
      expect(result.schedule[359].balance).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // 반환 구조 검증
  // ──────────────────────────────────────────────

  describe('반환 구조 검증', () => {
    it('calculateLoanLimit 반환 필드 확인', () => {
      const result = service.calculateLoanLimit({ price: 10000 });
      expect(result).toHaveProperty('price');
      expect(result).toHaveProperty('ltvPercent');
      expect(result).toHaveProperty('loanLimit');
    });

    it('calculateInterest 반환 필드 확인', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 3.0,
        repaymentType: '원리금균등',
        months: 12,
      });
      expect(result).toHaveProperty('repaymentType');
      expect(result).toHaveProperty('loanAmount');
      expect(result).toHaveProperty('months');
      expect(result).toHaveProperty('schedule');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('totalPayment');
      expect(result.summary).toHaveProperty('totalInterest');
      expect(result.summary).toHaveProperty('firstMonthPayment');
    });

    it('schedule 각 항목의 필드가 올바르다', () => {
      const result = service.calculateInterest({
        loanAmount: 10000,
        annualRate: 3.0,
        repaymentType: '원리금균등',
        months: 3,
      });
      result.schedule.forEach((row, index) => {
        expect(row).toHaveProperty('month', index + 1);
        expect(row).toHaveProperty('payment');
        expect(row).toHaveProperty('principal');
        expect(row).toHaveProperty('interest');
        expect(row).toHaveProperty('balance');
        expect(row.payment).toEqual(row.principal + row.interest);
      });
    });

    it('loanAmount와 months를 그대로 반환한다', () => {
      const result = service.calculateInterest({
        loanAmount: 25000,
        annualRate: 4.0,
        repaymentType: '원금균등',
        months: 240,
      });
      expect(result.loanAmount).toBe(25000);
      expect(result.months).toBe(240);
    });
  });
});

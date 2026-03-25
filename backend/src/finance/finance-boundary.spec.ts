import { FinanceService } from './finance.service';

describe('FinanceService — 경계값 테스트', () => {
  let service: FinanceService;

  beforeEach(() => {
    service = new FinanceService();
  });

  // ──────────────────────────────────────────────
  // 대출 한도 경계값
  // ──────────────────────────────────────────────

  describe('calculateLoanLimit 경계값', () => {
    it('음수 가격 입력 시 음수 대출 한도를 반환한다', () => {
      const result = service.calculateLoanLimit({ price: -10000 });
      expect(result.loanLimit).toBeLessThanOrEqual(0);
    });

    it('매우 큰 가격(100억)도 정상 계산한다', () => {
      const result = service.calculateLoanLimit({ price: 10000000, ltvPercent: 70 });
      expect(result.loanLimit).toBe(7000000);
    });

    it('LTV 소수점(33.33%)이 정확히 floor 처리된다', () => {
      const result = service.calculateLoanLimit({ price: 100000, ltvPercent: 33.33 });
      expect(result.loanLimit).toBe(Math.floor(100000 * 0.3333));
    });

    it('가격 1만원(최소 단위)에서 정상 동작한다', () => {
      const result = service.calculateLoanLimit({ price: 1, ltvPercent: 50 });
      expect(result.loanLimit).toBe(0); // floor(0.5) = 0
    });
  });

  // ──────────────────────────────────────────────
  // 이자 계산 경계값
  // ──────────────────────────────────────────────

  describe('calculateInterest 경계값', () => {
    it('대출금액 0일 때 모든 값이 0이다', () => {
      const result = service.calculateInterest({
        loanAmount: 0,
        annualRate: 3.5,
        repaymentType: '원리금균등',
        months: 12,
      });
      expect(result.summary.totalPayment).toBe(0);
      expect(result.summary.totalInterest).toBe(0);
      expect(result.summary.firstMonthPayment).toBe(0);
    });

    it('1개월 상환 시 이자가 1달치만 발생한다', () => {
      const result = service.calculateInterest({
        loanAmount: 100000,
        annualRate: 12,
        repaymentType: '원리금균등',
        months: 1,
      });
      // 월 이자율 1%, 1개월: 원금 100000 + 이자 1000 = 101000
      expect(result.schedule).toHaveLength(1);
      expect(result.schedule[0].balance).toBe(0);
      expect(result.summary.totalInterest).toBe(1000);
    });

    it('금리 0%일 때 원리금균등 이자가 0이다', () => {
      const result = service.calculateInterest({
        loanAmount: 120000,
        annualRate: 0,
        repaymentType: '원리금균등',
        months: 12,
      });
      expect(result.summary.totalInterest).toBe(0);
      expect(result.schedule[0].payment).toBe(10000);
    });

    it('금리 0%일 때 원금균등 이자가 0이다', () => {
      const result = service.calculateInterest({
        loanAmount: 120000,
        annualRate: 0,
        repaymentType: '원금균등',
        months: 12,
      });
      expect(result.summary.totalInterest).toBe(0);
    });

    it('매우 높은 금리(50%)에서도 잔액이 0으로 수렴한다', () => {
      const result = service.calculateInterest({
        loanAmount: 50000,
        annualRate: 50,
        repaymentType: '원리금균등',
        months: 60,
      });
      const lastEntry = result.schedule[result.schedule.length - 1];
      expect(lastEntry.balance).toBe(0);
    });

    it('장기 대출(600개월=50년)도 정상 처리한다', () => {
      const result = service.calculateInterest({
        loanAmount: 100000,
        annualRate: 3,
        repaymentType: '원금균등',
        months: 600,
      });
      expect(result.schedule).toHaveLength(600);
      const lastEntry = result.schedule[result.schedule.length - 1];
      expect(lastEntry.balance).toBe(0);
    });

    it('대출금액 1만원(최소)에서 정상 동작한다', () => {
      const result = service.calculateInterest({
        loanAmount: 1,
        annualRate: 3.5,
        repaymentType: '원리금균등',
        months: 12,
      });
      expect(result.schedule).toHaveLength(12);
    });

    it('변동금리 첫 달부터 변경 시 정상 적용된다', () => {
      const result = service.calculateInterest({
        loanAmount: 100000,
        annualRate: 3,
        repaymentType: '원리금균등',
        months: 12,
        rateChanges: [{ fromMonth: 1, annualRate: 5 }],
      });
      // 첫 달부터 5%가 적용되므로 월 이자가 3%일 때보다 높아야 함
      const resultNoChange = service.calculateInterest({
        loanAmount: 100000,
        annualRate: 3,
        repaymentType: '원리금균등',
        months: 12,
      });
      expect(result.summary.totalInterest).toBeGreaterThan(resultNoChange.summary.totalInterest);
    });

    it('원금균등 매월 상환금이 감소한다', () => {
      const result = service.calculateInterest({
        loanAmount: 100000,
        annualRate: 5,
        repaymentType: '원금균등',
        months: 24,
      });
      for (let i = 1; i < result.schedule.length; i++) {
        expect(result.schedule[i].payment).toBeLessThanOrEqual(result.schedule[i - 1].payment);
      }
    });
  });
});

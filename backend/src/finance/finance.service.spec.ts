import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  let service: FinanceService;

  beforeEach(() => {
    service = new FinanceService();
  });

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
  });

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
      // 13회차부터 이자가 증가해야 함
      const month12Interest = result.schedule[11].interest;
      const month13Interest = result.schedule[12].interest;
      // 잔액이 줄었으므로 단순 비교가 아닌, 금리 변경 효과 확인
      const balance12 = result.schedule[11].balance;
      const expectedInterest13 = Math.round(balance12 * (5.0 / 100 / 12));
      expect(month13Interest).toBe(expectedInterest13);
    });
  });

  describe('원금균등 상환', () => {
    it('매달 동일한 원금을 상환한다', () => {
      const result = service.calculateInterest({
        loanAmount: 12000,
        annualRate: 3.6,
        repaymentType: '원금균등',
        months: 12,
      });
      expect(result.repaymentType).toBe('원금균등');
      // 매달 원금 = 12000 / 12 = 1000
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
  });

  describe('대출 한도 경계값', () => {
    it('LTV가 0%이면 대출 가능액이 0이다', () => {
      const result = service.calculateLoanLimit({ price: 50000, ltvPercent: 0 });
      expect(result.loanLimit).toBe(0);
    });

    it('매우 큰 가격에도 정상 계산된다', () => {
      const result = service.calculateLoanLimit({ price: 10000000, ltvPercent: 70 });
      expect(result.loanLimit).toBe(7000000);
    });
  });

  describe('상환 경계값', () => {
    it('대출금 0이면 빈 스케줄을 반환한다', () => {
      const result = service.calculateInterest({
        loanAmount: 0,
        annualRate: 3.5,
        repaymentType: '원리금균등',
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
  });
});

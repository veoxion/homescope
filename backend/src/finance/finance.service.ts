import { Injectable } from '@nestjs/common';
import { LoanLimitDto, InterestDto } from './dto/finance.dto';

@Injectable()
export class FinanceService {
  calculateLoanLimit(dto: LoanLimitDto) {
    const ltv = (dto.ltvPercent ?? 70) / 100;
    const loanLimit = Math.floor(dto.price * ltv);
    return {
      price: dto.price,
      ltvPercent: dto.ltvPercent ?? 70,
      loanLimit,
    };
  }

  calculateInterest(dto: InterestDto) {
    const { loanAmount, annualRate, repaymentType, months, rateChanges } = dto;

    if (repaymentType === '원리금균등') {
      return this.calcEqualPayment(loanAmount, annualRate, months, rateChanges);
    } else {
      return this.calcEqualPrincipal(
        loanAmount,
        annualRate,
        months,
        rateChanges,
      );
    }
  }

  private calcEqualPayment(
    principal: number,
    annualRate: number,
    months: number,
    rateChanges?: InterestDto['rateChanges'],
  ) {
    const schedule: Array<{
      month: number;
      payment: number;
      principal: number;
      interest: number;
      balance: number;
    }> = [];

    let balance = principal;
    let currentRate = annualRate;

    for (let m = 1; m <= months; m++) {
      if (rateChanges) {
        const change = rateChanges.find((r) => r.fromMonth === m);
        if (change) currentRate = change.annualRate;
      }

      const monthlyRate = currentRate / 100 / 12;
      const remaining = months - m + 1;

      let payment: number;
      let interestPart: number;
      let principalPart: number;

      if (monthlyRate === 0) {
        payment = balance / remaining;
        interestPart = 0;
        principalPart = payment;
      } else {
        payment =
          (balance * monthlyRate * Math.pow(1 + monthlyRate, remaining)) /
          (Math.pow(1 + monthlyRate, remaining) - 1);
        interestPart = balance * monthlyRate;
        principalPart = payment - interestPart;
      }

      balance -= principalPart;
      schedule.push({
        month: m,
        payment: Math.round(payment),
        principal: Math.round(principalPart),
        interest: Math.round(interestPart),
        balance: Math.max(0, Math.round(balance)),
      });
    }

    const totalPayment = schedule.reduce((s, r) => s + r.payment, 0);
    const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);

    return {
      repaymentType: '원리금균등',
      loanAmount: principal,
      months,
      schedule,
      summary: {
        totalPayment: Math.round(totalPayment),
        totalInterest: Math.round(totalInterest),
        firstMonthPayment: schedule[0]?.payment ?? 0,
      },
    };
  }

  private calcEqualPrincipal(
    principal: number,
    annualRate: number,
    months: number,
    rateChanges?: InterestDto['rateChanges'],
  ) {
    const principalPerMonth = principal / months;
    const schedule: Array<{
      month: number;
      payment: number;
      principal: number;
      interest: number;
      balance: number;
    }> = [];

    let balance = principal;
    let currentRate = annualRate;

    for (let m = 1; m <= months; m++) {
      if (rateChanges) {
        const change = rateChanges.find((r) => r.fromMonth === m);
        if (change) currentRate = change.annualRate;
      }

      const monthlyRate = currentRate / 100 / 12;
      const interestPart = balance * monthlyRate;
      const payment = principalPerMonth + interestPart;
      balance -= principalPerMonth;

      schedule.push({
        month: m,
        payment: Math.round(payment),
        principal: Math.round(principalPerMonth),
        interest: Math.round(interestPart),
        balance: Math.max(0, Math.round(balance)),
      });
    }

    const totalPayment = schedule.reduce((s, r) => s + r.payment, 0);
    const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);

    return {
      repaymentType: '원금균등',
      loanAmount: principal,
      months,
      schedule,
      summary: {
        totalPayment: Math.round(totalPayment),
        totalInterest: Math.round(totalInterest),
        firstMonthPayment: schedule[0]?.payment ?? 0,
      },
    };
  }
}

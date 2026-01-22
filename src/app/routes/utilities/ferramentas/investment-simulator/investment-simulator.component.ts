import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-investment-simulator',
  templateUrl: './investment-simulator.component.html',
  styleUrls: ['./investment-simulator.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    TranslateModule
  ]
})
export class InvestmentSimulatorComponent implements OnInit {
  investmentType = '';
  initialAmountRF = '';
  monthlyContributionRF = '';
  interestRateRF = '';
  timeRF = 1;
  timeUnitRF = 'months';
  initialAmountRV = '';
  monthlyContributionRV = '';
  expectedReturnRV = '';
  dividendYieldRV = '';
  timeRV = 1;
  timeUnitRV = 'years';
  results: any = null;
  showResults = false;

  constructor() {}

  ngOnInit(): void {}

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  unformatCurrency(text: string): number {
    if (!text) return 0;
    return parseFloat(text.replace(/[R$\s.]/g, '').replace(',', '.'));
  }

  unformatPercentage(text: string): number {
    if (!text) return 0;
    return parseFloat(text.replace(',', '.')) / 100;
  }

  updateTimeRF(): void {
    const unit = this.timeUnitRF;
    const timeElement = document.getElementById('timeValueRF');
    const unitElement = document.getElementById('timeUnitRF');
    if (timeElement && unitElement) {
      timeElement.textContent = this.timeRF.toString();
      unitElement.textContent = unit === 'years' ? (this.timeRF === 1 ? 'ano' : 'anos') : (this.timeRF === 1 ? 'mês' : 'meses');
    }
  }

  updateTimeRV(): void {
    const unit = this.timeUnitRV;
    const timeElement = document.getElementById('timeValueRV');
    const unitElement = document.getElementById('timeUnitRV');
    if (timeElement && unitElement) {
      timeElement.textContent = this.timeRV.toString();
      unitElement.textContent = unit === 'years' ? (this.timeRV === 1 ? 'ano' : 'anos') : (this.timeRV === 1 ? 'mês' : 'meses');
    }
  }

  onInvestmentTypeChange(): void {
    this.showResults = false;
    this.results = null;
  }

  onSubmit(): void {
    if (!this.investmentType) {
      alert('Por favor, selecione um tipo de investimento.');
      return;
    }

    let totalInvested: number, totalReturn: number, grossTotal: number, netTotal: number, totalDividends = 0;
    let totalTimeInMonths: number;

    if (this.investmentType === 'rendaFixa') {
      const initialAmount = this.unformatCurrency(this.initialAmountRF);
      const monthlyContribution = this.unformatCurrency(this.monthlyContributionRF);
      const interestRate = this.unformatPercentage(this.interestRateRF);
      const time = this.timeRF;
      const timeUnit = this.timeUnitRF;

      totalTimeInMonths = timeUnit === 'years' ? time * 12 : time;
      const monthlyInterestRate = (1 + interestRate) ** (1 / 12) - 1;

      totalInvested = initialAmount + (monthlyContribution * totalTimeInMonths);
      let futureValue = initialAmount * (1 + monthlyInterestRate) ** totalTimeInMonths;
      if (monthlyContribution > 0) {
        const fvAnnuity = monthlyContribution * (((1 + monthlyInterestRate) ** totalTimeInMonths - 1) / monthlyInterestRate);
        futureValue += fvAnnuity;
      }

      grossTotal = futureValue;
      totalReturn = grossTotal - totalInvested;
      const taxRate = 0.15;
      const netReturn = totalReturn * (1 - taxRate);
      netTotal = totalInvested + netReturn;
    } else {
      const initialAmount = this.unformatCurrency(this.initialAmountRV);
      const monthlyContribution = this.unformatCurrency(this.monthlyContributionRV);
      const expectedReturn = this.unformatPercentage(this.expectedReturnRV);
      const dividendYield = this.unformatPercentage(this.dividendYieldRV);
      const time = this.timeRV;
      const timeUnit = this.timeUnitRV;

      totalTimeInMonths = timeUnit === 'years' ? time * 12 : time;
      totalInvested = initialAmount + (monthlyContribution * totalTimeInMonths);
      let currentCapital = initialAmount;
      totalDividends = 0;
      const monthlyExpectedReturn = (1 + expectedReturn) ** (1 / 12) - 1;
      const monthlyDividendRate = (1 + dividendYield) ** (1 / 12) - 1;

      for (let i = 0; i < totalTimeInMonths; i++) {
        currentCapital += monthlyContribution;
        const dividends = currentCapital * monthlyDividendRate;
        totalDividends += dividends;
        currentCapital += dividends;
        currentCapital *= (1 + monthlyExpectedReturn);
      }

      grossTotal = currentCapital;
      totalReturn = grossTotal - totalInvested;
      netTotal = grossTotal;
    }

    this.results = {
      totalInvested: this.formatCurrency(totalInvested!),
      totalReturn: this.formatCurrency(totalReturn!),
      totalDividends: this.formatCurrency(totalDividends),
      grossTotal: this.formatCurrency(grossTotal!),
      netTotal: this.formatCurrency(netTotal!),
      showDividends: this.investmentType === 'rendaVariavel',
      showNetTotal: this.investmentType === 'rendaFixa'
    };
    this.showResults = true;
  }
}

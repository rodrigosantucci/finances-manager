import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FormatService } from './format.service';
import { PageHeaderComponent } from '@shared';

@Component({
  selector: 'app-ferramentas',
  templateUrl: './ferramentas.component.html',
  styleUrls: ['./ferramentas.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatTabsModule, MatCardModule, PageHeaderComponent]
})
export class UtilitiesFerramentasComponent implements AfterViewInit {
  constructor(private formatService: FormatService) {
    Chart.register(...registerables, ChartDataLabels);
  }

  // Allocation Calculator
  @ViewChild('allocationChart') allocationChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('resultsChart') resultsChartCanvas!: ElementRef<HTMLCanvasElement>;
  totalAmount: string = '';
  sliders = { stocks: 25, funds: 25, treasury: 25, intl: 25 };
  stocksSubInputs = { blueChips: '33.33', smallCaps: '33.33', growth: '33.34' };
  fundsSubInputs = { fiis: '33.33', stocks: '33.33', multi: '33.34' };
  treasurySubInputs = { selic: '33.33', ipca: '33.33', prefixed: '33.34' };
  intlSubInputs = { etfs: '33.33', stocks: '33.33', funds: '33.34' };
  amounts = {
    stocks: 0, stocksBlueChips: 0, stocksSmallCaps: 0, stocksGrowth: 0,
    funds: 0, fundsFIIs: 0, fundsStocks: 0, fundsMulti: 0,
    treasury: 0, treasurySelic: 0, treasuryIpca: 0, treasuryPrefixed: 0,
    intl: 0, intlEtfs: 0, intlStocks: 0, intlFunds: 0
  };
  totalStocks: number = 100;
  totalFunds: number = 100;
  totalTreasury: number = 100;
  totalIntl: number = 100;
  mainCategoryValid: boolean = true;
  stocksValid: boolean = true;
  fundsValid: boolean = true;
  treasuryValid: boolean = true;
  intlValid: boolean = true;
  showResultsAllocation: boolean = false;
  private allocationChart: Chart | null = null;
  private resultsChart: Chart | null = null;

  // Investment Simulator
  investmentType: string = '';
  initialAmountRF: string = '';
  monthlyContributionRF: string = '';
  interestRateRF: string = '';
  timeRF: number = 1;
  timeUnitSelectorRF: string = 'months';
  timeUnitRF: string = 'mês';
  initialAmountRV: string = '';
  monthlyContributionRV: string = '';
  expectedReturnRV: string = '';
  dividendYieldRV: string = '';
  timeRV: number = 1;
  timeUnitSelectorRV: string = 'years';
  timeUnitRV: string = 'ano';
  showResultsInvestment: boolean = false;
  totalInvested: number = 0;
  totalReturn: number = 0;
  totalDividends: number = 0;
  grossTotal: number = 0;
  netTotal: number = 0;

  // Ceiling Price Calculator
  @ViewChild('priceChart') priceChartCanvas!: ElementRef<HTMLCanvasElement>;
  ticker: string = '';
  dividends: string = '';
  eps: string = '';
  growthRate: string = '';
  payout: string = '';
  marketPrice: string = '';
  ceilingPrice: number = 0;
  marginSafety: number = 0;
  status: string = 'N/A';
  showResultsCeilingPrice: boolean = false;
  private priceChart: Chart | null = null;

  ngAfterViewInit() {
    this.updateAllocationChart();
    if (!this.priceChartCanvas) {
      console.error('Price chart canvas not found');
    }
  }

  // Shared Formatting Methods (via FormatService)
  formatCurrency(event: Event): void {
    this.formatService.formatCurrency(event);
  }

  formatInput(event: Event): void {
    this.formatService.formatInput(event);
  }

  formatPercentageInput(event: Event, isCeilingPrice: boolean = false): void {
    this.formatService.formatPercentageInput(event, isCeilingPrice);
  }

  formatPercentageBlur(event: Event, isCeilingPrice: boolean = false): void {
    this.formatService.formatPercentageBlur(event, isCeilingPrice);
  }

  unformatCurrency(text: string): number {
    return this.formatService.unformatCurrency(text);
  }

  unformatPercentage(text: string, isCeilingPrice: boolean = false): number {
    return this.formatService.unformatPercentage(text, isCeilingPrice);
  }

  // Allocation Calculator Methods
  handleSliderInput(category: string): void {
    const sliders = Object.values(this.sliders);
    const total = sliders.reduce((sum, val) => sum + val, 0);
    if (total !== 100) {
      const diff = 100 - total;
      const otherSliders = Object.keys(this.sliders).filter(key => key !== category);
      const adjustment = diff / (otherSliders.length || 1);
      otherSliders.forEach(key => {
        this.sliders[key as keyof typeof this.sliders] = Math.max(0, Math.min(100, this.sliders[key as keyof typeof this.sliders] + adjustment));
      });
    }
    this.mainCategoryValid = Math.abs(total - 100) < 0.01;
    this.updateAllocationChart();
  }

  updateSubcategoryTotals(): void {
    this.totalStocks = this.unformatPercentage(this.stocksSubInputs.blueChips) +
                       this.unformatPercentage(this.stocksSubInputs.smallCaps) +
                       this.unformatPercentage(this.stocksSubInputs.growth);
    this.stocksValid = Math.abs(this.totalStocks - 100) < 0.01;

    this.totalFunds = this.unformatPercentage(this.fundsSubInputs.fiis) +
                      this.unformatPercentage(this.fundsSubInputs.stocks) +
                      this.unformatPercentage(this.fundsSubInputs.multi);
    this.fundsValid = Math.abs(this.totalFunds - 100) < 0.01;

    this.totalTreasury = this.unformatPercentage(this.treasurySubInputs.selic) +
                         this.unformatPercentage(this.treasurySubInputs.ipca) +
                         this.unformatPercentage(this.treasurySubInputs.prefixed);
    this.treasuryValid = Math.abs(this.totalTreasury - 100) < 0.01;

    this.totalIntl = this.unformatPercentage(this.intlSubInputs.etfs) +
                     this.unformatPercentage(this.intlSubInputs.stocks) +
                     this.unformatPercentage(this.intlSubInputs.funds);
    this.intlValid = Math.abs(this.totalIntl - 100) < 0.01;
  }

  get isFormValid(): boolean {
    return this.mainCategoryValid && this.stocksValid && this.fundsValid && this.treasuryValid && this.intlValid && !!this.totalAmount;
  }

  updateAllocationChart(): void {
    if (this.allocationChart) this.allocationChart.destroy();
    const ctx = this.allocationChartCanvas?.nativeElement.getContext('2d');
    if (ctx) {
      const config: ChartConfiguration = {
        type: 'pie',
        data: {
          labels: ['Ações', 'Fundos', 'Títulos Públicos', 'Assets Internacionais'],
          datasets: [{
            data: [this.sliders.stocks, this.sliders.funds, this.sliders.treasury, this.sliders.intl],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            datalabels: {
              color: '#fff',
              formatter: (value: number) => `${value.toFixed(2)}%`,
              font: { size: 12, weight: 'bold' }
            },
            legend: { position: 'bottom', labels: { font: { size: 10 } } },
            tooltip: { enabled: true }
          }
        }
      };
      this.allocationChart = new Chart(ctx, config);
    }
  }

  onSubmitAllocation(): void {
    if (!this.isFormValid) {
      alert('Por favor, corrija os erros no formulário antes de calcular.');
      return;
    }

    const totalAmount = this.unformatCurrency(this.totalAmount);
    this.amounts.stocks = (this.sliders.stocks / 100) * totalAmount;
    this.amounts.stocksBlueChips = (this.unformatPercentage(this.stocksSubInputs.blueChips) / 100) * this.amounts.stocks;
    this.amounts.stocksSmallCaps = (this.unformatPercentage(this.stocksSubInputs.smallCaps) / 100) * this.amounts.stocks;
    this.amounts.stocksGrowth = (this.unformatPercentage(this.stocksSubInputs.growth) / 100) * this.amounts.stocks;

    this.amounts.funds = (this.sliders.funds / 100) * totalAmount;
    this.amounts.fundsFIIs = (this.unformatPercentage(this.fundsSubInputs.fiis) / 100) * this.amounts.funds;
    this.amounts.fundsStocks = (this.unformatPercentage(this.fundsSubInputs.stocks) / 100) * this.amounts.funds;
    this.amounts.fundsMulti = (this.unformatPercentage(this.fundsSubInputs.multi) / 100) * this.amounts.funds;

    this.amounts.treasury = (this.sliders.treasury / 100) * totalAmount;
    this.amounts.treasurySelic = (this.unformatPercentage(this.treasurySubInputs.selic) / 100) * this.amounts.treasury;
    this.amounts.treasuryIpca = (this.unformatPercentage(this.treasurySubInputs.ipca) / 100) * this.amounts.treasury;
    this.amounts.treasuryPrefixed = (this.unformatPercentage(this.treasurySubInputs.prefixed) / 100) * this.amounts.treasury;

    this.amounts.intl = (this.sliders.intl / 100) * totalAmount;
    this.amounts.intlEtfs = (this.unformatPercentage(this.intlSubInputs.etfs) / 100) * this.amounts.intl;
    this.amounts.intlStocks = (this.unformatPercentage(this.intlSubInputs.stocks) / 100) * this.amounts.intl;
    this.amounts.intlFunds = (this.unformatPercentage(this.intlSubInputs.funds) / 100) * this.amounts.intl;

    if (this.resultsChart) this.resultsChart.destroy();
    const ctx = this.resultsChartCanvas?.nativeElement.getContext('2d');
    if (ctx) {
      const config: ChartConfiguration = {
        type: 'pie',
        data: {
          labels: [
            'Ações: Blue Chips', 'Ações: Small Caps', 'Ações: Crescimento',
            'Fundos: FIIs', 'Fundos: Ações', 'Fundos: Multimercado',
            'Títulos: Selic', 'Títulos: IPCA+', 'Títulos: Prefixado',
            'Internacional: ETFs', 'Internacional: Ações', 'Internacional: Fundos'
          ],
          datasets: [{
            data: [
              this.amounts.stocksBlueChips, this.amounts.stocksSmallCaps, this.amounts.stocksGrowth,
              this.amounts.fundsFIIs, this.amounts.fundsStocks, this.amounts.fundsMulti,
              this.amounts.treasurySelic, this.amounts.treasuryIpca, this.amounts.treasuryPrefixed,
              this.amounts.intlEtfs, this.amounts.intlStocks, this.amounts.intlFunds
            ],
            backgroundColor: [
              '#FF6384', '#FF8C94', '#FFA1A9',
              '#36A2EB', '#4AB0F3', '#5EB9F7',
              '#FFCE56', '#FFD76B', '#FFE080',
              '#4BC0C0', '#5FCCCC', '#73D8D8'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            datalabels: {
              color: '#fff',
              formatter: (value: number) => value > 0 ? `${(value / totalAmount * 100).toFixed(2)}%` : '',
              font: { size: 10, weight: 'bold' }
            },
            legend: { position: 'bottom', labels: { font: { size: 8 } } },
            tooltip: {
              callbacks: {
                label: (context) => `${context.label}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed)}`
              }
            }
          }
        }
      };
      this.resultsChart = new Chart(ctx, config);
    }
    this.showResultsAllocation = true;
  }

  // Investment Simulator Methods
  updateTimeSliderRF(): void {
    const unit = this.timeUnitSelectorRF;
    let currentValueInMonths = this.timeRF;
    if (unit === 'months') {
      if (this.timeUnitRF.includes('ano')) {
        currentValueInMonths = this.timeRF * 12;
      }
      this.timeRF = Math.min(currentValueInMonths, 600);
      this.timeUnitRF = this.timeRF === 1 ? 'mês' : 'meses';
    } else {
      if (this.timeUnitRF.includes('mês')) {
        currentValueInMonths = this.timeRF;
      }
      this.timeRF = Math.min(Math.max(1, Math.round(currentValueInMonths / 12)), 50);
      this.timeUnitRF = this.timeRF === 1 ? 'ano' : 'anos';
    }
  }

  updateTimeRF(): void {
    const unit = this.timeUnitSelectorRF;
    const value = this.timeRF;
    this.timeUnitRF = unit === 'years' ? (value === 1 ? 'ano' : 'anos') : (value === 1 ? 'mês' : 'meses');
  }

  updateTimeSliderRV(): void {
    const unit = this.timeUnitSelectorRV;
    let currentValueInMonths = this.timeRV;
    if (unit === 'months') {
      if (this.timeUnitRV.includes('ano')) {
        currentValueInMonths = this.timeRV * 12;
      }
      this.timeRV = Math.min(currentValueInMonths, 600);
      this.timeUnitRV = this.timeRV === 1 ? 'mês' : 'meses';
    } else {
      if (this.timeUnitRV.includes('mês')) {
        currentValueInMonths = this.timeRV;
      }
      this.timeRV = Math.min(Math.max(1, Math.round(currentValueInMonths / 12)), 50);
      this.timeUnitRV = this.timeRV === 1 ? 'ano' : 'anos';
    }
  }

  updateTimeRV(): void {
    const unit = this.timeUnitSelectorRV;
    const value = this.timeRV;
    this.timeUnitRV = unit === 'years' ? (value === 1 ? 'ano' : 'anos') : (value === 1 ? 'mês' : 'meses');
  }

  toggleFields(): void {
    this.showResultsInvestment = false;
    if (this.investmentType === 'rendaFixa') {
      this.updateTimeSliderRF();
    } else if (this.investmentType === 'rendaVariavel') {
      this.updateTimeSliderRV();
    }
  }

  onSubmitInvestment(): void {
    if (!this.investmentType) {
      alert('Por favor, selecione um tipo de investimento (Renda Fixa ou Renda Variável) para simular.');
      return;
    }

    let initialAmount: number, monthlyContribution: number, time: number, interestRate: number, expectedReturn: number, dividendYield: number;
    let totalTimeInMonths: number;

    if (this.investmentType === 'rendaFixa') {
      initialAmount = this.unformatCurrency(this.initialAmountRF);
      monthlyContribution = this.unformatCurrency(this.monthlyContributionRF);
      interestRate = this.unformatPercentage(this.interestRateRF) / 100;
      time = this.timeRF;
      const timeUnit = this.timeUnitSelectorRF;
      totalTimeInMonths = timeUnit === 'years' ? time * 12 : time;

      const monthlyInterestRate = (1 + interestRate) ** (1 / 12) - 1;
      this.totalInvested = initialAmount + (monthlyContribution * totalTimeInMonths);
      let futureValue = initialAmount * (1 + monthlyInterestRate) ** totalTimeInMonths;
      if (monthlyContribution > 0) {
        const fvAnnuity = monthlyContribution * (((1 + monthlyInterestRate) ** totalTimeInMonths - 1) / monthlyInterestRate);
        futureValue += fvAnnuity;
      }
      this.grossTotal = futureValue;
      this.totalReturn = this.grossTotal - this.totalInvested;
      const taxRate = 0.15;
      const netReturn = this.totalReturn * (1 - taxRate);
      this.netTotal = this.totalInvested + netReturn;
      this.totalDividends = 0;
    } else if (this.investmentType === 'rendaVariavel') {
      initialAmount = this.unformatCurrency(this.initialAmountRV);
      monthlyContribution = this.unformatCurrency(this.monthlyContributionRV);
      expectedReturn = this.unformatPercentage(this.expectedReturnRV) / 100;
      dividendYield = this.unformatPercentage(this.dividendYieldRV) / 100;
      time = this.timeRV;
      const timeUnit = this.timeUnitSelectorRV;
      totalTimeInMonths = timeUnit === 'years' ? time * 12 : time;

      let currentCapital = initialAmount;
      this.totalDividends = 0;
      const monthlyExpectedReturn = (1 + expectedReturn) ** (1 / 12) - 1;
      const monthlyDividendRate = (1 + dividendYield) ** (1 / 12) - 1;
      for (let i = 0; i < totalTimeInMonths; i++) {
        currentCapital += monthlyContribution;
        const dividends = currentCapital * monthlyDividendRate;
        this.totalDividends += dividends;
        currentCapital += dividends;
        currentCapital *= (1 + monthlyExpectedReturn);
      }
      this.grossTotal = currentCapital;
      this.totalInvested = initialAmount + (monthlyContribution * totalTimeInMonths);
      this.totalReturn = this.grossTotal - this.totalInvested;
      this.netTotal = this.grossTotal;
    }
    this.showResultsInvestment = true;
  }

  // Ceiling Price Calculator Methods
  onSubmitCeilingPrice(): void {
    try {
      const ticker = this.ticker.toUpperCase();
      const dividends = this.unformatCurrency(this.dividends);
      const eps = this.unformatCurrency(this.eps);
      const growthRate = this.unformatPercentage(this.growthRate, true);
      const payout = this.unformatPercentage(this.payout, true);
      const marketPrice = this.unformatCurrency(this.marketPrice);

      const expectedDividends = eps * payout * (1 + growthRate);
      this.ceilingPrice = expectedDividends / 0.06;
      this.marginSafety = ((this.ceilingPrice - marketPrice) / marketPrice) * 100;
      this.status = marketPrice <= this.ceilingPrice ? 'Ação Subvalorizada' : 'Ação Sobrevalorizada';

      if (this.priceChart) this.priceChart.destroy();
      const ctx = this.priceChartCanvas?.nativeElement.getContext('2d');
      if (ctx) {
        this.priceChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Dividendos Históricos', 'EPS', 'Preço Teto', 'Preço de Mercado'],
            datasets: [{
              label: 'Valores (R$)',
              data: [dividends, eps, this.ceilingPrice, marketPrice],
              backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
              borderColor: '#fff',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true, title: { display: true, text: 'Valor (R$)', font: { size: 10 } } },
              x: { ticks: { font: { size: 8 } } }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.label}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y)}`
                }
              }
            }
          }
        });
      }
      this.showResultsCeilingPrice = true;
    } catch (e) {
      console.error('Error during form submission:', e);
    }
  }

  // Shared Download Methods
  downloadPng(tab: string): void {
    const resultsSection = document.querySelector(`#${tab} .results-section`) as HTMLElement;
    if (resultsSection) {
      html2canvas(resultsSection, { scale: 2 } as any).then(canvas => {
        const link = document.createElement('a');
        link.download = tab === 'ceilingPrice' ? `preco_teto_${this.ticker.toUpperCase() || 'acao'}.png` : 'distribuicao_aporte.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }).catch(e => console.error('Error downloading PNG:', e));
    }
  }

  downloadPdf(tab: string): void {
    const resultsSection = document.querySelector(`#${tab} .results-section`) as HTMLElement;
    if (resultsSection) {
      html2canvas(resultsSection, { scale: 2 } as any).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        pdf.save(tab === 'ceilingPrice' ? `preco_teto_${this.ticker.toUpperCase() || 'acao'}.pdf` : 'distribuicao_aporte.pdf');
      }).catch(e => console.error('Error downloading PDF:', e));
    }
  }
}

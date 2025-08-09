import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-ceiling-price-calculator',
  templateUrl: './ceiling-price-calculator.component.html',
  styleUrls: ['./ceiling-price-calculator.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule
  ]
})
export class CeilingPriceCalculatorComponent implements OnInit, AfterViewInit {
  ticker: string = '';
  dividends: string = '';
  eps: string = '';
  growthRate: string = '';
  payout: string = '';
  marketPrice: string = '';
  results: any = null;
  showResults: boolean = false;
  priceChart: Chart<'bar', number[], string> | null = null;

  constructor() {
    Chart.register(...registerables); // Register Chart.js globally
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {}

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  unformatCurrency(text: string): number {
    if (!text) return 0;
    return parseFloat(text.replace(/[R$\s.]/g, '').replace(',', '.'));
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`; // Fixed to handle 2 decimal places
  }

  unformatPercentage(text: string): number {
    if (!text) return 0;
    return parseFloat(text.replace('%', '')) / 100;
  }

  onSubmit(): void {
    const ticker = this.ticker.toUpperCase();
    const dividends = this.unformatCurrency(this.dividends);
    const eps = this.unformatCurrency(this.eps);
    const growthRate = this.unformatPercentage(this.growthRate);
    const payout = this.unformatPercentage(this.payout);
    const marketPrice = this.unformatCurrency(this.marketPrice);

    const expectedDividends = eps * payout * (1 + growthRate);
    const ceilingPrice = expectedDividends / 0.06;
    const marginSafety = ((ceilingPrice - marketPrice) / marketPrice) * 100;
    const status = marketPrice <= ceilingPrice ? 'Ação Subvalorizada' : 'Ação Sobrevalorizada';

    this.results = {
      ceilingPrice: this.formatCurrency(ceilingPrice),
      marginSafety: this.formatPercentage(marginSafety),
      status
    };
    this.showResults = true;

    // Initialize chart after results are calculated
    setTimeout(() => this.initPriceChart(), 0); // Delay to ensure DOM update
  }

  initPriceChart(): void {
    if (this.priceChart) this.priceChart.destroy();
    const ctx = (document.getElementById('priceChart') as HTMLCanvasElement)?.getContext('2d');
    if (!ctx) {
      console.error('Canvas element for priceChart not found');
      return;
    }
    const dividends = this.unformatCurrency(this.dividends);
    const eps = this.unformatCurrency(this.eps);
    const ceilingPrice = this.unformatCurrency(this.results.ceilingPrice);
    const marketPrice = this.unformatCurrency(this.marketPrice);
    this.priceChart = new Chart<'bar', number[], string>(ctx, {
      type: 'bar',
      data: {
        labels: ['Dividendos Históricos', 'EPS', 'Preço Teto', 'Preço de Mercado'],
        datasets: [{
          label: 'Valores (R$)',
          data: [dividends, eps, ceilingPrice, marketPrice],
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
              label: (context) => `${context.label}: ${this.formatCurrency(context.parsed.y)}`
            }
          }
        }
      }
    });
  }

  downloadPng(): void {
    html2canvas(document.getElementById('results') as HTMLElement, { scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `preco_teto_${this.ticker.toUpperCase() || 'acao'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }

  downloadPdf(): void {
    html2canvas(document.getElementById('results') as HTMLElement, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`preco_teto_${this.ticker.toUpperCase() || 'acao'}.pdf`);
    });
  }
}

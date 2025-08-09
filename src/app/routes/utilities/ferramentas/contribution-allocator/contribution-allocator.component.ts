import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Chart, ChartEvent, ChartConfiguration, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Sliders {
  stocks: number;
  funds: number;
  treasury: number;
  intl: number;
}

@Component({
  selector: 'app-contribution-allocator',
  templateUrl: './contribution-allocator.component.html',
  styleUrls: ['./contribution-allocator.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule
  ]
})
export class ContributionAllocatorComponent implements OnInit, AfterViewInit {
  totalAmount: string = '';
  sliders: Sliders = { stocks: 25, funds: 25, treasury: 25, intl: 25 };
  results: any = null;
  showResults: boolean = false;
  allocationChart: Chart<'pie', number[], string> | null = null;
  resultsChart: Chart<'bar', number[], string> | null = null;
  isDragging = false;
  selectedSegmentIndex = -1;
  startX = 0;

  @ViewChild('allocationChartCanvas', { static: false }) allocationChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('resultsChartCanvas', { static: false }) resultsChartCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    Chart.register(...registerables, ChartDataLabels);
    console.log('Chart.js and ChartDataLabels registered');
  }

  ngAfterViewInit(): void {
    if (this.allocationChartCanvas?.nativeElement) {
      setTimeout(() => this.initAllocationChart(), 0);
    } else {
      console.error('allocationChartCanvas not found in DOM');
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  unformatCurrency(text: string): number {
    if (!text) return 0;
    return parseFloat(text.replace(/[R$\s.]/g, '').replace(',', '.'));
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  initAllocationChart(): void {
    const ctx = this.allocationChartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D context for allocationChart');
      return;
    }
    try {
      this.allocationChart = new Chart<'pie', number[], string>(ctx, {
        type: 'pie',
        data: {
          labels: ['Ações', 'Fundos', 'Títulos Públicos', 'Assets Internacionais'],
          datasets: [{
            data: [this.sliders.stocks, this.sliders.funds, this.sliders.treasury, this.sliders.intl],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
            borderColor: '#fff',
            borderWidth: 1,
            hoverBackgroundColor: ['#FF6384CC', '#36A2EBCC', '#FFCE56CC', '#4BC0C0CC']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            datalabels: {
              formatter: (value: number) => `${value.toFixed(2)}%`,
              color: '#fff',
              font: { size: 10 }
            },
            legend: { position: 'bottom', labels: { font: { size: 10 } } },
            tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed}%` } }
          },
          onClick: (event: ChartEvent, elements: { index: number }[], chart: Chart) => {
            if (elements.length > 0) {
              this.selectedSegmentIndex = elements[0].index;
              this.isDragging = true;
              const rect = chart.canvas.getBoundingClientRect();
              if ('native' in event && event.native instanceof MouseEvent) {
                this.startX = event.native.clientX - rect.left;
              }
            }
          }
        }
      });
      console.log('allocationChart initialized successfully:', this.allocationChart);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error initializing allocationChart:', error);
    }
  }

  normalizePercentages(data: number[], changedIndex: number, newValue: number): number[] {
    newValue = Math.max(0, Math.min(100, newValue));
    const remaining = 100 - newValue;
    const otherIndices = data.map((_, idx) => idx).filter(idx => idx !== changedIndex);
    const otherTotal = otherIndices.reduce((sum, idx) => sum + data[idx], 0);
    const normalized = data.map((value, idx) => {
      if (idx === changedIndex) return newValue;
      if (otherTotal === 0) return remaining / otherIndices.length;
      return (value / otherTotal) * remaining;
    }).map(val => Number(val.toFixed(2)));
    const sum = normalized.reduce((sum, val) => sum + val, 0);
    console.log('Normalized data:', normalized, 'Sum:', sum);
    // Adjust for rounding errors
    if (Math.abs(sum - 100) > 0.01) {
      const diff = 100 - sum;
      normalized[otherIndices[0]] += diff;
      normalized[otherIndices[0]] = Number(normalized[otherIndices[0]].toFixed(2));
    }
    console.log('Adjusted normalized data:', normalized, 'Final sum:', normalized.reduce((sum, val) => sum + val, 0));
    return normalized;
  }

  updateSlidersAndChart(data: number[]): void {
    const sliderKeys = ['stocks', 'funds', 'treasury', 'intl'];
    sliderKeys.forEach((key, idx) => {
      (this.sliders as any)[key] = data[idx];
      const sliderElement = document.getElementById(`slider${key}`) as HTMLInputElement;
      const valueElement = document.getElementById(`slider${key}Value`) as HTMLElement;
      if (sliderElement && valueElement) {
        sliderElement.value = data[idx].toString();
        valueElement.textContent = this.formatPercentage(data[idx]);
      }
    });
    if (this.allocationChart) {
      this.allocationChart.data.datasets[0].data = [...data]; // Create new array to trigger update
      this.allocationChart.update();
      console.log('allocationChart updated with data:', data);
    } else {
      console.warn('allocationChart not initialized, reinitializing');
      this.initAllocationChart();
    }
    this.updateMainCategoryTotals();
    this.cdr.markForCheck();
  }

  updateMainCategoryTotals(): boolean {
    const total = Object.values(this.sliders).reduce((sum, value) => sum + value, 0);
    const isValid = Math.abs(total - 100) < 0.01;
    const errorElement = document.getElementById('mainCategoryError') as HTMLElement;
    if (errorElement) {
      errorElement.style.display = isValid ? 'none' : 'block';
    }
    return isValid;
  }

  onSliderInput(key: string, idx: number): void {
    const newValue = this.sliders[key as keyof Sliders];
    console.log(`Slider ${key} changed to:`, newValue, 'Sliders state:', this.sliders);
    const currentData = [this.sliders.stocks, this.sliders.funds, this.sliders.treasury, this.sliders.intl];
    const newData = this.normalizePercentages(currentData, idx, newValue);
    this.updateSlidersAndChart(newData);
  }

  onSubmit(): void {
    if (!this.updateMainCategoryTotals()) {
      alert('A soma das categorias deve ser exatamente 100%.');
      return;
    }

    const totalAmount = this.unformatCurrency(this.totalAmount);
    const allocations = [this.sliders.stocks, this.sliders.funds, this.sliders.treasury, this.sliders.intl].map(value => value / 100);

    const amounts = {
      stocks: totalAmount * allocations[0],
      funds: totalAmount * allocations[1],
      treasury: totalAmount * allocations[2],
      intl: totalAmount * allocations[3]
    };

    this.results = amounts;
    this.showResults = true;
    this.cdr.markForCheck();
    setTimeout(() => this.initResultsChart(), 0);
  }

  initResultsChart(): void {
    if (this.resultsChart) this.resultsChart.destroy();
    const ctx = this.resultsChartCanvas?.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Context for resultsChart not found');
      return;
    }
    try {
      this.resultsChart = new Chart<'bar', number[], string>(ctx, {
        type: 'bar',
        data: {
          labels: ['Ações', 'Fundos', 'Títulos Públicos', 'Assets Internacionais'],
          datasets: [{
            label: 'Aporte (R$)',
            data: [
              this.results.stocks,
              this.results.funds,
              this.results.treasury,
              this.results.intl
            ],
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
      console.log('resultsChart initialized successfully:', this.resultsChart);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error initializing resultsChart:', error);
    }
  }

  downloadPng(): void {
    html2canvas(document.getElementById('results') as HTMLElement, { scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = 'distribuicao_aporte.png';
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
      pdf.save('distribuicao_aporte.pdf');
    });
  }
}

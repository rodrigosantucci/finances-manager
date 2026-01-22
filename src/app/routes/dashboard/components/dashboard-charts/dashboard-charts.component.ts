import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import ApexCharts, { ApexOptions } from 'apexcharts';

@Component({
  selector: 'app-dashboard-charts',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, TranslateModule],
  templateUrl: './dashboard-charts.component.html',
  styleUrls: ['./dashboard-charts.component.scss']
})
export class DashboardChartsComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() evolutionOptions: ApexOptions | null = null;
  @Input() distributionOptions: ApexOptions | null = null;

  @ViewChild('evolutionChart') evolutionChartEl!: ElementRef;
  @ViewChild('distributionChart') distributionChartEl!: ElementRef;

  private evolutionChartInstance: ApexCharts | undefined;
  private distributionChartInstance: ApexCharts | undefined;
  private evolutionRO: any;
  private distributionRO: any;

  get hasEvolutionData(): boolean {
    const s: any = this.evolutionOptions?.series;
    if (!s) return false;
    if (Array.isArray(s)) {
      const first = s[0];
      if (typeof first === 'number') {
        return s.length > 0;
      }
      if (first && Array.isArray(first.data)) {
        return first.data.length > 0 && !first.data.every((v: any) => Number(v) === 0);
      }
    }
    return false;
  }

  get hasDistributionData(): boolean {
    const s: any = this.distributionOptions?.series;
    if (!s) return false;
    if (Array.isArray(s)) {
      if (typeof s[0] === 'number') {
        return s.length > 0 && !s.every(v => Number(v) === 0);
      }
      const first = s[0];
      if (first && Array.isArray(first.data)) {
        return first.data.length > 0 && !first.data.every((v: any) => Number(v) === 0);
      }
    }
    return false;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['evolutionOptions'] && this.evolutionOptions) {
      this.updateChart(this.evolutionChartInstance, this.evolutionChartEl, this.evolutionOptions, 'evolution');
    }
    if (changes['distributionOptions'] && this.distributionOptions) {
      this.updateChart(this.distributionChartInstance, this.distributionChartEl, this.distributionOptions, 'distribution');
    }
  }

  ngAfterViewInit(): void {
    if (this.evolutionOptions) {
      this.updateChart(this.evolutionChartInstance, this.evolutionChartEl, this.evolutionOptions, 'evolution');
    }
    if (this.distributionOptions) {
      this.updateChart(this.distributionChartInstance, this.distributionChartEl, this.distributionOptions, 'distribution');
    }
  }

  ngOnDestroy(): void {
    this.evolutionChartInstance?.destroy();
    this.distributionChartInstance?.destroy();
    try {
      this.evolutionRO?.disconnect?.();
      this.distributionRO?.disconnect?.();
    } catch {
      void 0;
    }
  }

  private updateChart(instance: ApexCharts | undefined, element: ElementRef, options: ApexOptions, type: 'evolution' | 'distribution'): void {
    if (!element?.nativeElement) return;

    const host = element.nativeElement.closest('.chart-card') || element.nativeElement.parentElement;
    const chartOpts = { ...(options.chart || {}), background: 'transparent' } as any;
    if (type === 'evolution') {
      try {
        const contentEl = host?.querySelector('.mat-mdc-card-content') as HTMLElement | null;
        const headerEl = host?.querySelector('.mat-mdc-card-header') as HTMLElement | null;
        const rect = (host as HTMLElement)?.getBoundingClientRect?.();
        const contentHeight = contentEl?.clientHeight ?? rect?.height ?? host?.clientHeight ?? 0;
        const headerHeight = headerEl?.clientHeight ?? 0;
        const paddingReserve = 24;
        const desiredHeight = Math.max(360, Math.floor(contentHeight - headerHeight - paddingReserve));
        chartOpts.height = desiredHeight;
        chartOpts.width = '100%';
      } catch {
        chartOpts.height = chartOpts.height ?? 400;
        chartOpts.width = chartOpts.width ?? '100%';
      }
    }
      // Ensure a generous initial size for pie charts
      chartOpts.height = chartOpts.height ?? 400;
      chartOpts.width = chartOpts.width ?? '100%';
    options.chart = chartOpts;


    if (instance) {
      try { instance.destroy(); } catch { void 0; }
    }
    const chart = new ApexCharts(element.nativeElement, options);
    chart.render();
    if (type === 'evolution') {
      this.evolutionChartInstance = chart;
      this.initResizeObserver('evolution');
    } else {
      this.distributionChartInstance = chart;
      this.initResizeObserver('distribution');
    }
  }

  private initResizeObserver(type: 'evolution' | 'distribution'): void {
    const element = type === 'evolution' ? this.evolutionChartEl?.nativeElement : this.distributionChartEl?.nativeElement;
    if (!element) return;
    const host = element.closest('.chart-card') || element.parentElement;
    if (!host) return;
    const RO = (window as any).ResizeObserver;
    if (!RO) return;
    const observer = new RO(() => {
      try {
        const contentEl = host.querySelector('.mat-mdc-card-content') as HTMLElement | null;
        const headerEl = host.querySelector('.mat-mdc-card-header') as HTMLElement | null;
        const rect = (host as HTMLElement)?.getBoundingClientRect?.();
        const contentHeight = contentEl?.clientHeight ?? rect?.height ?? (host as HTMLElement).clientHeight ?? 0;
        const headerHeight = headerEl?.clientHeight ?? 0;
        const desired = Math.max(400, Math.floor(contentHeight - headerHeight - 24));
        const instance = type === 'evolution' ? this.evolutionChartInstance : this.distributionChartInstance;
        instance?.updateOptions({ chart: { height: desired, width: '100%' } } as any, false, true);
      } catch {
        void 0;
      }
    });
    observer.observe(host);
    if (type === 'evolution') this.evolutionRO = observer;
    else this.distributionRO = observer;
  }
}

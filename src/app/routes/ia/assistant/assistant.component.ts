import { Component, OnInit, AfterViewInit, OnDestroy, inject, ViewChild, ElementRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '@shared';
import { AssistantService } from './assistant.service';
import { AuthService } from '@core/authentication';
import { SettingsService } from '@core';
import { catchError, finalize, take } from 'rxjs/operators';
import ApexCharts, { ApexOptions } from 'apexcharts';
import { forkJoin, of, Subscription } from 'rxjs';

// Define interfaces for type safety
interface AnaliseResponse {
  data: string;
  nota: number;
  ai_provider: string;
  analise: any; // Will be parsed into specific structure
}

interface PessoaisAnalise {
  estrategia_sugerida?: string;
  alocacao_sugerida?: {
    renda_fixa: number;
    renda_variavel: number;
  };
  desempenho_estimativas?: {
    retorno_anual_esperado: number;
    volatilidade_esperada: number;
    periodo_analise: string;
  };
  perguntas_respostas?: Array<{ pergunta: string; resposta: string }>;
}

@Component({
  selector: 'app-ia-assistant',
  templateUrl: './assistant.component.html',
  styleUrls: ['./assistant.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    PageHeaderComponent,
    MatTabsModule,
    MatIcon,
    MatIconButton,
    MatProgressSpinnerModule,
    MatListModule,
    MatExpansionModule
  ],
  schemas: [NO_ERRORS_SCHEMA],
})
export class IaAssistantComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly assistantService = inject(AssistantService);
  private readonly authService = inject(AuthService);
  private readonly settings = inject(SettingsService);
  private notifySubscription = Subscription.EMPTY;
  private chart?: ApexCharts;

  @ViewChild('chartElement', { static: false }) chartElement?: ElementRef;

  fundamentos: AnaliseResponse | null = null;
  tecnica: AnaliseResponse | null = null;
  pessoais: AnaliseResponse | null = null;
  isLoading = false;
  currentUserId: number | null = null;

  chartOptions: ApexOptions = {
    chart: {
      type: 'donut',
      animations: {
        enabled: true,
        speed: 800,
      },
      background: 'transparent',
      foreColor: '#ccc',
      width: '100%',
      height: 300,
    },
    labels: ['Renda Fixa', 'Renda Variável'],
    series: [0, 0],
    colors: ['#00D4FF', '#EF5350'],
    dataLabels: {
      enabled: true,
      style: {
        colors: ['#fff'],
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 1,
        opacity: 0.5
      }
    },
    legend: {
      position: 'bottom',
      labels: {
        colors: '#ccc',
      },
      itemMargin: {
        vertical: 5
      }
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: {
            width: '100%',
            height: 250,
          },
          legend: {
            position: 'bottom',
            fontSize: '10px'
          },
          dataLabels: {
            style: {
              fontSize: '10px'
            }
          }
        },
      },
      {
        breakpoint: 480,
        options: {
          chart: {
            width: '100%',
            height: 200,
          },
          legend: {
            position: 'bottom',
            fontSize: '9px'
          },
          dataLabels: {
            style: {
              fontSize: '9px'
            }
          }
        }
      }
    ],
    theme: {
      mode: 'dark',
    },
    plotOptions: {
      pie: {
        donut: {
          size: '45%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              color: '#ccc',
              formatter: () => '100%',
              fontSize: '16px',
              fontWeight: 600
            },
            value: {
              show: true,
              color: '#ccc',
              fontSize: '14px',
              fontWeight: 400,
              formatter: (val) => `${parseFloat(val.toString()).toFixed(1)}%`
            }
          },
        },
      },
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val) => `${parseFloat(val.toString()).toFixed(1)}%`
      }
    },
    grid: {
      borderColor: '#5a5a5a',
    }
  };

  ngOnInit() {
    this.notifySubscription = this.settings.notify.subscribe(() => {
      this.updateChart();
      this.updateThemeStyles();
    });

    this.authService
      .user()
      .pipe(take(1))
      .subscribe((user) => {
        if (user?.id) {
          this.currentUserId = user.id;
          this.loadAssistantData();
          this.updateThemeStyles();
        } else {
          console.error('ID do usuário não disponível.');
        }
      });
  }

  ngAfterViewInit() {
    // Initial chart initialization delayed to ensure DOM readiness
    setTimeout(() => this.initChart(), 0);
  }

  ngOnDestroy() {
    this.chart?.destroy();
    this.notifySubscription.unsubscribe();
  }

  initChart() {
    if (this.chartElement?.nativeElement) {
      if (this.chart) {
        this.chart.destroy(); // Destroy existing chart to prevent duplicates
      }
      this.chart = new ApexCharts(this.chartElement.nativeElement, this.chartOptions);
      this.chart.render().catch(err => console.error('Erro ao renderizar o gráfico:', err));
      this.updateChart();
      // Update series if data is already loaded
      this.updateChartSeries();
    } else {
      console.warn('Elemento do gráfico #assistant-chart não encontrado. Aguardando mudança de aba.');
    }
  }

  updateChartSeries() {
    const allocation = this.pessoais?.analise?.alocacao_sugerida as
      | { renda_fixa: number; renda_variavel: number; }
      | undefined;
    if (allocation) {
      const newSeries = [
        allocation.renda_fixa || 0,
        allocation.renda_variavel || 0,
      ];
      console.log('Atualizando série do gráfico:', newSeries);
      this.chart?.updateSeries(newSeries, true);
      if (newSeries.every(val => val === 0)) {
        console.warn('Dados de alocação sugerida são todos zero.');
      }
    } else {
      console.warn('Dados de alocação sugerida não disponíveis:', this.pessoais?.analise);
      this.chart?.updateSeries([0, 0, 0], true); // Reset chart if no data
    }
  }

  updateChart() {
    const isDark = this.settings.getThemeColor() === 'dark';
    this.chart?.updateOptions({
      chart: {
        foreColor: isDark ? '#ccc' : '#333',
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
      },
      grid: {
        borderColor: isDark ? '#5a5a5a' : '#e1e1e1',
      },
      legend: {
        labels: {
          colors: isDark ? '#ccc' : '#333',
        }
      },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              total: {
                color: isDark ? '#ccc' : '#333',
              },
              value: {
                color: isDark ? '#ccc' : '#333',
              }
            }
          }
        }
      }
    });
  }

  updateThemeStyles() {
    const isDark = this.settings.getThemeColor() === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  onTabChange(index: number) {
    // Index 2 corresponds to "Objetivos Pessoais" tab
    if (index === 2) {
      setTimeout(() => this.initChart(), 100); // Delay to ensure tab content is rendered
    }
  }

  loadAssistantData(): void {
    if (!this.currentUserId || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.fundamentos = null;
    this.tecnica = null;
    this.pessoais = null;

    const handleError = (error: any, type: string) => {
      console.error(`Erro ao carregar ${type}:`, error);
      return of(null);
    };

    forkJoin({
      fundamentos: this.assistantService.getFundamentos(this.currentUserId).pipe(
        catchError((error) => handleError(error, 'fundamentos'))
      ),
      tecnica: this.assistantService.getTecnica(this.currentUserId).pipe(
        catchError((error) => handleError(error, 'técnica'))
      ),
      pessoais: this.assistantService.getPessoais(this.currentUserId).pipe(
        catchError((error) => handleError(error, 'pessoais'))
      )
    }).pipe(
      finalize(() => (this.isLoading = false))
    ).subscribe({
      next: ({ fundamentos, tecnica, pessoais }) => {
        this.fundamentos = fundamentos;
        this.tecnica = tecnica;
        this.pessoais = pessoais;
        this.updateChartSeries(); // Update chart after data is loaded
      },
      error: (err) => {
        console.error('Erro geral ao carregar dados do assistente:', err);
      }
    });
  }

  getStars(nota: number): string[] {
    const stars = [];
    const clampedNota = Math.max(0, Math.min(5, nota));
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= clampedNota ? 'star' : 'star_border');
    }
    return stars;
  }
}

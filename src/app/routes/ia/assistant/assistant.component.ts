import { Component, OnInit, AfterViewInit, OnDestroy, inject, ViewChild, ElementRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '@shared';
import { AssistantService } from './assistant.service';
import { AuthService } from '@core/authentication';
import { SettingsService } from '@core';
import { catchError, finalize, take, switchMap, map } from 'rxjs/operators';
import ApexCharts, { ApexOptions } from 'apexcharts';
import { forkJoin, of, Subscription, EMPTY, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '@shared';

// Define interfaces for type safety
interface AnaliseResponse {
  id?: number;
  data: string; // Data da análise
  nota: number;
  ai_provider: string;
  analise: any; // Conteúdo completo da análise
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
    MatButtonModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatExpansionModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    TranslateModule
  ],
  schemas: [NO_ERRORS_SCHEMA],
})
export class IaAssistantComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly assistantService = inject(AssistantService);
  private readonly authService = inject(AuthService);
  private readonly settings = inject(SettingsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly localStorage = inject(LocalStorageService);
  private readonly http = inject(HttpClient);
  private notifySubscription = Subscription.EMPTY;
  private chart?: ApexCharts;

  @ViewChild('chartElement', { static: false }) chartElement?: ElementRef;

  selectedTabIndex = 0;

  selectTab(index: number) {
    this.selectedTabIndex = index;
    if (index === 2) {
      setTimeout(() => this.initChart(), 100);
    }
  }

  aiKeysAvailable = false;
  hasValidAIConfig(): boolean {
    return this.aiKeysAvailable;
  }
  // Variáveis para armazenar a análise ATUALMENTE selecionada
  fundamentos: AnaliseResponse | null = null;
  tecnica: AnaliseResponse | null = null;
  pessoais: AnaliseResponse | null = null;

  // Listas para armazenar todas as análises carregadas do serviço
  allFundamentos: AnaliseResponse[] = [];
  allTecnica: AnaliseResponse[] = [];
  allPessoais: AnaliseResponse[] = [];

  isLoading = false;
  currentUserId: number | null = null;

  // Variáveis de controle de seleção
  selectedFundamentosDate: string | null = null;
  selectedTecnicaDate: string | null = null;
  selectedPessoaisDate: string | null = null;

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
      .pipe(
        take(1),
        switchMap(user => {
          if (user?.id) {
            this.currentUserId = user.id;
            this.updateThemeStyles();
            this.refreshAIKeysAvailability();
            // Carrega as listas completas e o conteúdo inicial
            return this.loadAllAnalyses();
          }
          console.error('ID do usuário não disponível.');
          return EMPTY;
        })
      )
      .subscribe({
        next: () => {
          console.log('Dados do assistente carregados e conteúdo inicial definido.');
        },
        error: (err) => {
          console.error('Erro na inicialização do assistente:', err);
        }
      });
  }

  private refreshAIKeysAvailability(): void {
    if (!this.currentUserId) {
      this.aiKeysAvailable = false;
      return;
    }
    this.http.get<{ openaiValid: boolean; geminiValid: boolean; openaiMessage: string; geminiMessage: string }>(`/api/usuarios/${this.currentUserId}/llm/keys/validate`).pipe(
      catchError(() => of({ openaiValid: false, geminiValid: false, openaiMessage: '', geminiMessage: '' }))
    ).subscribe(res => {
      this.aiKeysAvailable = res.openaiValid || res.geminiValid;
    });
  }

  // MÉTODO ATUALIZADO: Carrega a lista COMPLETA de todas as análises E define o conteúdo inicial.
  private loadAllAnalyses(): Observable<any> {
    if (!this.currentUserId) {
      return EMPTY;
    }

    this.isLoading = true;
    return forkJoin({
      fundamentos: this.assistantService.getFundamentos(this.currentUserId).pipe(
        catchError(() => of([] as AnaliseResponse[]))
      ),
      tecnica: this.assistantService.getTecnica(this.currentUserId).pipe(
        catchError(() => of([] as AnaliseResponse[]))
      ),
      pessoais: this.assistantService.getPessoais(this.currentUserId).pipe(
        catchError(() => of([] as AnaliseResponse[]))
      )
    }).pipe(
      map(({ fundamentos, tecnica, pessoais }) => {
        // 1. Armazena as listas completas
        this.allFundamentos = fundamentos;
        this.allTecnica = tecnica;
        this.allPessoais = pessoais;

        // 2. Define o conteúdo INICIAL (mais recente, primeiro da lista) e a data selecionada.

        // Fundamentos
        this.fundamentos = fundamentos.length > 0 ? fundamentos[0] : null;
        this.selectedFundamentosDate = this.fundamentos?.data || null;

        // Técnica
        this.tecnica = tecnica.length > 0 ? tecnica[0] : null;
        this.selectedTecnicaDate = this.tecnica?.data || null;

        // Pessoais
        this.pessoais = pessoais.length > 0 ? pessoais[0] : null;
        this.selectedPessoaisDate = this.pessoais?.data || null;

        // 3. Atualiza o gráfico com os dados iniciais dos Pessoais (se existirem)
        this.updateChartSeries();
      }),
      finalize(() => {
        this.isLoading = false;
      })
    );
  }

  // loadInitialContent REMOVIDO

  ngAfterViewInit() {
    setTimeout(() => this.initChart(), 0);
  }

  ngOnDestroy() {
    this.chart?.destroy();
    this.notifySubscription.unsubscribe();
  }

  initChart() {
    if (this.chartElement?.nativeElement) {
      if (this.chart) {
        this.chart.destroy();
      }
      this.chart = new ApexCharts(this.chartElement.nativeElement, this.chartOptions);
      this.chart.render().catch(err => console.error('Erro ao renderizar o gráfico:', err));
      this.updateChart();
      this.updateChartSeries();
    } else {
      console.warn('Elemento do gráfico #assistant-chart não encontrado.');
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
    } else {
      console.warn('Dados de alocação sugerida não disponíveis:', this.pessoais?.analise);
      this.chart?.updateSeries([0, 0], true);
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
    this.selectedTabIndex = index;
    if (index === 2) {
      setTimeout(() => this.initChart(), 100);
    }
  }

  // Filtra a lista local para carregar Fundamentos por data (Mantido)
  loadFundamentosByDate(date: string): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.selectedFundamentosDate = date;

    // FILTRAGEM LOCAL
    const analise = this.allFundamentos.find(a => a.data === date);
    this.fundamentos = analise || null;

    this.isLoading = false;
  }

  // Filtra a lista local para carregar Técnica por data (Mantido)
  loadTecnicaByDate(date: string): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.selectedTecnicaDate = date;

    // FILTRAGEM LOCAL
    const analise = this.allTecnica.find(a => a.data === date);
    this.tecnica = analise || null;

    this.isLoading = false;
  }

  // Filtra a lista local para carregar Pessoais por data (Mantido)
  loadPessoaisByDate(date: string): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.selectedPessoaisDate = date;

    // FILTRAGEM LOCAL
    const analise = this.allPessoais.find(a => a.data === date);
    this.pessoais = analise || null;

    this.updateChartSeries();
    this.isLoading = false;
  }

  // loadAssistantData agora chama apenas loadAllAnalyses
  loadAssistantData(): void {
    if (!this.currentUserId || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.fundamentos = null;
    this.tecnica = null;
    this.pessoais = null;

    this.loadAllAnalyses().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao recarregar todas as análises:', err);
        this.isLoading = false;
      }
    });
  }

  generateFundamentos() {
    if (!this.currentUserId || this.isLoading) return;
    if (!this.hasValidAIConfig()) {
      this.snackBar.open('Nenhuma API Key encontrada. Só é possível usar funcionalidades de IA com ao menos uma API Key preenchida.', this.translate.instant('close'), {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isLoading = true;
    this.snackBar.open(this.translate.instant('assistant.messages.generating_analysis'), this.translate.instant('close'), {
      duration: 5000,
      panelClass: ['info-snackbar']
    });

    this.assistantService.createFundamentos(this.currentUserId)
      .subscribe({
        next: () => {
          this.loadAllAnalyses().subscribe();
        },
        error: (err) => {
          console.error('Erro ao gerar análise de fundamentos:', err);
          const key = err?.status === 401 || err?.status === 403 ? 'assistant.ai.errors.invalid_or_expired_keys' : 'assistant.errors.generate_failed';
          this.snackBar.open(this.translate.instant(key), this.translate.instant('close'), {
             duration: 5000,
             panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  generateTecnica() {
    if (!this.currentUserId || this.isLoading) return;
    if (!this.hasValidAIConfig()) {
      this.snackBar.open('Nenhuma API Key encontrada. Só é possível usar funcionalidades de IA com ao menos uma API Key preenchida.', this.translate.instant('close'), {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isLoading = true;
    this.snackBar.open(this.translate.instant('assistant.messages.generating_analysis'), this.translate.instant('close'), {
      duration: 5000,
      panelClass: ['info-snackbar']
    });

    this.assistantService.createTecnica(this.currentUserId)
      .subscribe({
        next: () => {
          this.loadAllAnalyses().subscribe();
        },
        error: (err) => {
          console.error('Erro ao gerar análise técnica:', err);
          const key = err?.status === 401 || err?.status === 403 ? 'assistant.ai.errors.invalid_or_expired_keys' : 'assistant.errors.generate_failed';
          this.snackBar.open(this.translate.instant(key), this.translate.instant('close'), {
             duration: 5000,
             panelClass: ['error-snackbar']
          });
          this.isLoading = false;
        }
      });
  }

  generatePessoais() {
    if (!this.currentUserId || this.isLoading) return;
    if (!this.hasValidAIConfig()) {
      this.snackBar.open('Nenhuma API Key encontrada. Só é possível usar funcionalidades de IA com ao menos uma API Key preenchida.', this.translate.instant('close'), {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isLoading = true;
    this.snackBar.open(this.translate.instant('assistant.messages.generating_analysis'), this.translate.instant('close'), {
      duration: 5000,
      panelClass: ['info-snackbar']
    });

    this.assistantService.createPessoais(this.currentUserId)
      .subscribe({
        next: () => {
          this.loadAllAnalyses().subscribe();
        },
        error: (err) => {
          console.error('Erro ao gerar análise pessoal:', err);
          const key = err?.status === 401 || err?.status === 403 ? 'assistant.ai.errors.invalid_or_expired_keys' : 'assistant.errors.generate_failed';
          this.snackBar.open(this.translate.instant(key), this.translate.instant('close'), {
             duration: 5000,
             panelClass: ['error-snackbar']
          });
          this.isLoading = false;
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

  deleteAnalise(tipo: 'fundamentos' | 'tecnica' | 'pessoais', analise: AnaliseResponse, event?: Event): void {
    event?.stopPropagation();
    if (this.isLoading) return;
    if (!this.currentUserId) return;

    const id = analise.id;
    this.isLoading = true;

    const delete$ = id
      ? this.assistantService.deleteAnalyticsById(id)
      : this.assistantService.deleteAnalyticsByUserAndType(this.currentUserId, tipo);

    delete$
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('assistant.messages.delete_success'), this.translate.instant('close'), { duration: 3000 });
          if (tipo === 'fundamentos') {
            this.allFundamentos = this.allFundamentos.filter(a => (a.id ?? -1) !== (id ?? -1) && a.data !== analise.data);
            if (this.selectedFundamentosDate === analise.data) {
              const first = this.allFundamentos[0] || null;
              this.fundamentos = first;
              this.selectedFundamentosDate = first?.data || null;
            }
          } else if (tipo === 'tecnica') {
            this.allTecnica = this.allTecnica.filter(a => (a.id ?? -1) !== (id ?? -1) && a.data !== analise.data);
            if (this.selectedTecnicaDate === analise.data) {
              const first = this.allTecnica[0] || null;
              this.tecnica = first;
              this.selectedTecnicaDate = first?.data || null;
            }
          } else {
            this.allPessoais = this.allPessoais.filter(a => (a.id ?? -1) !== (id ?? -1) && a.data !== analise.data);
            if (this.selectedPessoaisDate === analise.data) {
              const first = this.allPessoais[0] || null;
              this.pessoais = first;
              this.selectedPessoaisDate = first?.data || null;
              this.updateChartSeries();
            }
          }
        },
        error: () => {
          this.snackBar.open(this.translate.instant('assistant.errors.delete_failed'), this.translate.instant('close'), { duration: 4000, panelClass: ['error-snackbar'] });
        }
      });
  }
}

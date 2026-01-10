import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  inject,
} from '@angular/core';
import { AsyncPipe, NgIf, CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable, take, catchError, of, map, filter, finalize, forkJoin, Subject, debounceTime } from 'rxjs';
import { DashboardService, PatrimonioDistribuicaoVO, AtivoVO, PatrimonioHistoricoVO } from './dashboard.service';
import ApexCharts, { ApexOptions } from 'apexcharts';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MtxAlertModule } from '@ng-matero/extensions/alert';
import { TransactionDialogComponent } from '../transacoes/transaction-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PatrimonioService } from '../patrimonio/patrimonio.service';
import { CotacaoService } from '../cotacoes/cotacoes.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SettingsService } from '@core/bootstrap/settings.service';
import { AuthService } from '@core/authentication';
import { QuantidadeFormatPipe } from '@shared/pipes/quantidade-format.pipe';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageHeaderComponent } from '@shared';
import { TransactionSummaryDialogComponent } from './transaction-summary-dialog.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MtxAlertModule,
    QuantidadeFormatPipe,
    CurrencyPipe,
    DecimalPipe,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    PageHeaderComponent,
  ],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly dialog = inject(MatDialog);
  private readonly dashboardSrv = inject(DashboardService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly settings = inject(SettingsService);
  private readonly patrimonioService = inject(PatrimonioService);
  private readonly cotacaoService = inject(CotacaoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);
  private readonly authService = inject(AuthService);

  constructor(private router: Router) {}

  introducingItems = [
    {
      name: 'BBDC4',
      description: 'Dividendos serão pagos em 29/06/2029.',
      link: 'https://github.com/acrodata/gui',
    },
    {
      name: 'ITSA4',
      description: 'Juros Sobre Capital Próprio serão pagos em 15/07/2029.',
      link: 'https://github.com/acrodata/gui',
    },
    {
      name: 'PETR4',
      description: 'Resultados do 1º Trimestre de 2029 divulgados.',
      link: 'https://github.com/acrodata/gui',
    },
    {
      name: 'VALE3',
      description: 'Reunião de acionistas em 10/08/2029.',
      link: 'https://github.com/acrodata/gui',
    },
  ];
  introducingItem = this.introducingItems[this.getRandom(0, this.introducingItems.length - 1)];

  distribuicaoDataSource = new MatTableDataSource<PatrimonioDistribuicaoVO>([]);
  patrimonioHistoricoDataSource = new MatTableDataSource<PatrimonioHistoricoVO>([]);
  acoesDataSource = new MatTableDataSource<AtivoVO>([]);
  fundosDataSource = new MatTableDataSource<AtivoVO>([]);
  caixaDataSource = new MatTableDataSource<AtivoVO>([]);
  assetsDataSource = new MatTableDataSource<AtivoVO>([]);

  headerChart$!: Observable<ApexOptions>;
  patrimoniochart$!: Observable<ApexOptions>;
  acoesChart$!: Observable<ApexOptions>;
  fundosChart$!: Observable<ApexOptions>;
  caixaChart$!: Observable<ApexOptions>;
  assetsChart$!: Observable<ApexOptions>;

  patrimonioColumns: string[] = ['tipoAtivo', 'percentual', 'valorTotal'];
  acoesColumns: string[] = [
    'tickerFormatado',
    'descricaoFormatada',
    'quantidadeFormatada',
    'precoMedioFormatado',
    'precoAtualFormatado',
    'valorInvestidoFormatado',
    'valorAtualFormatado',
    'lucroPrejuizoFormatado',
    'actions',
  ];
  fundosColumns: string[] = [
    'tickerFormatado',
    'descricaoFormatada',
    'quantidadeFormatada',
    'precoMedioFormatado',
    'precoAtualFormatado',
    'valorInvestidoFormatado',
    'valorAtualFormatado',
    'lucroPrejuizoFormatado',
    'actions',
  ];
  caixaColumns: string[] = [
    'descricaoFormatada',
    'valorInvestidoFormatado',
    'valorAtualFormatado',
    'lucroPrejuizoFormatado',
    'actions',
  ];
  assetsColumns: string[] = [
    'tickerFormatado',
    'descricaoFormatada',
    'quantidadeFormatada',
    'precoMedioFormatado',
    'precoAtualFormatado',
    'valorInvestidoFormatado',
    'valorAtualFormatado',
    'lucroPrejuizoFormatado',
    'actions',
  ];

  chartInstance0: ApexCharts | undefined;
  chartInstance1: ApexCharts | undefined;
  chartInstance2: ApexCharts | undefined;
  chartInstance3: ApexCharts | undefined;
  chartInstance4: ApexCharts | undefined;
  chartInstance5: ApexCharts | undefined;

  @ViewChild('headerChart') chartElement0!: ElementRef<HTMLDivElement>;
  @ViewChild('chart1') chartElement1!: ElementRef<HTMLDivElement>;
  @ViewChild('chart2') chartElement2!: ElementRef<HTMLDivElement>;
  @ViewChild('chart3') chartElement3!: ElementRef<HTMLDivElement>;
  @ViewChild('chart4') chartElement4!: ElementRef<HTMLDivElement>;
  @ViewChild('chart5') chartElement5!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isLoading = true;
  hasError = false;
  isShowAlert = false;
  isUpdating = false;

  editingRowTicker: string | null = null;
  currentEditedAtivo: AtivoVO | null = null;
  originalAtivoBeforeEdit: AtivoVO | null = null;
  selectedPeriod: string = '1M'; // Default period
  private periodChangeSubject = new Subject<string>();

  protected currentUserId: number | string | null = null;
  tema = this.settings.getThemeColor() as string;

  getRandom(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private parseAndValidateNumber = (value: number | undefined): number => {
    const parsed = value ?? 0;
    return isNaN(parsed) ? 0 : parsed;
  };

  async onUpdateDados(): Promise<void> {
    // Evita múltiplas chamadas simultâneas
    if (this.isUpdating) return;
    this.isUpdating = true;
    this.isLoading = true; // Inicia o estado de carregamento

    const user = this.authService.user().getValue();
    const usuarioId = user?.id;

    if (usuarioId === undefined || usuarioId === null) {
      console.error('ID do usuário não disponível para atualizar cotações.');
      this.snackBar.open('ID do usuário não disponível para atualizar cotações.', 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      this.isUpdating = false;
      this.isLoading = false;
      return;
    }

    // Faz a requisição para obter os tickers do usuário
    this.patrimonioService.getUserTickers(usuarioId).subscribe({
      next: tickers => {
        if (tickers.length === 0) {
          this.snackBar.open('Nenhum ticker encontrado no patrimônio.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          this.isUpdating = false;
          this.isLoading = false;
          return;
        }

        // Faz a requisição para atualizar as cotações com base nos tickers
        this.cotacaoService.atualizarDados(tickers).subscribe({
          next: cotacoes => {
            this.snackBar.open('Dados atualizados com sucesso!', 'Fechar', {
              duration: 3000,
              panelClass: ['success-snackbar'],
            });
            if (this.currentUserId) {
              // Recarrega todos os dados e componentes da tela.
              // Esta é a parte que recarrega os dados do patrimônio do usuário.
              this.loadData(this.currentUserId);
              this.setupCharts(this.currentUserId);
              this.fetchAndCacheData();
              this.loadTradingViewWidget();
              this.cdr.markForCheck(); // Força a detecção de mudanças

              // Chama o novo método para inicializar todos os gráficos
              this.initAllCharts();
            } else {
              console.error(
                'ID do usuário não disponível para recarregar dados após atualização de cotações.'
              );
            }
            this.isUpdating = false;
            this.isLoading = false;
          },
          error: error => {
            console.error('Erro ao atualizar cotações:', error);
            this.snackBar.open(error.message || 'Erro ao atualizar cotações', 'Fechar', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
            this.isUpdating = false;
            this.isLoading = false;
          },
        });
      },
      error: error => {
        console.error('Erro ao buscar tickers:', error);
        this.snackBar.open(error.message || 'Erro ao buscar tickers', 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
        this.isUpdating = false;
        this.isLoading = false;
      },
    });
  }

  // Novo método para inicializar todos os gráficos
  private initAllCharts(): void {
    setTimeout(() => {
      this.headerChart$?.subscribe({
        next: options => {
          if (this.chartElement0 && this.chartElement0.nativeElement) {
            this.initChart(this.chartElement0, options, 'headerChart');
          }
        },
        error: err => {
          console.error('Erro ao inicializar gráfico de cabeçalho:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.patrimoniochart$?.subscribe({
        next: options => {
          if (this.chartElement1 && this.chartElement1.nativeElement) {
            this.initChart(this.chartElement1, options, 'chart1');
          }
        },
        error: err => {
          console.error('Erro ao inicializar gráfico de patrimônio:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.acoesChart$?.subscribe({
        next: options => {
          if (this.chartElement2 && this.chartElement2.nativeElement) {
            this.initChart(this.chartElement2, options, 'chart2');
          }
        },
        error: err => {
          console.error('Erro ao inicializar gráfico de ações:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.fundosChart$?.subscribe({
        next: options => {
          if (this.chartElement3 && this.chartElement3.nativeElement) {
            this.initChart(this.chartElement3, options, 'chart3');
          }
        },
        error: err => {
          console.error('Erro ao inicializar gráfico de fundos:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.caixaChart$?.subscribe({
        next: options => {
          if (this.chartElement4 && this.chartElement4.nativeElement) {
            this.initChart(this.chartElement4, options, 'chart4');
          }
        },
        error: err => {
          console.error('Erro ao inicializar gráfico de caixa:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.assetsChart$?.subscribe({
        next: options => {
          if (this.chartElement5 && this.chartElement5.nativeElement) {
            this.initChart(this.chartElement5, options, 'chart5');
          }
        },
        error: err => {
          console.error('Erro ao inicializar gráfico de assets:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.isLoading = false;
      this.cdr.markForCheck();
    }, 100);
  }

  ngOnInit() {
    this.authService
      .user()
      .pipe(
        filter(user => !!user?.id),
        take(1)
      )
      .subscribe(user => {
        if (user?.id) {
          this.currentUserId = user.id;
          this.isLoading = true;
          this.loadData(user.id);
          this.setupCharts(user.id);
          this.fetchAndCacheData();
          this.loadTradingViewWidget();
        } else {
          console.error('ID do usuário não disponível para carregar dados e configurar gráficos.');
          this.hasError = true;
          this.isLoading = false;
          this.snackBar.open('Erro: ID do usuário não disponível.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        }
        this.cdr.markForCheck();
      });
  }





  private loadTradingViewWidget(): void {
    const tradingViewElement = this.el.nativeElement.querySelector('#tradingview-widget');
    if (!tradingViewElement) {
      console.error('Elemento #tradingview-widget não encontrado no DOM.');
      return;
    }
    this.renderer.setProperty(tradingViewElement, 'innerHTML', '');

    const script = this.renderer.createElement('script');
    this.renderer.setAttribute(script, 'type', 'text/javascript');
    this.renderer.setAttribute(
      script,
      'src',
      'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    );
    this.renderer.setAttribute(script, 'async', 'true');
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
        { proName: 'FX_IDC:EURUSD', title: 'EUR to USD' },
        { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
        { description: 'IBOVESPA', proName: 'INDEX:IBOV' },
        { description: 'EUR to BRL', proName: 'FX_IDC:EURBRL' },
        { description: 'NASDAQ', proName: 'IG:NASDAQ' },
        { description: 'USD to BRL', proName: 'FX_IDC:USDBRL' },
      ],
      showSymbolLogo: true,
      isTransparent: false,
      displayMode: 'compact',
      colorTheme: this.tema,
      locale: 'pt-BR',
    });
    this.renderer.appendChild(tradingViewElement, script);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.headerChart$?.subscribe({
        next: options => {
          if (this.chartElement0 && this.chartElement0.nativeElement) {
            this.initChart(this.chartElement0, options, 'headerChart');
          }
        },
        error: err => {
          console.error('Erro ao inicializar gráfico de cabeçalho:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.patrimoniochart$?.subscribe({
        next: options => {
          if (this.chartElement1 && this.chartElement1.nativeElement) {
            this.initChart(this.chartElement1, options, 'chart1');
          }
        },
        error: err => {
          console.error('Erro ao inicializar gráfico de patrimônio:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.acoesChart$?.subscribe({
        next: options => {
          if (this.chartElement2 && this.chartElement2.nativeElement) {
            this.initChart(this.chartElement2, options, 'chart2');
          }
        },
        error: err => {
          console.error('Erro ao inicializar gráfico de ações:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.fundosChart$?.subscribe({
        next: options => {
          if (this.chartElement3 && this.chartElement3.nativeElement) {
            this.initChart(this.chartElement3, options, 'chart3');
          }
        },
        error: err => {
          console.error('Erro ao inicializar gráfico de fundos:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.caixaChart$?.subscribe({
        next: options => {
          if (this.chartElement4 && this.chartElement4.nativeElement) {
            this.initChart(this.chartElement4, options, 'chart4');
          }
        },
        error: err => {
          console.error('Erro ao inicializar gráfico de caixa:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.assetsChart$?.subscribe({
        next: options => {
          if (this.chartElement5 && this.chartElement5.nativeElement) {
            this.initChart(this.chartElement5, options, 'chart5');
          }
        },
        error: err => {
          console.error('Erro ao inicializar gráfico de assets:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.isLoading = false;
      this.cdr.markForCheck();
    }, 100);
  }

  ngOnDestroy() {
    this.destroyChart(this.chartInstance1, 'chart1');
    this.destroyChart(this.chartInstance2, 'chart2');
    this.destroyChart(this.chartInstance3, 'chart3');
    this.destroyChart(this.chartInstance4, 'chart4');
    this.destroyChart(this.chartInstance5, 'chart5');
    this.destroyChart(this.chartInstance0, 'headerChart');
  }

  private destroyChart(chartInstance: ApexCharts | undefined, chartId: string): void {
    if (chartInstance) {
      chartInstance.destroy();
    }
  }

  onAlertDismiss() {
    this.isShowAlert = false;
  }

  private loadStoredData(): boolean {
    const historico = this.dashboardSrv.getStoredPatrimonioHistorico();
    const distribuicao = this.dashboardSrv.getStoredDistribuicaoPatrimonio();
    const acoes = this.dashboardSrv.getStoredPatrimonioAcoes();
    const fundos = this.dashboardSrv.getStoredPatrimonioFundos();
    const caixa = this.dashboardSrv.getStoredPatrimonioCaixa();
    const assets = this.dashboardSrv.getStoredPatrimonioAssets();

    const hasData =
      historico.length > 0 ||
      acoes.length > 0 ||
      fundos.length > 0 ||
      caixa.length > 0 ||
      assets.length > 0;

    if (hasData) {
      this.patrimonioHistoricoDataSource.data = historico;
      this.distribuicaoDataSource.data = distribuicao;
      this.acoesDataSource.data = acoes;
      this.fundosDataSource.data = fundos;
      this.caixaDataSource.data = caixa;
      this.assetsDataSource.data = assets;

      this.acoes = acoes;
      this.fundos = fundos;
      this.caixa = caixa;
      this.assets = assets;
      
      this.cdr.markForCheck();
      return true;
    }
    return false;
  }

  loadData(userId: number): void {
    this.isLoading = true;
    this.hasError = false;
    
    // Tenta carregar do storage primeiro para renderização imediata
    const loadedFromStorage = this.loadStoredData();
    if (loadedFromStorage) {
        this.isLoading = false;
        this.cdr.markForCheck();
    }

    const handleError = (error: any, context: string) => {
      console.error(`Erro ao buscar ${context}:`, error);
      this.hasError = true;
      // Se já carregou do storage, não mostra erro de carregamento inicial
      if (!loadedFromStorage) {
        this.isLoading = false;
      }
      this.snackBar.open(`Erro ao carregar ${context}.`, 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      this.cdr.markForCheck();
      return of([]);
    };

    forkJoin([
      this.dashboardSrv.getPatrimonioHistorico(userId).pipe(
        take(1),
        catchError(error => handleError(error, 'patrimônio histórico'))
      ),
      this.dashboardSrv.getDistribuicaoPatrimonio().pipe(
        take(1),
        catchError(error => handleError(error, 'distribuição de patrimônio'))
      ),
      this.dashboardSrv.getPatrimonioAcoes().pipe(
        take(1),
        catchError(error => handleError(error, 'ações'))
      ),
      this.dashboardSrv.getPatrimonioFundos().pipe(
        take(1),
        catchError(error => handleError(error, 'fundos'))
      ),
      this.dashboardSrv.getPatrimonioCaixa().pipe(
        take(1),
        catchError(error => handleError(error, 'caixa'))
      ),
      this.dashboardSrv.getPatrimonioAssets().pipe(
        take(1),
        catchError(error => handleError(error, 'assets'))
      ),
    ])
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(([patrimonioHistorico, distribuicao, acoes, fundos, caixa, assets]) => {
        this.patrimonioHistoricoDataSource.data = patrimonioHistorico;
        this.distribuicaoDataSource.data = distribuicao;
        this.acoesDataSource.data = acoes;
        this.fundosDataSource.data = fundos;
        this.caixaDataSource.data = caixa;
        this.assetsDataSource.data = assets;

        this.acoes = acoes;
        this.fundos = fundos;
        this.caixa = caixa;
        this.assets = assets;

        this.cdr.markForCheck();
      });
  }

  private filterDataByPeriod(
    data: PatrimonioHistoricoVO[],
    period: string
  ): PatrimonioHistoricoVO[] {
    if (!data || data.length === 0) return [];

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '1M':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case '3M':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case '6M':
        startDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case '1Y':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case '5Y':
        startDate = new Date(now.setFullYear(now.getFullYear() - 5));
        break;
      case '10Y':
        startDate = new Date(now.setFullYear(now.getFullYear() - 10));
        break;
      case '20Y':
        startDate = new Date(now.setFullYear(now.getFullYear() - 20));
        break;
      default:
        return data; // Return all data if period is invalid
    }

    console.warn('Filtering data from:', startDate, data);

    return data.filter(item => new Date(item.dataRegistro) >= startDate);
  }

  setupCharts(userId: number): void {
    this.headerChart$ = this.dashboardSrv.getPatrimonioHistorico(userId).pipe(

      map(data => {
        const labels = data.map(item => {
          const [day, month, year] = item.dataRegistro.split('/');
          return `${month}/${year}`;
        });

      const seriesData = data.map(item => item.valorTotal);
      const theme = this.tema === 'dark' ? 'dark' : 'light';
      const colors = ['#008FFB'];

      const options: ApexOptions = {
        series: [
          {
            name: 'Patrimônio Total',
            data: seriesData,
          },
        ],
        chart: {
          width: 1000,
          height: 300,
          type: 'area', // Alterado de 'area' para 'line' para maior clareza, ambos funcionam.
          toolbar: {
            show: true,
          },
          zoom: {
            enabled: true,
          },
          animations: {
            enabled: true,
            speed: 800,
          },
          dropShadow: {
            enabled: true,
            color: '#000',
            top: 18,
            left: 7,
            blur: 10,
            opacity: 0.2,
          },
          fontFamily: 'Roboto, sans-serif',
        },
        colors: colors,
        dataLabels: {
          enabled: false,
        },
        stroke: {
          curve: 'smooth',
        },
        tooltip: {
          enabled: true,
          theme: theme,
          x: {
            formatter: (val: any, opts: any) => {
              return labels[opts.dataPointIndex];
            },
          },
          y: {
            formatter: (val: any) => {
              return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(val);
            },
          },
        },
        xaxis: {
          categories: labels,
        },
        yaxis: {
          labels: {
            formatter: val =>
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(val),
          },
        },
      };

      return options;
    }),
    catchError(err => {
      console.error('Erro ao buscar histórico de patrimônio:', err);
      this.hasError = true;
      this.isLoading = false;
      this.cdr.markForCheck();
      return of({ series: [] } as ApexOptions);
    }),
    finalize(() => {
      this.isLoading = false;
      this.cdr.markForCheck();
    })
  );

    this.patrimoniochart$ = this.dashboardSrv.getDistribuicaoPatrimonio().pipe(
      catchError(error => {
        console.error('Erro ao buscar dados para #chart1:', error);
        this.hasError = true;
        this.isLoading = false;
        this.cdr.markForCheck();
        return of([]);
      }),
      map((distribuicao: PatrimonioDistribuicaoVO[]) => {
        const validDistribuicao = distribuicao.filter(
          d =>
            typeof d.valorTotal === 'number' &&
            d.valorTotal >= 0 &&
            typeof d.tipoAtivo === 'string' &&
            d.tipoAtivo.trim() !== ''
        );

        const series = validDistribuicao.map(d => d.percentual);
        const labels = validDistribuicao.map(d => d.tipoAtivo);

        if (series.length !== labels.length) {
          console.error('Erro: series e labels têm tamanhos diferentes para #chart1', {
            series,
            labels,
          });
          return this.getChartOptions([], [], 'Distribuição de Patrimônio', true);
        }

        return this.getChartOptions(series, labels, 'Distribuição de Patrimônio', true);
      })
    );

    this.acoesChart$ = this.acoesDataSource.connect().pipe(
      map((acoes: AtivoVO[]) => {
        const validAcoes = acoes.filter(
          a =>
            this.parseAndValidateNumber(a.valorAtualFormatado) >= 0 &&
            a.tickerFormatado &&
            a.tickerFormatado.trim() !== ''
        );
        const series = validAcoes.map(a => this.parseAndValidateNumber(a.valorAtualFormatado));
        const labels = validAcoes.map(a => a.tickerFormatado);

        if (series.length !== labels.length) {
          console.error('Erro: series e labels têm tamanhos diferentes para #chart2', {
            series,
            labels,
          });
          return this.getChartOptions([], [], 'Patrimônio em Ações', false);
        }
        return this.getChartOptions(series, labels, 'Patrimônio em Ações', false);
      })
    );

    this.fundosChart$ = this.fundosDataSource.connect().pipe(
      map((fundos: AtivoVO[]) => {
        const validFundos = fundos.filter(
          f =>
            this.parseAndValidateNumber(f.valorAtualFormatado) >= 0 &&
            f.tickerFormatado &&
            f.tickerFormatado.trim() !== ''
        );
        const series = validFundos.map(f => this.parseAndValidateNumber(f.valorAtualFormatado));
        const labels = validFundos.map(f => f.tickerFormatado);

        if (series.length !== labels.length) {
          console.error('Erro: series e labels têm tamanhos diferentes para #chart3', {
            series,
            labels,
          });
          return this.getChartOptions([], [], 'Patrimônio em Fundos', false);
        }
        return this.getChartOptions(series, labels, 'Patrimônio em Fundos', false);
      })
    );

    this.caixaChart$ = this.caixaDataSource.connect().pipe(
      map((caixa: AtivoVO[]) => {
        const validCaixa = caixa.filter(
          c =>
            this.parseAndValidateNumber(c.valorAtualFormatado) >= 0 &&
            c.tickerFormatado &&
            c.tickerFormatado.trim() !== ''
        );
        const series = validCaixa.map(c => this.parseAndValidateNumber(c.valorAtualFormatado));
        const labels = validCaixa.map(c => c.tickerFormatado);

        if (series.length !== labels.length) {
          console.error('Erro: series e labels têm tamanhos diferentes para #chart4', {
            series,
            labels,
          });
          return this.getChartOptions([], [], 'Patrimônio em Caixa', false);
        }
        return this.getChartOptions(series, labels, 'Patrimônio em Caixa', false);
      })
    );

    this.assetsChart$ = this.assetsDataSource.connect().pipe(
      map((assets: AtivoVO[]) => {
        const validAssets = assets.filter(
          a =>
            this.parseAndValidateNumber(a.valorAtualFormatado) >= 0 &&
            a.tickerFormatado &&
            a.tickerFormatado.trim() !== ''
        );
        const series = validAssets.map(a => this.parseAndValidateNumber(a.valorAtualFormatado));
        const labels = validAssets.map(a => a.tickerFormatado);

        if (series.length !== labels.length) {
          console.error('Erro: series e labels têm tamanhos diferentes para #chart5', {
            series,
            labels,
          });
          return this.getChartOptions([], [], 'Outros Ativos', false);
        }
        return this.getChartOptions(series, labels, 'Patrimônio em Assets Internacionais', false);
      })
    );
  }

  private getNumericValue(value: number | undefined): number {
    const parsed = value ?? 0;
    return isNaN(parsed) ? 0 : parsed;
  }

  getTotalInvestido(): number {
    return this.distribuicaoDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.valorTotal),
      0
    );
  }

  getTotalValorInvestidoAcoes(): number {
    return this.acoesDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.valorInvestidoFormatado),
      0
    );
  }

  getTotalValorInvestidoFundos(): number {
    return this.fundosDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.valorInvestidoFormatado),
      0
    );
  }

  getTotalValorInvestidoCaixa(): number {
    return this.caixaDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.valorInvestidoFormatado),
      0
    );
  }

  getTotalValorInvestidoAssets(): number {
    return this.assetsDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.valorInvestidoFormatado),
      0
    );
  }

  getTotalValorAtualAcoes(): number {
    return this.acoesDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.valorAtualFormatado),
      0
    );
  }

  getTotalValorAtualFundos(): number {
    return this.fundosDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.valorAtualFormatado),
      0
    );
  }

  getTotalValorAtualCaixa(): number {
    return this.caixaDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.valorAtualFormatado),
      0
    );
  }

  getTotalValorAtualAssets(): number {
    return this.assetsDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.valorAtualFormatado),
      0
    );
  }

  getTotalLucroPrejuizoAcoes(): number {
    return this.acoesDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.lucroPrejuizoFormatado),
      0
    );
  }

  getTotalLucroPrejuizoFundos(): number {
    return this.fundosDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.lucroPrejuizoFormatado),
      0
    );
  }

  getTotalLucroPrejuizoCaixa(): number {
    return this.caixaDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.lucroPrejuizoFormatado),
      0
    );
  }

  getTotalLucroPrejuizoAssets(): number {
    return this.assetsDataSource.data.reduce(
      (sum, item) => sum + this.getNumericValue(item.lucroPrejuizoFormatado),
      0
    );
  }

  getTotalLucroPrejuizoGeral(): number {
    return (
      this.getTotalLucroPrejuizoAcoes() +
      this.getTotalLucroPrejuizoFundos() +
      this.getTotalLucroPrejuizoCaixa() +
      this.getTotalLucroPrejuizoAssets()
    );
  }

  getPercentualRF(): number {
    const totalValorAtualGeral =
      this.getTotalValorAtualAcoes() +
      this.getTotalValorAtualFundos() +
      this.getTotalValorAtualCaixa() +
      this.getTotalValorAtualAssets();
    const rf = this.getTotalValorAtualCaixa();
    const percentual = totalValorAtualGeral > 0 ? (rf / totalValorAtualGeral) * 100 : 0;
    return Math.round(percentual);
  }

  getPercentualRV(): number {
    const totalValorAtualGeral =
      this.getTotalValorAtualAcoes() +
      this.getTotalValorAtualFundos() +
      this.getTotalValorAtualCaixa() +
      this.getTotalValorAtualAssets();
    const rv =
      this.getTotalValorAtualAcoes() +
      this.getTotalValorAtualFundos() +
      this.getTotalValorAtualAssets();
    const percentual = totalValorAtualGeral > 0 ? (rv / totalValorAtualGeral) * 100 : 0;
    return Math.round(percentual);
  }

  getPercentualBitcoin(): number {
    const totalValorAtualGeral =
      this.getTotalValorAtualAcoes() +
      this.getTotalValorAtualFundos() +
      this.getTotalValorAtualCaixa() +
      this.getTotalValorAtualAssets();

    const btc = this.assetsDataSource.data
      .filter(asset => asset.tickerFormatado?.toUpperCase() === 'BTC/USD')
      .reduce((sum, asset) => sum + this.getNumericValue(asset.valorAtualFormatado), 0);
    const percentual = totalValorAtualGeral > 0 ? (btc / totalValorAtualGeral) * 100 : 0;
    return Math.round(percentual);
  }

  public acoes: AtivoVO[] = [];
  public fundos: AtivoVO[] = [];
  public caixa: AtivoVO[] = [];
  public assets: AtivoVO[] = [];

  private sumUSD(): number {
    const allAssets = [...this.acoes, ...this.fundos, ...this.caixa, ...this.assets];
    const totalUSD = allAssets
      .filter(ativo => {
        const moeda = ativo.moeda ? ativo.moeda.toUpperCase().trim() : '';
        return moeda === 'USD';
      })
      .reduce((sum, ativo) => sum + this.getNumericValue(ativo.valorAtualFormatado), 0);
    return totalUSD;
  }

  getTotalValorExterior(): number {
    const total = this.sumUSD();
    return total;
  }

  getPercentualExterior(): number {
    const exterior = this.getTotalValorExterior();
    const totalValorAtualGeral =
      this.getTotalValorAtualAcoes() +
      this.getTotalValorAtualFundos() +
      this.getTotalValorAtualCaixa() +
      this.getTotalValorAtualAssets();
    const percentual = totalValorAtualGeral > 0 ? (exterior / totalValorAtualGeral) * 100 : 0;
    return Math.round(percentual);
  }

  private fetchAndCacheData(): void {
    forkJoin([
      this.dashboardSrv.getPatrimonioAcoes().pipe(
        take(1),
        catchError(() => of([]))
      ),
      this.dashboardSrv.getPatrimonioFundos().pipe(
        take(1),
        catchError(() => of([]))
      ),
      this.dashboardSrv.getPatrimonioCaixa().pipe(
        take(1),
        catchError(() => of([]))
      ),
      this.dashboardSrv.getPatrimonioAssets().pipe(
        take(1),
        catchError(() => of([]))
      ),
    ]).subscribe(([acoes, fundos, caixa, assets]: [AtivoVO[], AtivoVO[], AtivoVO[], AtivoVO[]]) => {
      this.acoes = acoes;
      this.fundos = fundos;
      this.caixa = caixa;
      this.assets = assets;

      this.acoesDataSource.data = acoes;
      this.fundosDataSource.data = fundos;
      this.caixaDataSource.data = caixa;
      this.assetsDataSource.data = assets;
      this.cdr.markForCheck();
    });
  }

 private getChartOptions(
    series: number[] | { name: string; data: number[] }[],
    labels: string[],
    title: string,
    isPercentage: boolean,
    isLineChart: boolean = false
  ): ApexOptions {
    const isDarkTheme = this.tema === 'dark';
    const textPrimary = isDarkTheme ? '#f9fafb' : '#11161d';
    const textSecondary = isDarkTheme ? '#d1d5db' : '#4b5563';
    const textMuted = isDarkTheme ? '#9ca3af' : '#6b7280';
    const chartBackground = isDarkTheme ? '#131216' : '#fbf8fd';

    const chartColors = [
      '#d32f2f', // Red
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#3B82F6', // Blue
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#6EE7B7', // Light Green
      '#FBBF24', // Amber
      '#ef5350', // Light Red
      '#42a5f5', // Light Blue
      '#66bb6a', // Light Green
      '#ab47bc', // Light Purple
      '#ff7043', // Orange
      '#26c6da', // Cyan
    ];

    const hasData = Array.isArray(series)
      ? isLineChart
        ? (series as { name: string; data: number[] }[]).some(s => s.data.some(val => val !== 0))
        : (series as number[]).length > 0 && !series.every(val => val === 0)
      : false;

    const chartSeries = hasData ? series : isLineChart ? [{ name: 'Sem dados', data: [0] }] : [1];
    const chartLabels = hasData ? labels.map(label => String(label)) : ['Sem dados'];

    const options: ApexOptions = {
      chart: {
        type: isLineChart ? 'line' : 'pie',
        height: '400px',
        width: '100%',
        animations: {
          enabled: true,
          speed: 600,
          animateGradually: { enabled: true, delay: 150 },
          dynamicAnimation: { enabled: true, speed: 350 },
        },
        dropShadow: {
          enabled: true,
          top: 2,
          left: 2,
          blur: 4,
          opacity: isDarkTheme ? 0.3 : 0.2,
        },
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: isLineChart,
            zoomin: isLineChart,
            zoomout: isLineChart,
            pan: isLineChart,
            reset: isLineChart,
          },
        },
        sparkline: { enabled: false },
        background: chartBackground,
      },
      series: chartSeries,
      colors: chartColors,
      legend: {
        show: true,
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '12px',
        fontFamily: 'Roboto, sans-serif',
        fontWeight: 400,
        labels: {
          colors: textSecondary,
          useSeriesColors: false,
        },
        markers: {
          shape: isLineChart ? 'circle' : 'circle',
          size: isLineChart ? 0 : 10,
          strokeWidth: 0,
          fillColors: chartColors,
          offsetX: -2,
          offsetY: 0,
        },
        itemMargin: {
          horizontal: 8,
          vertical: 4,
        },
        formatter: (seriesName: string, opts: any) => {
          if (!hasData) return 'Sem dados';
          const value = isLineChart
            ? opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] || 0
            : opts.w.globals.series[opts.seriesIndex];
          return `${seriesName}: ${isPercentage ? value.toFixed(1) + '%' : 'R$ ' + value.toFixed(2)}`;
        },
        onItemClick: {
          toggleDataSeries: true,
        },
        onItemHover: {
          highlightDataSeries: true,
        },
      },
      title: {
        text: title,
        align: 'center',
        margin: 10,
        style: {
          fontSize: '16px',
          fontFamily: 'Roboto, sans-serif',
          fontWeight: '500',
          color: textPrimary,
        },
      },
      noData: {
        text: 'Nenhum dado disponível',
        align: 'center',
        verticalAlign: 'middle',
        offsetX: 0,
        offsetY: 0,
        style: {
          fontSize: '14px',
          fontFamily: 'Roboto, sans-serif',
          color: textMuted,
        },
      },
      tooltip: {
        style: {
          fontSize: '10px',
          fontFamily: 'Roboto, sans-serif',
        },
        y: {
          formatter: val =>
            hasData ? (isPercentage ? `${val.toFixed(1)}%` : `R$ ${val.toFixed(2)}`) : 'Sem dados',
        },
      },
      stroke: {
        width: isLineChart ? 3 : 2,
        colors: isLineChart ? undefined : [chartBackground],
        curve: isLineChart ? 'smooth' : undefined,
      },
    };

    if (isLineChart) {
      options.xaxis = {
        categories: chartLabels,
        type: 'datetime',
        labels: {
          format: 'MM yyyy',
          style: {
            colors: textSecondary,
            fontSize: '12px',
            fontFamily: 'Roboto, sans-serif',
          },
        },
        axisBorder: {
          show: true,
          color: textMuted,
        },
        axisTicks: {
          show: true,
          color: textMuted,
        },
      };
      options.yaxis = {
        labels: {
          formatter: val => `R$ ${val.toFixed(2)}`,
          style: {
            colors: textSecondary,
            fontSize: '12px',
            fontFamily: 'Roboto, sans-serif',
          },
        },
      };
      options.fill = {
        type: 'gradient',
        gradient: {
          shade: isDarkTheme ? 'dark' : 'light',
          type: 'vertical',
          shadeIntensity: 0.5,
          gradientToColors: chartColors,
          inverseColors: false,
          opacityFrom: 0.7,
          opacityTo: 0.3,
        },
      };
      options.markers = {
        size: 4,
        colors: chartColors,
        strokeColors: chartBackground,
        strokeWidth: 2,
        hover: {
          size: 6,
        },
      };
    } else {
      options.labels = chartLabels;
    }

    options.responsive = [
      {
        breakpoint: 768,
        options: {
          chart: {
            width: '100%',
            height: isLineChart ? 300 : 300,
          },
          legend: {
            fontSize: '10px',
            itemMargin: {
              horizontal: 6,
              vertical: 3,
            },
            markers: {
              size: isLineChart ? 0 : 10,
              height: isLineChart ? 0 : 10,
              shape: 'circle',
              strokeWidth: 0,
              fillColors: chartColors,
              offsetX: -2,
              offsetY: 0,
            },
          },
          title: {
            style: {
              fontSize: '14px',
            },
          },
        },
      },
      {
        breakpoint: 576,
        options: {
          chart: {
            width: '100%',
            height: isLineChart ? 300 : 300,
          },
          legend: {
            fontSize: '9px',
            itemMargin: {
              horizontal: 4,
              vertical: 2,
            },
            markers: {
              size: isLineChart ? 0 : 8,
              height: isLineChart ? 0 : 8,
              shape: 'circle',
              strokeWidth: 0,
              fillColors: chartColors,
              offsetX: -2,
              offsetY: 0,
            },
          },
          title: {
            style: {
              fontSize: '12px',
            },
          },
        },
      },
    ];

    return options;
  }

  private initChart(
    chartElement: ElementRef<HTMLDivElement>,
    options: ApexOptions,
    chartId: string
  ): void {
    if (!chartElement || !chartElement.nativeElement) {
      console.error(`Elemento ${chartId} não encontrado no DOM.`);
      return;
    }

    let instance: ApexCharts | undefined;
    switch (chartId) {
      case 'headerChart':
        instance = this.chartInstance0;
        break;
      case 'chart1':
        instance = this.chartInstance1;
        break;
      case 'chart2':
        instance = this.chartInstance2;
        break;
      case 'chart3':
        instance = this.chartInstance3;
        break;
      case 'chart4':
        instance = this.chartInstance4;
        break;
      case 'chart5':
        instance = this.chartInstance5;
        break;
    }

    if (instance) {
      instance.destroy();
    }

    try {
      const newInstance = new ApexCharts(chartElement.nativeElement, options);
      newInstance.render();
      switch (chartId) {
        case 'headerChart':
          this.chartInstance0 = newInstance;
          break;
        case 'chart1':
          this.chartInstance1 = newInstance;
          break;
        case 'chart2':
          this.chartInstance2 = newInstance;
          break;
        case 'chart3':
          this.chartInstance3 = newInstance;
          break;
        case 'chart4':
          this.chartInstance4 = newInstance;
          break;
        case 'chart5':
          this.chartInstance5 = newInstance;
          break;
      }
    } catch (e) {
      console.error(`Erro ao renderizar gráfico ${chartId}:`, e);
    }
  }

  openTransactionDialog(): void {
    const dialogRef = this.dialog.open(TransactionDialogComponent, {
      width: '600px',
      disableClose: true,
      autoFocus: true,
      data: {
        title: 'Nova Transação',
        action: 'create',
        transaction: null,
        usuarioId: this.currentUserId,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && this.currentUserId) {
        let category = result.category;
        if (!category && result.tipoAtivo) {
          switch (result.tipoAtivo) {
            case 1:
              category = 'acoes';
              break;
            case 2:
              category = 'fundos';
              break;
            case 3:
              category = 'caixa';
              break;
            case 4:
              category = 'assets';
              break;
          }
        }

        if (!['fundos', 'acoes', 'assets', 'caixa'].includes(category)) {
          console.error('Categoria inválida na transação:', category);
          this.snackBar.open(`Erro: Categoria inválida (${category}).`, 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          return;
        }

        const transactionWithCategory = { ...result, category };

        this.dashboardSrv
          .addTransaction(this.currentUserId, transactionWithCategory)
          .pipe(
            catchError(error => {
              console.error('Erro ao adicionar transação:', error);
              this.snackBar.open(error.message || 'Erro ao registrar transação.', 'Fechar', {
                duration: 5000,

                panelClass: ['error-snackbar'],
              });
              return of(null);
            })
          )
          .subscribe(response => {
            if (response !== null) {
              this.snackBar.open('Transação registrada com sucesso!', 'Fechar', {
                duration: 3000,
                panelClass: ['success-snackbar'],
              });
              this.loadData(this.currentUserId!);
            }
          });
      } else if (!this.currentUserId) {
        console.error('ID do usuário não disponível para registrar transação.');
        this.snackBar.open('Erro: ID do usuário não disponível.', 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      }
    });
  }

  startEdit(element: AtivoVO, category: string): void {
    if (this.editingRowTicker !== null) {
      this.cancelEdit();
    }

    if (!element.tickerFormatado || element.tickerFormatado.trim() === '') {
      console.error('startEdit: Invalid or missing ticker for element.', {
        element,
        category,
        ticker: element.tickerFormatado,
      });
      this.snackBar.open(`Erro: Ticker inválido para ativo na categoria ${category}.`, 'Fechar', {
        duration: 6000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    if (!['fundos', 'acoes', 'assets', 'caixa'].includes(category)) {
      console.error('startEdit: Invalid category:', category);
      this.snackBar.open(`Erro: Categoria inválida (${category}).`, 'Fechar', {
        duration: 6000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    let dataSource: MatTableDataSource<AtivoVO>;
    switch (category) {
      case 'acoes':
        dataSource = this.acoesDataSource;
        break;
      case 'fundos':
        dataSource = this.fundosDataSource;
        break;
      case 'assets':
        dataSource = this.assetsDataSource;
        break;
      case 'caixa':
        dataSource = this.caixaDataSource;
        break;
      default:
        console.error('startEdit: Invalid category:', category);
        return;
    }

    const duplicateTickers = dataSource.data.filter(
      item => item.tickerFormatado === element.tickerFormatado
    );
    if (duplicateTickers.length > 1) {
      console.warn('startEdit: Duplicate ticker found in category', {
        category,
        ticker: element.tickerFormatado,
        count: duplicateTickers.length,
      });
      this.snackBar.open(
        `Aviso: Ticker ${element.tickerFormatado} duplicado na categoria ${category}.`,
        'Fechar',
        {
          duration: 6000,
          panelClass: ['warning-snackbar'],
        }
      );
    }

    this.editingRowTicker = element.tickerFormatado;
    this.originalAtivoBeforeEdit = JSON.parse(JSON.stringify(element));
    this.currentEditedAtivo = { ...element, category };
    this.cdr.detectChanges();
  }

  isEditing(element: AtivoVO, category: string): boolean {
    const isEditing =
      this.editingRowTicker === element.tickerFormatado &&
      this.currentEditedAtivo &&
      this.currentEditedAtivo.category === category;
    return !!isEditing;
  }

  cancelEdit(): void {
    if (this.editingRowTicker !== null && this.originalAtivoBeforeEdit && this.currentEditedAtivo) {
      const category = this.currentEditedAtivo.category;
      let dataSourceToUpdate: MatTableDataSource<AtivoVO> | undefined;

      switch (category) {
        case 'acoes':
          dataSourceToUpdate = this.acoesDataSource;
          break;
        case 'fundos':
          dataSourceToUpdate = this.fundosDataSource;
          break;
        case 'assets':
          dataSourceToUpdate = this.assetsDataSource;
          break;
        case 'caixa':
          dataSourceToUpdate = this.caixaDataSource;
          break;
        default:
          console.warn(`cancelEdit: Invalid category ${category}`);
          return;
      }

      if (dataSourceToUpdate) {
        const data = dataSourceToUpdate.data;
        const index = data.findIndex(item => item.tickerFormatado === this.editingRowTicker);
        if (index !== -1) {
          data[index] = this.originalAtivoBeforeEdit;
          dataSourceToUpdate.data = [...data];
        }
      }

      this.editingRowTicker = null;
      this.currentEditedAtivo = null;
      this.originalAtivoBeforeEdit = null;
      this.cdr.markForCheck();
    }
  }

  saveEdit(element: AtivoVO, category: string): void {
    if (
      !this.currentEditedAtivo ||
      !this.currentUserId ||
      !['fundos', 'acoes', 'assets', 'caixa'].includes(category)
    ) {
      console.error('saveEdit: Missing currentEditedAtivo, currentUserId, or invalid category.', {
        currentEditedAtivo: this.currentEditedAtivo,
        currentUserId: this.currentUserId,
        category,
      });
      this.snackBar.open('Erro ao salvar: dados ou categoria inválidos.', 'Fechar', {
        duration: 6000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    if (
      !this.currentEditedAtivo.tickerFormatado ||
      this.currentEditedAtivo.tickerFormatado.trim() === ''
    ) {
      console.error('saveEdit: Ticker do ativo não definido.', {
        currentEditedAtivo: this.currentEditedAtivo,
      });
      this.snackBar.open('Erro ao salvar: Ticker do ativo não definido.', 'Fechar', {
        duration: 6000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    const updatedAtivo: AtivoVO = {
      ...this.currentEditedAtivo,
      tickerFormatado: element.tickerFormatado,
      descricaoFormatada: element.descricaoFormatada,
      quantidadeFormatada: element.quantidadeFormatada,
      precoMedioFormatado: element.precoMedioFormatado,
      precoAtualFormatado: element.precoAtualFormatado,
      valorAtualFormatado: element.valorAtualFormatado,
    };

    this.dashboardSrv
      .updateAtivo(this.currentUserId, updatedAtivo, category)
      .pipe(
        catchError(error => {
          console.error(`saveEdit: Error updating ativo in ${category}:`, {
            error,
            status: error.status,
            statusText: error.statusText,
            errorDetails: error.error,
          });
          this.snackBar.open(error.message || 'Erro ao salvar ativo.', 'Fechar', {
            duration: 6000,
            panelClass: ['error-snackbar'],
          });
          return of(null);
        }),
        finalize(() => {
          this.cdr.markForCheck();
        })
      )
      .subscribe(result => {
        if (result !== null) {
          this.snackBar.open('Ativo atualizado com sucesso!', 'Fechar', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          this.editingRowTicker = null;
          this.currentEditedAtivo = null;
          this.originalAtivoBeforeEdit = null;
          this.loadData(this.currentUserId!);
        }
      });
  }

  openDeleteDialog(element: AtivoVO, category: string): void {
    if (!['fundos', 'acoes', 'assets', 'caixa'].includes(category)) {
      console.error(`Categoria inválida para exclusão: ${category}`);
      this.snackBar.open(`Erro: Categoria inválida (${category}).`, 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: {
        title: 'Confirmar Exclusão',
        message: `Tem certeza que deseja excluir o ativo ${element.tickerFormatado}?`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && this.currentUserId) {
        this.dashboardSrv
          .deleteAtivo(this.currentUserId, element.tickerFormatado, category)
          .pipe(
            catchError(error => {
              console.error(
                `Erro ao excluir ativo ${element.tickerFormatado} da categoria ${category}:`,
                error
              );
              this.snackBar.open(error.message || 'Erro ao excluir ativo.', 'Fechar', {
                duration: 5000,
                panelClass: ['error-snackbar'],
              });
              return of(null);
            }),
            finalize(() => {
              this.cdr.markForCheck();
            })
          )
          .subscribe((deleteResult: any) => {
            if (deleteResult !== null) {
              this.snackBar.open('Ativo excluído com sucesso!', 'Fechar', {
                duration: 3000,
                panelClass: ['success-snackbar'],
              });
              this.loadData(this.currentUserId!);
            }
          });
      } else if (!this.currentUserId) {
        console.error('ID do usuário não disponível para excluir ativo.');
        this.snackBar.open('Erro: ID do usuário não disponível para exclusão.', 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      }
    });
  }

  // Método para acionar o upload de transações
  public triggerFileInput(): void {
    console.log('Botão de upload clicado. Procurando o input de arquivo...');
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      console.log('Input de arquivo encontrado. Acionando clique.');
      fileInput.click();
    } else {
      console.error('Erro: O elemento input de arquivo não foi encontrado no DOM.');
    }
  }

  async onUploadTransacoes(event: Event): Promise<void> {
    console.log('onUploadTransacoes chamado.');
    if (this.isUpdating) {
      console.warn('Processo de upload já em andamento. Ignorando nova chamada.');
      return;
    }

    this.isUpdating = true;
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      console.error('Nenhum arquivo selecionado.');
      this.snackBar.open('Nenhum arquivo selecionado.', 'Fechar', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
      this.isUpdating = false;
      return;
    }

    const file = input.files[0];
    console.log(`Arquivo selecionado: ${file.name}, Tamanho: ${file.size} bytes`);

    if (!file.name.endsWith('.json')) {
      console.error('Arquivo com extensão inválida. Esperado: .json');
      this.snackBar.open('Por favor, selecione um arquivo JSON.', 'Fechar', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
      this.isUpdating = false;
      return;
    }

    try {
      const fileReader = new FileReader();

      fileReader.onload = () => {
        let jsonData;
        try {
          console.log('Iniciando leitura do arquivo...');
          jsonData = JSON.parse(fileReader.result as string);
          console.log('Arquivo JSON lido e parseado com sucesso.', jsonData);
        } catch (e: any) {
          console.error('Erro ao parsear arquivo JSON:', e);
          this.snackBar.open(`Erro ao ler o arquivo JSON: ${e.message}`, 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          return;
        }

        console.log('Iniciando validação do formato JSON...');
        console.log('Dados JSON para validação:', jsonData);
        if (!this.validateTransactionJson(jsonData)) {
          console.error('Validação do formato JSON falhou.');
          this.snackBar.open('Formato de arquivo JSON inválido.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          return;
        }
        console.log('Validação do formato JSON concluída com sucesso.');

        console.log('Verificando ID do usuário:', this.currentUserId);
        if (!this.currentUserId) {
          console.error('ID do usuário não disponível para enviar transação.');
          this.snackBar.open('ID do usuário não disponível.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          return;
        }

        console.log('Iniciando requisição para o serviço de transações.');
        this.dashboardSrv
          .createTransactionLote(this.currentUserId as number, jsonData)
          .pipe(
            catchError(error => {
              console.error('Erro ao enviar transação:', error);
              const errorMessage =
                error.error?.message || 'Erro desconhecido ao importar transação.';
              this.snackBar.open(`Erro no upload: ${errorMessage}`, 'Fechar', {
                duration: 5000,
                panelClass: ['error-snackbar'],
              });
              return of(null);
            })
          )
          .subscribe(response => {
            if (response !== null) {
              console.log('Upload de transações bem-sucedido. Resposta da API:', response);

              let transactions = [];
              let balance = 0;
              let totalVendas = 0;
              let totalCompras = 0;

              // Tenta extrair dados do formato { "compras": [...], "vendas": [...] }
              if (response && Array.isArray(response.compras) && Array.isArray(response.vendas)) {
                transactions = [...response.compras, ...response.vendas];
                totalVendas = response.totalVendas;
                totalCompras = response.totalCompras;
                balance = response.balancoTransacao || 0; // Utiliza o balanço da API
                console.log('Resposta em formato de compras/vendas detectada.');
              } else if (response && Array.isArray(response.transactions)) {
                // Tenta extrair dados do formato { transactions: [...], balance: number }
                transactions = response.transactions;
                balance = response.balance || 0; // Se 'balance' não existir, assume 0
                totalCompras = response.totalCompras || 0;
                totalVendas = response.totalVendas || 0;
                console.log('Resposta em formato de transações/balanço detectada.');
              } else if (response && Array.isArray(response)) {
                // Assume que a resposta é diretamente o array de transações
                transactions = response;
                // Calcula o balanço localmente
                balance = transactions.reduce((sum, t) => sum + t.valorTransacao, 0);

                console.log('Resposta em formato de array de transações detectada.');
              } else {
                console.warn(
                  'Resposta da API não contém transações válidas para exibir no resumo.'
                );
              }

              // Se houver transações para exibir, abre o dialog
              if (transactions.length > 0) {
                this.dialog.open(TransactionSummaryDialogComponent, {
                  width: '600px',
                  data: { transactions, balance, totalVendas, totalCompras },
                });

                // Recarrega os dados do dashboard em segundo plano
                // this.onUpdateDados();
              } else {
                this.snackBar.open(
                  'Transação importada com sucesso, mas o resumo não pôde ser exibido. Verifique o console para mais detalhes.',
                  'Fechar',
                  {
                    duration: 5000,
                    panelClass: ['warning-snackbar'],
                  }
                );
              }
            }
          });
      };

      fileReader.onerror = e => {
        console.error('Erro ao ler o arquivo:', e);
        this.snackBar.open('Erro ao ler o arquivo.', 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      };

      fileReader.readAsText(file);
    } catch (error) {
      console.error('Erro no processamento do arquivo:', error);
      this.snackBar.open('Erro ao processar o arquivo.', 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
    } finally {
      this.isUpdating = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Valida a estrutura de um array de transações.
   * @param jsonData O array de objetos de transação.
   * @returns true se a estrutura for válida, caso contrário, false.
   */
  private validateTransactionJson(jsonData: any): boolean {
    if (!Array.isArray(jsonData)) {
      console.error('Erro de validação: O JSON não é um array.');
      return false;
    }

    for (const item of jsonData) {
      if (typeof item !== 'object' || item === null) {
        console.error('Erro de validação: Um item do array não é um objeto.');
        return false;
      }

      const requiredKeys = [
        { key: 'dataTransacao', type: 'string' },
        { key: 'tipoTransacao', type: 'string' },
        { key: 'quantidade', type: 'number' },
        { key: 'valorTransacao', type: 'number' },
        { key: 'moeda', type: 'string' },
        { key: 'ticker', type: 'string' },
        // Ajustado para aceitar tanto string quanto number
        { key: 'tipoAtivo', type: ['string', 'number'] },
      ];

      for (const { key, type } of requiredKeys) {
        if (!(key in item)) {
          console.error(
            `Erro de validação: Chave obrigatória "${key}" está faltando em um objeto.`
          );
          return false;
        }

        const currentType = typeof item[key];
        // Verifica se o tipo atual está contido na lista de tipos esperados
        if (Array.isArray(type) ? !type.includes(currentType) : currentType !== type) {
          console.error(
            `Erro de validação: A chave "${key}" tem o tipo incorreto. Esperado: ${Array.isArray(type) ? type.join(' ou ') : type}, Recebido: ${currentType}.`
          );
          return false;
        }
      }
    }

    return true;
  }
}

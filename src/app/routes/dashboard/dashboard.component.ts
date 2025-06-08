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
import { MatFormFieldModule } from '@angular/material/form-field'; // Importado para mat-form-field
import { MatInputModule } from '@angular/material/input'; // Importado para matInput
import {
  Observable,
  take,
  catchError,
  of,
  map,
  filter,
  finalize,
  forkJoin,
} from 'rxjs';
import {
  DashboardService,
  PatrimonioDistribuicaoVO,
  AtivoVO,
} from './dashboard.service';
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
import { FormsModule } from '@angular/forms'; // Importar FormsModule para [(ngModel)]
import { Router } from '@angular/router';

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
    FormsModule, // Módulo para ngModel
    MatFormFieldModule, // Importe este módulo
    MatInputModule, // Importe este módulo
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
  acoesDataSource = new MatTableDataSource<AtivoVO>([]);
  fundosDataSource = new MatTableDataSource<AtivoVO>([]);
  caixaDataSource = new MatTableDataSource<AtivoVO>([]);
  assetsDataSource = new MatTableDataSource<AtivoVO>([]);

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
    'valorInvestidoFormatado',
    'valorAtualFormatado',
    'lucroPrejuizoFormatado',
    'actions',
  ];
  caixaColumns: string[] = [
    'tickerFormatado',
    'descricaoFormatada',
    'quantidadeFormatada',
    'precoMedioFormatado',
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
    'valorInvestidoFormatado',
    'valorAtualFormatado',
    'lucroPrejuizoFormatado',
    'actions',
  ];

  chartInstance1: ApexCharts | undefined;
  chartInstance2: ApexCharts | undefined;
  chartInstance3: ApexCharts | undefined;
  chartInstance4: ApexCharts | undefined;
  chartInstance5: ApexCharts | undefined;

  @ViewChild('chart1') chartElement1!: ElementRef<HTMLDivElement>;
  @ViewChild('chart2') chartElement2!: ElementRef<HTMLDivElement>;
  @ViewChild('chart3') chartElement3!: ElementRef<HTMLDivElement>;
  @ViewChild('chart4') chartElement4!: ElementRef<HTMLDivElement>;
  @ViewChild('chart5') chartElement5!: ElementRef<HTMLDivElement>;

  isLoading = true;
  hasError = false;
  isShowAlert = false;
  isUpdating = false;




  // Variáveis para edição em linha
  editingRowId: number | string | null = null;
  currentEditedAtivo: AtivoVO | null = null;
  originalAtivoBeforeEdit: AtivoVO | null = null;

  protected currentUserId: number | string | null = null; // Para armazenar o ID do usuário
  tema = this.settings.getThemeColor() as string;

  getRandom(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private parseAndValidateNumber = (value: number | undefined): number => {
    const parsed = value ?? 0;
    return isNaN(parsed) ? 0 : parsed;
  };

  async onUpdateDados(): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    const user = this.authService.user().getValue();
    const usuarioId = user?.id;

    if (usuarioId === undefined || usuarioId === null) {
      console.error('ID do usuário não disponível para atualizar cotações.');
      this.snackBar.open('ID do usuário não disponível para atualizar cotações.', 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      this.isUpdating = false;
      return;
    }

    this.patrimonioService.getUserTickers(usuarioId).subscribe({
      next: (tickers) => {
        if (tickers.length === 0) {
          this.snackBar.open('Nenhum ticker encontrado no patrimônio.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          this.isUpdating = false;
          return;
        }

        this.cotacaoService.atualizarDados(tickers).subscribe({
          next: (cotacoes) => {
            this.snackBar.open('Cotações atualizadas com sucesso!', 'Fechar', {
              duration: 3000,
              panelClass: ['success-snackbar'],
            });
            if (this.currentUserId) {
              this.loadData(this.currentUserId); // Recarrega os dados do componente
            } else {
              console.error('ID do usuário não disponível para recarregar dados após atualização de cotações.');
            }
            this.isUpdating = false;
          },
          error: (error) => {
            console.error('Erro ao atualizar cotações:', error);
            this.snackBar.open(error.message || 'Erro ao atualizar cotações', 'Fechar', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
            this.isUpdating = false;
          },
        });
      },
      error: (error) => {
        console.error('Erro ao buscar tickers:', error);
        this.snackBar.open(error.message || 'Erro ao buscar tickers', 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
        this.isUpdating = false;
      },
    });
  }


    async onUpdateCotacoes(): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    const user = this.authService.user().getValue();
    const usuarioId = user?.id;

    if (usuarioId === undefined || usuarioId === null) {
      console.error('ID do usuário não disponível para atualizar cotações.');
      this.snackBar.open('ID do usuário não disponível para atualizar cotações.', 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      this.isUpdating = false;
      return;
    }

    this.patrimonioService.getUserTickers(usuarioId).subscribe({
      next: (tickers) => {
        if (tickers.length === 0) {
          this.snackBar.open('Nenhum ticker encontrado no patrimônio.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          this.isUpdating = false;
          return;
        }

        this.cotacaoService.atualizarCotacoes(tickers, 'BRL').subscribe({
          next: (cotacoes) => {
            this.snackBar.open('Cotações atualizadas com sucesso!', 'Fechar', {
              duration: 3000,
              panelClass: ['success-snackbar'],
            });
            if (this.currentUserId) {
              this.loadData(this.currentUserId); // Recarrega os dados do componente
            } else {
              console.error('ID do usuário não disponível para recarregar dados após atualização de cotações.');
            }
            this.isUpdating = false;
          },
          error: (error) => {
            console.error('Erro ao atualizar cotações:', error);
            this.snackBar.open(error.message || 'Erro ao atualizar cotações', 'Fechar', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
            this.isUpdating = false;
          },
        });
      },
      error: (error) => {
        console.error('Erro ao buscar tickers:', error);
        this.snackBar.open(error.message || 'Erro ao buscar tickers', 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
        this.isUpdating = false;
      },
    });
  }

  ngOnInit() {
    this.authService.user().pipe(filter((user) => !!user?.id), take(1)).subscribe((user) => {
      if (user?.id) {
        this.currentUserId = user.id; // Armazena o ID do usuário
        this.loadData(user.id);
        this.setupCharts(user.id);
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
    this.fetchAndCacheData();
    this.loadTradingViewWidget();
  }

  private loadTradingViewWidget(): void {
    const tradingViewElement = this.el.nativeElement.querySelector('#tradingview-widget');
    if (!tradingViewElement) {
      console.error('Elemento #tradingview-widget não encontrado no DOM.');
      return;
    }
    this.renderer.setProperty(tradingViewElement, 'innerHTML', ''); // Clear existing content

    const script = this.renderer.createElement('script');
    this.renderer.setAttribute(script, 'type', 'text/javascript');
    this.renderer.setAttribute(script, 'src', 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js');
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
      locale: 'pt_BR',
    });
    this.renderer.appendChild(tradingViewElement, script);
  }

  ngAfterViewInit() {
    // Timeout para garantir que os elementos do DOM estejam disponíveis
    setTimeout(() => {
      this.patrimoniochart$?.subscribe({
        next: (options) => {
          if (this.chartElement1 && this.chartElement1.nativeElement) {
            this.initChart(this.chartElement1, options, 'chart1');
          }
        },
        error: (err) => {
          console.error('Erro ao inicializar gráfico de patrimônio:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.acoesChart$?.subscribe({
        next: (options) => {
          if (this.chartElement2 && this.chartElement2.nativeElement) {
            this.initChart(this.chartElement2, options, 'chart2');
          }
        },
        error: (err) => {
          console.error('Erro ao inicializar gráfico de ações:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.fundosChart$?.subscribe({
        next: (options) => {
          if (this.chartElement3 && this.chartElement3.nativeElement) {
            this.initChart(this.chartElement3, options, 'chart3');
          }
        },
        error: (err) => {
          console.error('Erro ao inicializar gráfico de fundos:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.caixaChart$?.subscribe({
        next: (options) => {
          if (this.chartElement4 && this.chartElement4.nativeElement) {
            this.initChart(this.chartElement4, options, 'chart4');
          }
        },
        error: (err) => {
          console.error('Erro ao inicializar gráfico de caixa:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.assetsChart$?.subscribe({
        next: (options) => {
          if (this.chartElement5 && this.chartElement5.nativeElement) {
            this.initChart(this.chartElement5, options, 'chart5');
          }
        },
        error: (err) => {
          console.error('Erro ao inicializar gráfico de assets:', err);
          this.hasError = true;
          this.cdr.markForCheck();
        },
      });

      this.isLoading = false; // Define isLoading como false após a tentativa de renderização dos gráficos
      this.cdr.markForCheck(); // Força a detecção de mudanças para atualizar a UI
    }, 100);
  }

  ngOnDestroy() {
    this.destroyChart(this.chartInstance1, 'chart1');
    this.destroyChart(this.chartInstance2, 'chart2');
    this.destroyChart(this.chartInstance3, 'chart3');
    this.destroyChart(this.chartInstance4, 'chart4');
    this.destroyChart(this.chartInstance5, 'chart5');
  }

  private destroyChart(chartInstance: ApexCharts | undefined, chartId: string): void {
    if (chartInstance) {
      chartInstance.destroy();
      console.log(`Instância de #${chartId} destruída.`);
    }
  }

  onAlertDismiss() {
    this.isShowAlert = false;
  }

  loadData(userId: number | string): void {
    console.log(`DashboardComponent: Iniciando carregamento de dados para usuário ${userId}...`);
    this.isLoading = true;
    this.hasError = false;
    this.cdr.markForCheck();

    const handleError = (error: any, context: string) => {
      console.error(`Erro ao buscar ${context}:`, error);
      this.hasError = true;
      this.isLoading = false;
      this.snackBar.open(`Erro ao carregar ${context}.`, 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      this.cdr.markForCheck();
      return of([]);
    };

    forkJoin([
      this.dashboardSrv
        .getDistribuicaoPatrimonio()
        .pipe(take(1), catchError((error) => handleError(error, 'distribuição de patrimônio'))),
      this.dashboardSrv.getPatrimonioAcoes().pipe(take(1), catchError((error) => handleError(error, 'ações'))),
      this.dashboardSrv.getPatrimonioFundos().pipe(take(1), catchError((error) => handleError(error, 'fundos'))),
      this.dashboardSrv.getPatrimonioCaixa().pipe(take(1), catchError((error) => handleError(error, 'caixa'))),
      this.dashboardSrv.getPatrimonioAssets().pipe(take(1), catchError((error) => handleError(error, 'assets'))),
    ])
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(([distribuicao, acoes, fundos, caixa, assets]) => {
        console.log('Dados recebidos para tabelas:', { distribuicao, acoes, fundos, caixa, assets });
        this.distribuicaoDataSource.data = distribuicao;
        this.acoesDataSource.data = acoes;
        this.fundosDataSource.data = fundos;
        this.caixaDataSource.data = caixa;
        this.assetsDataSource.data = assets;

        // Atualiza os arrays privados para uso em outras funções
        this.acoes = acoes;
        this.fundos = fundos;
        this.caixa = caixa;
        this.assets = assets;

        this.cdr.markForCheck();
      });
  }

  // Aceita o ID do usuário como parâmetro
  setupCharts(userId: number | string): void {
    console.log(`DashboardComponent: Configurando gráficos para usuário ${userId}...`);

    this.patrimoniochart$ = this.dashboardSrv.getDistribuicaoPatrimonio().pipe(
      catchError((error) => {
        console.error('Erro ao buscar dados para #chart1:', error);
        this.hasError = true;
        this.isLoading = false;
        this.cdr.markForCheck();
        return of([]);
      }),
      map((distribuicao: PatrimonioDistribuicaoVO[]) => {
        console.log('Dados brutos para #chart1:', distribuicao);
        const validDistribuicao = distribuicao.filter(
          (d) =>
            typeof d.valorTotal === 'number' &&
            d.valorTotal >= 0 &&
            typeof d.tipoAtivo === 'string' &&
            d.tipoAtivo.trim() !== ''
        );

        const series = validDistribuicao.map((d) => d.percentual);
        const labels = validDistribuicao.map((d) => d.tipoAtivo);

        console.log('Series para #chart1 (valores):', series);
        console.log('Labels para #chart1:', labels);

        if (series.length !== labels.length) {
          console.error('Erro: series e labels têm tamanhos diferentes para #chart1', { series, labels });
          return this.getChartOptions([], [], 'Distribuição de Patrimônio', true);
        }

        return this.getChartOptions(series, labels, 'Distribuição de Patrimônio', true);
      })
    );

    this.acoesChart$ = this.acoesDataSource.connect().pipe(
      map((acoes: AtivoVO[]) => {
        console.log('Dados brutos para #chart2:', acoes);
        const validAcoes = acoes.filter(
          (a) => this.parseAndValidateNumber(a.valorAtualFormatado) >= 0 && a.tickerFormatado && a.tickerFormatado.trim() !== ''
        );
        const series = validAcoes.map((a) => this.parseAndValidateNumber(a.valorAtualFormatado));
        const labels = validAcoes.map((a) => a.tickerFormatado);
        console.log('Series para #chart2 (valores):', series);
        console.log('Labels para #chart2:', labels);

        if (series.length !== labels.length) {
          console.error('Erro: series e labels têm tamanhos diferentes para #chart2', { series, labels });
          return this.getChartOptions([], [], 'Patrimônio em Ações', false);
        }
        return this.getChartOptions(series, labels, 'Patrimônio em Ações', false);
      })
    );

    this.fundosChart$ = this.fundosDataSource.connect().pipe(
      map((fundos: AtivoVO[]) => {
        console.log('Dados brutos para #chart3:', fundos);
        const validFundos = fundos.filter(
          (f) => this.parseAndValidateNumber(f.valorAtualFormatado) >= 0 && f.tickerFormatado && f.tickerFormatado.trim() !== ''
        );
        const series = validFundos.map((f) => this.parseAndValidateNumber(f.valorAtualFormatado));
        const labels = validFundos.map((f) => f.tickerFormatado);
        console.log('Series para #chart3 (valores):', series);
        console.log('Labels para #chart3:', labels);

        if (series.length !== labels.length) {
          console.error('Erro: series e labels têm tamanhos diferentes para #chart3', { series, labels });
          return this.getChartOptions([], [], 'Patrimônio em Fundos', false);
        }
        return this.getChartOptions(series, labels, 'Patrimônio em Fundos', false);
      })
    );

    this.caixaChart$ = this.caixaDataSource.connect().pipe(
      map((caixa: AtivoVO[]) => {
        console.log('Dados brutos para #chart4:', caixa);
        const validCaixa = caixa.filter(
          (c) => this.parseAndValidateNumber(c.valorAtualFormatado) >= 0 && c.tickerFormatado && c.tickerFormatado.trim() !== ''
        );
        const series = validCaixa.map((c) => this.parseAndValidateNumber(c.valorAtualFormatado));
        const labels = validCaixa.map((c) => c.tickerFormatado);
        console.log('Series para #chart4 (valores):', series);
        console.log('Labels para #chart4:', labels);

        if (series.length !== labels.length) {
          console.error('Erro: series e labels têm tamanhos diferentes para #chart4', { series, labels });
          return this.getChartOptions([], [], 'Patrimônio em Caixa', false);
        }
        return this.getChartOptions(series, labels, 'Patrimônio em Caixa', false);
      })
    );

    this.assetsChart$ = this.assetsDataSource.connect().pipe(
      map((assets: AtivoVO[]) => {
        console.log('Dados brutos para #chart5:', assets);
        const validAssets = assets.filter(
          (a) => this.parseAndValidateNumber(a.valorAtualFormatado) >= 0 && a.tickerFormatado && a.tickerFormatado.trim() !== ''
        );
        const series = validAssets.map((a) => this.parseAndValidateNumber(a.valorAtualFormatado));
        const labels = validAssets.map((a) => a.tickerFormatado);
        console.log('Series para #chart5 (valores):', series);
        console.log('Labels para #chart5:', labels);

        if (series.length !== labels.length) {
          console.error('Erro: series e labels têm tamanhos diferentes para #chart5', { series, labels });
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
    return this.distribuicaoDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.valorTotal), 0);
  }

  getTotalValorInvestidoAcoes(): number {
    return this.acoesDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.valorInvestidoFormatado), 0);
  }

  getTotalValorInvestidoFundos(): number {
    return this.fundosDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.valorInvestidoFormatado), 0);
  }

  getTotalValorInvestidoCaixa(): number {
    return this.caixaDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.valorInvestidoFormatado), 0);
  }

  getTotalValorInvestidoAssets(): number {
    return this.assetsDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.valorInvestidoFormatado), 0);
  }

  getTotalValorAtualAcoes(): number {
    return this.acoesDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.valorAtualFormatado), 0);
  }

  getTotalValorAtualFundos(): number {
    return this.fundosDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.valorAtualFormatado), 0);
  }

  getTotalValorAtualCaixa(): number {
    return this.caixaDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.valorAtualFormatado), 0);
  }

  getTotalValorAtualAssets(): number {
    return this.assetsDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.valorAtualFormatado), 0);
  }

  getTotalLucroPrejuizoAcoes(): number {
    return this.acoesDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.lucroPrejuizoFormatado), 0);
  }

  getTotalLucroPrejuizoFundos(): number {
    return this.fundosDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.lucroPrejuizoFormatado), 0);
  }

  getTotalLucroPrejuizoCaixa(): number {
    return this.caixaDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.lucroPrejuizoFormatado), 0);
  }

  getTotalLucroPrejuizoAssets(): number {
    return this.assetsDataSource.data.reduce((sum, item) => sum + this.getNumericValue(item.lucroPrejuizoFormatado), 0);
  }

  getTotalLucroPrejuizoGeral(): number {
    return (
      this.getTotalLucroPrejuizoAcoes() +
      this.getTotalLucroPrejuizoFundos() +
      this.getTotalLucroPrejuizoCaixa() + // Adicionado Caixa
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
      this.getTotalValorAtualCaixa() + // Adicionado Caixa
      this.getTotalValorAtualAssets();
    const rv = this.getTotalValorAtualAcoes() + this.getTotalValorAtualFundos() + this.getTotalValorAtualAssets();
    const percentual = totalValorAtualGeral > 0 ? (rv / totalValorAtualGeral) * 100 : 0;
    return Math.round(percentual);
  }


    getPercentualBitcoin(): number {
    const totalValorAtualGeral =
      this.getTotalValorAtualAcoes() +
      this.getTotalValorAtualFundos() +
      this.getTotalValorAtualCaixa() + // Adicionado Caixa
      this.getTotalValorAtualAssets();

    const btc = this.assetsDataSource.data
      .filter((asset) => asset.tickerFormatado?.toUpperCase() === 'USDBTC')
      .reduce((sum, asset) => sum + this.getNumericValue(asset.valorAtualFormatado), 0);
      console.log('getPercentualBitcoin: BTC value:', btc);
    const percentual = totalValorAtualGeral > 0 ? (btc / totalValorAtualGeral) * 100 : 0;
    return Math.round(percentual);
  }

  public acoes: AtivoVO[] = [];
  public fundos: AtivoVO[] = [];
  public caixa: AtivoVO[] = [];
  public assets: AtivoVO[] = [];

  private sumUSD(): number {
    const allAssets = [...this.acoes, ...this.fundos, ...this.caixa, ...this.assets];
    console.log('sumUSD: All assets:', allAssets);

    const totalUSD = allAssets
      .filter((ativo) => {
        const moeda = ativo.moeda ? ativo.moeda.toUpperCase().trim() : '';
        return moeda === 'USD';
      })
      .reduce((sum, ativo) => sum + this.getNumericValue(ativo.valorAtualFormatado), 0);
    console.log('sumUSD: Total USD:', totalUSD);
    return totalUSD;
  }

  getTotalValorExterior(): number {
    const total = this.sumUSD();
    console.log('getTotalValorExterior: Total USD value:', total);
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
    const roundedPercentual = Math.round(percentual); // Round to nearest integer
    console.log('getPercentualExterior:', { totalValorAtualGeral, exterior, percentual: roundedPercentual });
    return roundedPercentual;
  }

  private fetchAndCacheData(): void {
    forkJoin([
      this.dashboardSrv.getPatrimonioAcoes().pipe(take(1), catchError(() => of([]))),
      this.dashboardSrv.getPatrimonioFundos().pipe(take(1), catchError(() => of([]))),
      this.dashboardSrv.getPatrimonioCaixa().pipe(take(1), catchError(() => of([]))),
      this.dashboardSrv.getPatrimonioAssets().pipe(take(1), catchError(() => of([]))),
    ]).subscribe(
      ([acoes, fundos, caixa, assets]: [AtivoVO[], AtivoVO[], AtivoVO[], AtivoVO[]]) => {
        console.log('fetchAndCacheData: Data fetched', { acoes, fundos, caixa, assets });
        this.acoes = acoes;
        this.fundos = fundos;
        this.caixa = caixa;
        this.assets = assets;

        this.acoesDataSource.data = acoes;
        this.fundosDataSource.data = fundos;
        this.caixaDataSource.data = caixa;
        this.assetsDataSource.data = assets;
        this.cdr.markForCheck(); // Trigger change detection
      }
    );
  }

  private getChartOptions(
  series: number[],
  labels: string[],
  title: string,
  isPercentage: boolean
): ApexOptions {
  const hasData =
    series && series.length > 0 && labels && labels.length > 0 && !series.every(val => val === 0);
  const chartSeries = hasData ? series : [1];
  const chartLabels = hasData ? labels.map(label => String(label)) : ['Sem dados'];

  return {
    chart: {
      type: 'pie',
      height: 450, // Fixed height
      width: 300,  // Fixed width
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
        opacity: 0.2,
      },
      toolbar: { show: false },
      sparkline: { enabled: false }, // Ensure no sparkline mode
    },
    series: chartSeries,
    labels: chartLabels,
    colors: [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#EC4899',
      '#6EE7B7',
      '#FBBF24',
      '#FCA5A5',
    ],
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      fontFamily: 'Roboto, sans-serif',
      labels: {
        colors: '#374151', // Gray-700
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
        color: '#374151', // Gray-700
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
        color: '#6B7280',
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
      width: 2,
      colors: ['#FFFFFF'],
    },
  };
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
      console.log(`Instância anterior de ${chartId} destruída.`);
    }

    try {
      const newInstance = new ApexCharts(chartElement.nativeElement, options);
      newInstance.render();
      switch (chartId) {
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
      console.log(`Gráfico ${chartId} renderizado com sucesso.`);
    } catch (e) {
      console.error(`Erro ao renderizar gráfico ${chartId}:`, e);
    }
  }

  openTransactionDialog(): void {
    console.log('Abrindo diálogo de nova transação');
    const dialogRef = this.dialog.open(TransactionDialogComponent, {
      width: '600px',
      disableClose: true,
      autoFocus: true,
      data: {
        title: 'Nova Transação',
        action: 'create',
        transaction: null,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        console.log('Transação submetida:', result);
        if (this.currentUserId) {
          this.snackBar.open('Transação registrada com sucesso!', 'Fechar', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          this.loadData(this.currentUserId);
        } else {
          console.error('ID do usuário não disponível para recarregar dados após transação.');
          this.snackBar.open('Erro: ID do usuário não disponível.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        }
      } else {
        console.log('Diálogo fechado sem submissão');
      }
    });
  }



  // Método para iniciar a edição em linha
startEdit(element: AtivoVO, category: string): void {
    // Cancela qualquer edição em andamento antes de iniciar uma nova
    if (this.editingRowId !== null) {
      this.cancelEdit();
    }

    // Define o estado de edição
    this.editingRowId = element.id;
    this.originalAtivoBeforeEdit = JSON.parse(JSON.stringify(element)); // Cópia profunda para restaurar se cancelar
    this.currentEditedAtivo = { ...element, category }; // Adiciona a categoria ao objeto
    this.cdr.detectChanges(); // Força a atualização da view
  }

  // Método para cancelar a edição em linha
   cancelEdit(): void {
    if (this.editingRowId !== null && this.originalAtivoBeforeEdit) {
      let dataSourceToUpdate: MatTableDataSource<AtivoVO> | undefined;

      // Usar a categoria armazenada no currentEditedAtivo para determinar o dataSource
      const categoryOfEditedItem = (this.currentEditedAtivo as any)?.category;

      switch (categoryOfEditedItem) {
        case 'acoes':
          dataSourceToUpdate = this.acoesDataSource;
          break;
        case 'fundos':
          dataSourceToUpdate = this.fundosDataSource;
          break;
        case 'caixa':
          dataSourceToUpdate = this.caixaDataSource;
          break;
        case 'assets':
          dataSourceToUpdate = this.assetsDataSource;
          break;
      }

      if (dataSourceToUpdate) {
        const data = dataSourceToUpdate.data;
        const index = data.findIndex(item => item.id === this.editingRowId);
        if (index !== -1) {
          // Restaura o objeto original na posição correta
          data[index] = this.originalAtivoBeforeEdit;
          // Atribui uma nova referência ao 'data' para acionar a atualização da tabela
          dataSourceToUpdate.data = [...data];
          console.log(`Ativo com ID ${this.editingRowId} na categoria ${categoryOfEditedItem} restaurado para o estado original.`);
        }
      } else {
        console.warn(`Não foi possível determinar o DataSource para restaurar o ativo com ID ${this.editingRowId}.`);
      }
    }
    // Limpa os estados de edição
    this.editingRowId = null;
    this.currentEditedAtivo = null;
    this.originalAtivoBeforeEdit = null;
    this.cdr.markForCheck();
  }

  // Método para salvar a edição em linha
  saveEdit(element: AtivoVO, category: string): void {
    if (!this.currentEditedAtivo || !this.currentUserId) {
      console.error('Dados de edição ou ID do usuário não disponíveis para salvar.');
      this.snackBar.open('Erro ao salvar: dados incompletos.', 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    this.dashboardSrv
      .updateAtivo(this.currentUserId, this.currentEditedAtivo, category)
      .pipe(
        catchError((error) => {
          console.error(`Erro ao atualizar ativo na categoria ${category}:`, error);
          this.snackBar.open(error.message || 'Erro ao atualizar ativo.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          // Não limpa o estado de edição aqui, permitindo que o usuário tente novamente
          return of(null);
        }),
        finalize(() => {
          this.cdr.markForCheck(); // Garante que a UI é atualizada após a tentativa de salvar
        })
      )
      .subscribe((updateResult: any) => {
        if (updateResult !== null) {
          // Verifica se não houve erro capturado
          this.snackBar.open('Ativo atualizado com sucesso!', 'Fechar', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          this.editingRowId = null;
          this.currentEditedAtivo = null;
          this.originalAtivoBeforeEdit = null; // Limpa a cópia original após salvar com sucesso

          // Recarrega os dados após salvar para refletir quaisquer alterações no servidor
          // e garantir que todas as tabelas e gráficos estejam sincronizados.
          this.loadData(this.currentUserId!);
        }
      });
  }

  // Helper para verificar se a linha está em modo de edição
isEditing(element: AtivoVO, category: string): boolean {
  return this.editingRowId === element.id && (this.currentEditedAtivo as any)?.category === category;

}

  openDeleteDialog(element: AtivoVO, category: string): void {
    console.log(`Abrindo diálogo de exclusão para ${category}:`, element);
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
      if (result) {
        console.log(`Confirmada exclusão do ativo ${element.tickerFormatado} da categoria ${category}.`);
        if (this.currentUserId) {
          this.dashboardSrv
            .deleteAtivo(this.currentUserId, element.id, category)
            .pipe(
              catchError((error) => {
                console.error(`Erro ao excluir ativo ${element.tickerFormatado} da categoria ${category}:`, error);
                this.snackBar.open(error.message || 'Erro ao excluir ativo.', 'Fechar', {
                  duration: 5000,
                  panelClass: ['error-snackbar'],
                });
                return of(null);
              }),
              finalize(() => {
                this.cdr.markForCheck(); // Garante que a UI é atualizada
              })
            )
            .subscribe((deleteResult: any) => {
              if (deleteResult !== null) {
                this.snackBar.open('Ativo excluído com sucesso!', 'Fechar', {
                  duration: 3000,
                  panelClass: ['success-snackbar'],
                });
                this.loadData(this.currentUserId!); // Recarrega os dados após a exclusão
              }
            });
        } else {
          console.error('ID do usuário não disponível para excluir ativo.');
          this.snackBar.open('Erro: ID do usuário não disponível para exclusão.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        }
      } else {
        console.log('Exclusão cancelada.');
        this.snackBar.open('Exclusão cancelada.', 'Fechar', {
          duration: 3000,
          panelClass: ['info-snackbar'],
        });
      }
    });
  }
}

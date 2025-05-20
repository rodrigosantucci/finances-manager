import { Component, inject, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, NgZone, Renderer2 } from '@angular/core';
import { AsyncPipe, NgIf, CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { Observable, take, catchError, of, map, filter } from 'rxjs';
import { DashboardService, PatrimonioDistribuicaoVO, AtivoVO } from './dashboard.service';
import ApexCharts, { ApexOptions } from 'apexcharts';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MtxAlertModule } from '@ng-matero/extensions/alert';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SettingsService } from '@core/bootstrap/settings.service';
import { AuthService, User } from '@core/authentication';
import { PatrimonioService } from '../patrimonio/patrimonio.service';
import { CotacaoService } from '../cotacoes/cotacoes.service';
import { QuantidadeFormatPipe } from '@shared/pipes/quantidade-format.pipe';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MtxAlertModule,
    QuantidadeFormatPipe,
    FormsModule,
  ],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly dashboardSrv = inject(DashboardService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly settings = inject(SettingsService);
  private readonly patrimonioService = inject(PatrimonioService);
  private readonly cotacaoService = inject(CotacaoService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly renderer = inject(Renderer2);
  private readonly el = inject(ElementRef);
  private readonly authService = inject(AuthService);

  // Alerts
  introducingItems = [
    { name: 'BBDC4', description: 'Dividendos serão pagos em 29/06/2029.', link: 'https://github.com/acrodata/gui' },
    { name: 'BBDC4', description: 'Dividendos serão pagos em 29/06/2029.', link: 'https://github.com/acrodata/gui' },
    { name: 'BBDC4', description: 'Dividendos serão pagos em 29/06/2029.', link: 'https://github.com/acrodata/gui' },
    { name: 'BBDC4', description: 'Dividendos serão pagos em 29/06/2029.', link: 'https://github.com/acrodata/gui' },
  ];

  introducingItem = this.introducingItems[this.getRandom(0, 3)];

  // Data
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

  // Table columns
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

  // Chart management
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

  // UI state
  isLoading = true;
  hasError = false;
  isShowAlert = false;
  isUpdating = false;
  editingRow: { id: number; tipo: 'acoes' | 'fundos' | 'caixa' | 'assets' } | null = null;
  originalRow: AtivoVO | null = null;

  tema = this.settings.getThemeColor() as string;

  public getUserId(): number | undefined {
    return this.authService.user().getValue()?.id;
  }

  getRandom(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async onUpdateCotacoes(): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    const user = this.authService.user().getValue();
    const usuarioId = user?.id;

    if (usuarioId === undefined || usuarioId === null) {
      console.error("ID do usuário não disponível para atualizar cotações.");
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

        this.cotacaoService.atualizarCotacoes(tickers).subscribe({
          next: (cotacoes) => {
            this.snackBar.open('Cotações atualizadas com sucesso!', 'Fechar', {
              duration: 3000,
              panelClass: ['success-snackbar'],
            });
            window.location.reload();
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
    this.authService.user().pipe(
      filter(user => !!user?.id),
      take(1)
    ).subscribe(user => {
      console.log('Usuário autenticado detectado no Dashboard:', user);
      if (user) {
        this.loadData();
        this.setupCharts(user.id!);
      } else {
        console.error("ID do usuário não disponível para configurar gráficos.");
      }
      this.cdr.markForCheck();
    });

    this.loadTradingViewWidget();
  }

  private loadTradingViewWidget(): void {
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
    const tradingViewElement = this.el.nativeElement.querySelector('#tradingview-widget');
    if (tradingViewElement) {
      this.renderer.appendChild(tradingViewElement, script);
    } else {
      console.error("Elemento #tradingview-widget não encontrado no DOM.");
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.patrimoniochart$?.subscribe({
        next: (options) => {
          if (this.chartElement1?.nativeElement) {
            this.initChart(this.chartElement1, options, 'chart1');
          }
        },
        error: (err) => console.error('Error initializing patrimonio chart:', err),
      });

      this.acoesChart$?.subscribe({
        next: (options) => {
          if (this.chartElement2?.nativeElement) {
            this.initChart(this.chartElement2, options, 'chart2');
          }
        },
        error: (err) => console.error('Error initializing acoes chart:', err),
      });

      this.fundosChart$?.subscribe({
        next: (options) => {
          if (this.chartElement3?.nativeElement) {
            this.initChart(this.chartElement3, options, 'chart3');
          }
        },
        error: (err) => console.error('Error initializing fundos chart:', err),
      });

      this.caixaChart$?.subscribe({
        next: (options) => {
          if (this.chartElement4?.nativeElement) {
            this.initChart(this.chartElement4, options, 'chart4');
          }
        },
        error: (err) => console.error('Error initializing caixa chart:', err),
      });

      this.assetsChart$?.subscribe({
        next: (options) => {
          if (this.chartElement5?.nativeElement) {
            this.initChart(this.chartElement5, options, 'chart5');
          }
        },
        error: (err) => console.error('Error initializing assets chart:', err),
      });

      this.isLoading = false;
      this.cdr.markForCheck();
    }, 100);
  }

  ngOnDestroy() {
    if (this.chartInstance1) {
      this.chartInstance1.destroy();
      this.chartInstance1 = undefined;
      console.log('Instância de #chart1 destruída.');
    }
    if (this.chartInstance2) {
      this.chartInstance2.destroy();
      this.chartInstance2 = undefined;
      console.log('Instância de #chart2 destruída.');
    }
    if (this.chartInstance3) {
      this.chartInstance3.destroy();
      this.chartInstance3 = undefined;
      console.log('Instância de #chart3 destruída.');
    }
    if (this.chartInstance4) {
      this.chartInstance4.destroy();
      this.chartInstance4 = undefined;
      console.log('Instância de #chart4 destruída.');
    }
    if (this.chartInstance5) {
      this.chartInstance5.destroy();
      this.chartInstance5 = undefined;
      console.log('Instância de #chart5 destruída.');
    }
  }

  onAlertDismiss() {
    this.isShowAlert = false;
  }

  loadData(): void {
    const userId = this.authService.user().getValue()?.id;
    if (!userId) {
      console.error('User ID not available for loading data.');
      this.snackBar.open('ID do usuário não disponível.', 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      this.hasError = true;
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    console.log(`DashboardComponent: Iniciando carregamento de dados para usuário ${userId}...`);
    this.isLoading = true;
    this.hasError = false;
    this.cdr.markForCheck();

    this.dashboardSrv.getDistribuicaoPatrimonio().pipe(
      take(1),
      catchError(error => {
        console.error('Erro ao buscar distribuição de patrimônio:', error);
        this.hasError = true;
        this.isLoading = false;
        this.cdr.markForCheck();
        return of([]);
      })
    ).subscribe(distribuicao => {
      console.log('Dados recebidos para a tabela:', distribuicao);
      this.distribuicaoDataSource.data = distribuicao;
      this.cdr.markForCheck();
      this.isLoading = false;
    });

    this.dashboardSrv.getPatrimonioAcoes().pipe(
      catchError(error => {
        console.error('Erro ao carregar ações:', error);
        this.hasError = true;
        this.isLoading = false;
        this.cdr.markForCheck();
        return of([]);
      })
    ).subscribe(acoes => {
      console.log('Acoes Data:', acoes);
      this.acoesDataSource.data = acoes;
      this.cdr.markForCheck();
    });

    this.dashboardSrv.getPatrimonioFundos().pipe(
      catchError(error => {
        console.error('Erro ao carregar fundos:', error);
        this.hasError = true;
        this.isLoading = false;
        this.cdr.markForCheck();
        return of([]);
      })
    ).subscribe(fundos => {
      console.log('Fundos Data:', fundos);
      this.fundosDataSource.data = fundos;
      this.cdr.markForCheck();
    });

    this.dashboardSrv.getPatrimonioCaixa().pipe(
      catchError(error => {
        console.error('Erro ao carregar caixa:', error);
        this.hasError = true;
        this.isLoading = false;
        this.cdr.markForCheck();
        return of([]);
      })
    ).subscribe(caixa => {
      console.log('Caixa Data:', caixa);
      this.caixaDataSource.data = caixa;
      this.cdr.markForCheck();
    });

    this.dashboardSrv.getPatrimonioAssets().pipe(
      catchError(error => {
        console.error('Erro ao carregar assets:', error);
        this.hasError = true;
        this.isLoading = false;
        this.cdr.markForCheck();
        return of([]);
      })
    ).subscribe(assets => {
      console.log('Assets Data:', assets);
      this.assetsDataSource.data = assets;
      this.cdr.markForCheck();
    });
  }

  setupCharts(userId: number): void {
    console.log(`DashboardComponent: Configurando gráficos para usuário ${userId}...`);
    this.patrimoniochart$ = this.dashboardSrv.getDistribuicaoPatrimonio().pipe(
      catchError(error => {
        console.error('Erro ao buscar dados para #chart1:', error);
        this.hasError = true;
        this.isLoading = false;
        this.cdr.markForCheck();
        return of([]);
      }),
      map((distribuicao: PatrimonioDistribuicaoVO[]) => {
        console.log('Dados brutos para #chart1:', distribuicao);
        const validDistribuicao = distribuicao.filter(
          d => typeof d.valorTotal === 'number' && d.valorTotal >= 0 && typeof d.tipoAtivo === 'string' && d.tipoAtivo.trim() !== ''
        );
        const totalValor = validDistribuicao.reduce((sum, d) => sum + d.valorTotal, 0);
        const series = validDistribuicao.map(d => d.percentual);
        const labels = validDistribuicao.map(d => d.tipoAtivo);
        console.log('Series para #chart1 (valores):', series);
        console.log('Labels para #chart1:', labels);
        console.log('Total Valor:', totalValor);

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
          a => !isNaN(parseFloat(a.valorAtualFormatado)) && parseFloat(a.valorAtualFormatado) >= 0 && a.tickerFormatado?.trim() !== ''
        );
        const series = validAcoes.map(a => parseFloat(a.valorAtualFormatado));
        const labels = validAcoes.map(a => a.tickerFormatado);
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
          f => !isNaN(parseFloat(f.valorAtualFormatado)) && parseFloat(f.valorAtualFormatado) >= 0 && f.tickerFormatado?.trim() !== ''
        );
        const series = validFundos.map(f => parseFloat(f.valorAtualFormatado));
        const labels = validFundos.map(f => f.tickerFormatado);
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
          c => !isNaN(parseFloat(c.valorAtualFormatado)) && parseFloat(c.valorAtualFormatado) >= 0 && c.tickerFormatado?.trim() !== ''
        );
        const series = validCaixa.map(c => parseFloat(c.valorAtualFormatado));
        const labels = validCaixa.map(c => c.tickerFormatado);
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
          a => !isNaN(parseFloat(a.valorAtualFormatado)) && parseFloat(a.valorAtualFormatado) >= 0 && a.tickerFormatado?.trim() !== ''
        );
        const series = validAssets.map(a => parseFloat(a.valorAtualFormatado));
        const labels = validAssets.map(a => a.tickerFormatado);
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

  getTotalInvestido(): number {
    const total = this.distribuicaoDataSource.data.reduce((sum, item) => sum + (item.valorTotal || 0), 0);
    console.log('Total Investido (da distribuição):', total);
    return total;
  }

  getTotalValorInvestidoAcoes(): number {
    return this.acoesDataSource.data.reduce((sum, item) => sum + (parseFloat(item.valorInvestidoFormatado) || 0), 0);
  }

  getTotalValorInvestidoFundos(): number {
    return this.fundosDataSource.data.reduce((sum, item) => sum + (parseFloat(item.valorInvestidoFormatado) || 0), 0);
  }

  getTotalValorInvestidoCaixa(): number {
    return this.caixaDataSource.data.reduce((sum, item) => sum + (parseFloat(item.valorInvestidoFormatado) || 0), 0);
  }

  getTotalValorInvestidoAssets(): number {
    return this.assetsDataSource.data.reduce((sum, item) => sum + (parseFloat(item.valorInvestidoFormatado) || 0), 0);
  }

  getTotalValorAtualAcoes(): number {
    return this.acoesDataSource.data.reduce((sum, item) => sum + (parseFloat(item.valorAtualFormatado) || 0), 0);
  }

  getTotalValorAtualFundos(): number {
    return this.fundosDataSource.data.reduce((sum, item) => sum + (parseFloat(item.valorAtualFormatado) || 0), 0);
  }

  getTotalValorAtualCaixa(): number {
    return this.caixaDataSource.data.reduce((sum, item) => sum + (parseFloat(item.valorAtualFormatado) || 0), 0);
  }

  getTotalValorAtualAssets(): number {
    return this.assetsDataSource.data.reduce((sum, item) => sum + (parseFloat(item.valorAtualFormatado) || 0), 0);
  }

  getTotalLucroPrejuizoAcoes(): number {
    return this.acoesDataSource.data.reduce((sum, item) => sum + (parseFloat(item.lucroPrejuizoFormatado) || 0), 0);
  }

  getTotalLucroPrejuizoFundos(): number {
    return this.fundosDataSource.data.reduce((sum, item) => sum + (parseFloat(item.lucroPrejuizoFormatado) || 0), 0);
  }

  getTotalLucroPrejuizoCaixa(): number {
    return this.caixaDataSource.data.reduce((sum, item) => sum + (parseFloat(item.lucroPrejuizoFormatado) || 0), 0);
  }

  getTotalLucroPrejuizoAssets(): number {
    return this.assetsDataSource.data.reduce((sum, item) => sum + (parseFloat(item.lucroPrejuizoFormatado) || 0), 0);
  }

  getPercentualRF(): number {
    const totalValorAtualGeral = this.getTotalValorAtualAcoes() + this.getTotalValorAtualFundos() + this.getTotalValorAtualCaixa() + this.getTotalValorAtualAssets();
    const rf = this.getTotalValorAtualCaixa();
    const percentual = totalValorAtualGeral > 0 ? (rf / totalValorAtualGeral) * 100 : 0;
    return Math.round(percentual);
  }

  getPercentualRV(): number {
    const totalValorAtualGeral = this.getTotalValorAtualAcoes() + this.getTotalValorAtualFundos() + this.getTotalValorAtualCaixa() + this.getTotalValorAtualAssets();
    const rv = this.getTotalValorAtualAcoes() + this.getTotalValorAtualFundos() + this.getTotalValorAtualAssets();
    const percentual = totalValorAtualGeral > 0 ? (rv / totalValorAtualGeral) * 100 : 0;
    return Math.round(percentual);
  }

  private getChartOptions(series: number[], labels: string[], title: string, isPercentage: boolean): ApexOptions {
    const chartSeries = series && series.length > 0 ? series : [1];
    const chartLabels = labels && labels.length > 0 ? labels.map(label => String(label)) : ['Sem dados'];

    return {
      chart: {
        type: 'pie',
        height: 350,
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
          opacity: 0.2,
        },
        toolbar: { show: false },
      },
      series: chartSeries,
      labels: chartLabels,
      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
      title: {
        text: title,
        align: 'center',
        style: {
          fontSize: '16px',
          fontWeight: '600',
          fontFamily: 'Roboto, sans-serif',
          color: '#979899',
        },
      },
      legend: {
        position: 'top',
        fontSize: '12px',
        fontFamily: 'Roboto, sans-serif',
        fontWeight: 400,
        labels: { colors: '#979899' },
        markers: {
          size: 10,
          offsetX: -2,
        },
        itemMargin: { horizontal: 8, vertical: 4 },
        formatter: (seriesName, opts) => {
          const value = opts.w.globals.series[opts.seriesIndex];
          if (chartLabels[0] === 'Sem dados') {
            return seriesName;
          }
          return `${seriesName}: ${isPercentage ? value.toFixed(1) + '%' : 'R$ ' + value.toFixed(2)}`;
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => (isPercentage ? `${val.toFixed(1)}%` : `${val.toFixed(0)}%`),
        style: {
          fontSize: '12px',
          fontFamily: 'Roboto, sans-serif',
          fontWeight: '500',
          colors: ['#FFFFFF'],
        },
        dropShadow: {
          enabled: true,
          top: 1,
          left: 1,
          blur: 2,
          opacity: 0.5,
        },
      },
      responsive: [
        {
          breakpoint: 640,
          options: {
            chart: { height: 300 },
            legend: {
              position: 'bottom',
              fontSize: '11px',
              itemMargin: { horizontal: 6, vertical: 3 },
            },
            dataLabels: { style: { fontSize: '11px' } },
          },
        },
        {
          breakpoint: 480,
          options: {
            chart: { height: 250 },
            legend: { fontSize: '10px' },
            dataLabels: { style: { fontSize: '10px' } },
          },
        },
      ],
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
          fontSize: '12px',
          fontFamily: 'Roboto, sans-serif',
        },
        y: {
          formatter: val => (isPercentage ? `${val.toFixed(1)}%` : `R$ ${val.toFixed(2)}`),
        },
      },
      stroke: {
        width: 2,
        colors: ['#FFFFFF'],
      },
    };
  }

  private initChart(chartElement: ElementRef<HTMLDivElement>, options: ApexOptions, chartId: string): void {
    console.log(`Iniciando inicialização do gráfico ${chartId} com opções:`, options);
    if (!chartElement?.nativeElement) {
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
      console.log(`Renderizando gráfico em ${chartId}`);
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
    this.snackBar.open('Funcionalidade de nova transação não implementada para edição inline.', 'Fechar', {
      duration: 5000,
      panelClass: ['info-snackbar'],
    });
  }

  startEditing(row: AtivoVO, tipo: 'acoes' | 'fundos' | 'caixa' | 'assets'): void {
    console.log(`[DEBUG] Iniciando edição: ID=${row.id}, Tipo=${tipo}, Ticker=${row.tickerFormatado}`);
    this.editingRow = { id: row.id, tipo };
    // Deep copy to prevent mutation issues
    this.originalRow = JSON.parse(JSON.stringify(row));
    this.refreshTable(tipo);
    this.cdr.markForCheck();
  }

  saveEdit(row: AtivoVO, tipo: 'acoes' | 'fundos' | 'caixa' | 'assets'): void {
    console.log(`[DEBUG] Salvando edição: ID=${row.id}, Tipo=${tipo}, Dados=`, row);
    const userId = this.authService.user().getValue()?.id;
    if (!userId) {
      this.snackBar.open('ID do usuário não disponível.', 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      this.cancelEdit();
      return;
    }

    // Validate all fields
    if (!row.tickerFormatado || !row.descricaoFormatada ||
        isNaN(parseFloat(row.quantidadeFormatada as any)) || isNaN(parseFloat(row.precoMedioFormatado as any)) ||
        isNaN(parseFloat(row.valorInvestidoFormatado as any)) || isNaN(parseFloat(row.valorAtualFormatado as any)) ||
        isNaN(parseFloat(row.lucroPrejuizoFormatado as any))) {
      this.snackBar.open('Todos os campos são obrigatórios e devem ser válidos.', 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    this.patrimonioService.editAtivo(userId, row).subscribe({
      next: (updatedRow) => {
        console.log(`[DEBUG] Ativo atualizado com sucesso: ID=${updatedRow.id}, Tipo=${tipo}`);
        this.snackBar.open('Ativo editado com sucesso!', 'Fechar', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        const dataSource = this.getDataSource(tipo);
        const data = [...dataSource.data];
        const index = data.findIndex(item => item.id === row.id);
        if (index !== -1) {
          data[index] = { ...updatedRow };
          dataSource.data = data;
        }
        this.editingRow = null;
        this.originalRow = null;
        this.refreshTable(tipo);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('[ERROR] Erro ao salvar ativo:', error);
        this.snackBar.open(error.message || 'Erro ao salvar ativo', 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  cancelEdit(): void {
    console.log('[DEBUG] Cancelando edição');
    if (this.originalRow && this.editingRow) {
      console.log(`[DEBUG] Restaurando dados originais: ID=${this.editingRow.id}, Tipo=${this.editingRow.tipo}`);
      const dataSource = this.getDataSource(this.editingRow.tipo);
      const data = [...dataSource.data];
      const index = this.editingRow ? data.findIndex(item => item.id === this.editingRow!.id) : -1;
      if (index !== -1) {
        data[index] = JSON.parse(JSON.stringify(this.originalRow));
        dataSource.data = data;
      }
      this.refreshTable(this.editingRow.tipo);
    }
    this.editingRow = null;
    this.originalRow = null;
    this.cdr.markForCheck();
  }

  deleteAtivo(ativoId: number, tipo: 'acoes' | 'fundos' | 'caixa' | 'assets'): void {
    console.log(`[DEBUG] Excluindo ativo: ID=${ativoId}, Tipo=${tipo}`);
    const userId = this.authService.user().getValue()?.id;
    if (!userId) {
      this.snackBar.open('ID do usuário não disponível.', 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    this.patrimonioService.deleteAtivo(userId, ativoId).subscribe({
      next: () => {
        console.log(`[DEBUG] Ativo excluído com sucesso: ID=${ativoId}, Tipo=${tipo}`);
        this.snackBar.open('Ativo excluído com sucesso!', 'Fechar', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        const dataSource = this.getDataSource(tipo);
        dataSource.data = dataSource.data.filter(item => item.id !== ativoId);
        this.refreshTable(tipo);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('[ERROR] Erro ao excluir ativo:', error);
        this.snackBar.open(error.message || 'Erro ao excluir ativo', 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  private getDataSource(tipo: 'acoes' | 'fundos' | 'caixa' | 'assets'): MatTableDataSource<AtivoVO> {
    switch (tipo) {
      case 'acoes':
        return this.acoesDataSource;
      case 'fundos':
        return this.fundosDataSource;
      case 'caixa':
        return this.caixaDataSource;
      case 'assets':
        return this.assetsDataSource;
      default:
        console.warn('[WARN] Tipo de datasource não especificado, retornando acoesDataSource como padrão.');
        return this.acoesDataSource;
    }
  }

  private refreshTable(tipo: 'acoes' | 'fundos' | 'caixa' | 'assets'): void {
    const dataSource = this.getDataSource(tipo);
    dataSource.data = [...dataSource.data];
    console.log(`[DEBUG] Tabela atualizada: Tipo=${tipo}, Dados=`, dataSource.data);
  }

}

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
import { AsyncPipe, NgIf, CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Observable, take, catchError, of, map, filter } from 'rxjs';
import { DashboardService, PatrimonioDistribuicaoVO, AtivoVO } from './dashboard.service';
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
    ConfirmDialogComponent, // Adicionado pois é usado na classe
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

  // Removido itens de introdução duplicados e ajustada a lógica
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

  tema = this.settings.getThemeColor() as string;

  getRandom(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async onUpdateCotacoes(): Promise<void> {
    if (this.isUpdating) return;
    this.isUpdating = true;

    this.authService.user().pipe(
      filter(user => !!user?.id),
      take(1),
      // Adicionado catchError para lidar com erros na obtenção do usuário
      catchError(error => {
        console.error('Erro ao buscar usuário para atualização de cotações:', error);
        this.snackBar.open('Erro ao buscar informações do usuário.', 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
        this.isUpdating = false;
        return of(null); // Retorna um Observable de null para continuar a cadeia
      })
    ).subscribe(user => {
      if (!user?.id) {
        console.error('ID do usuário não disponível para atualizar cotações.');
        this.snackBar.open('ID do usuário não disponível para atualizar cotações.', 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
        this.isUpdating = false;
        return;
      }

      const usuarioId = user.id;

      this.patrimonioService.getUserTickers(usuarioId).pipe(
        take(1), // Garante que a subscrição seja concluída após o primeiro valor
        catchError(error => {
          console.error('Erro ao buscar tickers:', error);
          this.snackBar.open(error.message || 'Erro ao buscar tickers', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          this.isUpdating = false;
          return of([]); // Retorna um Observable de array vazio para continuar a cadeia
        })
      ).subscribe((tickers) => {
        if (tickers.length === 0) {
          this.snackBar.open('Nenhum ticker encontrado no patrimônio.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          this.isUpdating = false;
          return;
        }

        this.cotacaoService.atualizarCotacoes(tickers).pipe(
          take(1), // Garante que a subscrição seja concluída após o primeiro valor
          catchError(error => {
            console.error('Erro ao atualizar cotações:', error);
            this.snackBar.open(error.message || 'Erro ao atualizar cotações', 'Fechar', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
            this.isUpdating = false;
            return of(null); // Retorna um Observable de null para continuar a cadeia
          })
        ).subscribe(() => {
          this.snackBar.open('Cotações atualizadas com sucesso!', 'Fechar', {
            duration: 3000,
            panelClass: ['success-snackbar'],
          });
          // Não usar window.location.reload() diretamente. Recarregar os dados é suficiente.
          this.loadData(usuarioId);
          this.isUpdating = false;
        });
      });
    });
  }

  ngOnInit() {
    this.authService.user().pipe(
      filter(user => !!user?.id),
      take(1)
    ).subscribe(user => {
      if (user?.id) {
        if (user.id !== undefined) {
          if (user.id !== undefined) {
            if (user.id !== undefined) {
              this.loadData(user.id);
            } else {
              console.error('ID do usuário não está definido.');
              this.snackBar.open('Erro: ID do usuário não está definido.', 'Fechar', {
                duration: 5000,
                panelClass: ['error-snackbar'],
              });
            }
          } else {
            console.error('ID do usuário não está definido.');
            this.snackBar.open('Erro: ID do usuário não está definido.', 'Fechar', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
          }
        } else {
          console.error('ID do usuário não está definido.');
          this.snackBar.open('Erro: ID do usuário não está definido.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        }
        this.setupCharts(user.id);
      } else {
        console.error('ID do usuário não disponível para carregar dados e configurar gráficos.');
        this.hasError = true;
        this.isLoading = false;
      }
      this.cdr.markForCheck();
    });

    this.loadTradingViewWidget();
  }

  private loadTradingViewWidget(): void {
    const tradingViewElement = this.el.nativeElement.querySelector('#tradingview-widget');
    if (!tradingViewElement) {
      console.error('Elemento #tradingview-widget não encontrado no DOM.');
      return;
    }

    // Limpa o conteúdo existente para evitar duplicação em caso de chamadas múltiplas
    this.renderer.setProperty(tradingViewElement, 'innerHTML', '');

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
        { description: 'USD to BRL', proName: 'FX_IDC:USDBRL' }
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
    // Usar um timer para garantir que as ViewChild estejam disponíveis.
    // O tempo de 100ms é uma heurística, dependendo da complexidade do template.
    setTimeout(() => {
      this.patrimoniochart$?.subscribe({
        next: (options) => {
          if (this.chartElement1?.nativeElement) {
            this.initChart(this.chartElement1, options, 'chart1');
          }
        },
        error: (err) => {
          console.error('Erro ao inicializar gráfico de patrimônio:', err);
          this.hasError = true;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });

      this.acoesChart$?.subscribe({
        next: (options) => {
          if (this.chartElement2?.nativeElement) {
            this.initChart(this.chartElement2, options, 'chart2');
          }
        },
        error: (err) => {
          console.error('Erro ao inicializar gráfico de ações:', err);
          this.hasError = true;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });

      this.fundosChart$?.subscribe({
        next: (options) => {
          if (this.chartElement3?.nativeElement) {
            this.initChart(this.chartElement3, options, 'chart3');
          }
        },
        error: (err) => {
          console.error('Erro ao inicializar gráfico de fundos:', err);
          this.hasError = true;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });

      this.caixaChart$?.subscribe({
        next: (options) => {
          if (this.chartElement4?.nativeElement) {
            this.initChart(this.chartElement4, options, 'chart4');
          }
        },
        error: (err) => {
          console.error('Erro ao inicializar gráfico de caixa:', err);
          this.hasError = true;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });

      this.assetsChart$?.subscribe({
        next: (options) => {
          if (this.chartElement5?.nativeElement) {
            this.initChart(this.chartElement5, options, 'chart5');
          }
        },
        error: (err) => {
          console.error('Erro ao inicializar gráfico de assets:', err);
          this.hasError = true;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });

      this.isLoading = false;
      this.cdr.markForCheck();
    }, 100);
  }

  ngOnDestroy() {
    // Destruir todas as instâncias de gráfico para evitar vazamentos de memória
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

  loadData(userId: number): void {
    console.log(`DashboardComponent: Iniciando carregamento de dados para usuário ${userId}...`);
    this.isLoading = true;
    this.hasError = false;
    this.cdr.markForCheck();

    const handleError = (error: any, context: string) => {
      console.error(`Erro ao buscar ${context}:`, error);
      this.hasError = true;
      this.isLoading = false; // Define isLoading para false apenas no primeiro erro
      this.cdr.markForCheck();
      return of([]);
    };

    this.dashboardSrv.getDistribuicaoPatrimonio().pipe(
      take(1),
      catchError(error => handleError(error, 'distribuição de patrimônio'))
    ).subscribe(distribuicao => {
      console.log('Dados recebidos para a tabela de distribuição:', distribuicao);
      this.distribuicaoDataSource.data = distribuicao;
      this.cdr.markForCheck();
      // Não definir isLoading aqui, pois outros Observables ainda podem estar carregando
    });

    this.dashboardSrv.getPatrimonioAcoes().pipe(
      catchError(error => handleError(error, 'ações'))
    ).subscribe(acoes => {
      console.log('Acoes Data:', acoes);
      this.acoesDataSource.data = acoes;
      this.cdr.markForCheck();
    });

    this.dashboardSrv.getPatrimonioFundos().pipe(
      catchError(error => handleError(error, 'fundos'))
    ).subscribe(fundos => {
      console.log('Fundos Data:', fundos);
      this.fundosDataSource.data = fundos;
      this.cdr.markForCheck();
    });

    this.dashboardSrv.getPatrimonioCaixa().pipe(
      catchError(error => handleError(error, 'caixa'))
    ).subscribe(caixa => {
      console.log('Caixa Data:', caixa);
      this.caixaDataSource.data = caixa;
      this.cdr.markForCheck();
    });

    this.dashboardSrv.getPatrimonioAssets().pipe(
      catchError(error => handleError(error, 'assets'))
    ).subscribe(assets => {
      console.log('Assets Data:', assets);
      this.assetsDataSource.data = assets;
      this.cdr.markForCheck();
      // Somente após o último Observable ser concluído (ou erro), definir isLoading para false
      // Isso pode ser melhor gerenciado com um 'forkJoin' se todos os dados forem estritamente necessários ao mesmo tempo.
      // Para este caso, manter individualmente, mas ciente que isLoading pode ser true por mais tempo.
      // Se todos os dados acima são carregados em paralelo, o isLoading final deve ser no `ngAfterViewInit` ou em um `forkJoin`.
      // Como o `isLoading` é definido para `false` no `ngAfterViewInit`, o comportamento atual está ok.
    });
  }

  setupCharts(userId: number): void {
    console.log(`DashboardComponent: Configurando gráficos para usuário ${userId}...`);

    const createChartObservable = (
      dataSource: MatTableDataSource<AtivoVO> | MatTableDataSource<PatrimonioDistribuicaoVO>,
      title: string,
      isPercentage: boolean,
      valueExtractor: (item: any) => number,
      labelExtractor: (item: any) => string,
      filterCondition: (item: any) => boolean
    ): Observable<ApexOptions> => {
      return dataSource.connect().pipe(
        map((data: any[]) => {
          const validData = data.filter(filterCondition);
          const series = validData.map(valueExtractor);
          const labels = validData.map(labelExtractor);

          if (series.length === 0 || labels.length === 0 || series.length !== labels.length) {
            console.warn(`Dados insuficientes ou inconsistentes para o gráfico "${title}".`, { series, labels, data });
            return this.getChartOptions([], [], title, isPercentage);
          }
          return this.getChartOptions(series, labels, title, isPercentage);
        }),
        catchError(error => {
          console.error(`Erro ao buscar dados para o gráfico "${title}":`, error);
          this.hasError = true;
          this.isLoading = false;
          this.cdr.markForCheck();
          return of(this.getChartOptions([], [], title, isPercentage)); // Retorna opções vazias em caso de erro
        })
      );
    };

    this.patrimoniochart$ = createChartObservable(
      this.distribuicaoDataSource,
      'Distribuição de Patrimônio',
      true,
      (d: PatrimonioDistribuicaoVO) => d.percentual,
      (d: PatrimonioDistribuicaoVO) => d.tipoAtivo,
      (d: PatrimonioDistribuicaoVO) => typeof d.valorTotal === 'number' && d.valorTotal >= 0 && typeof d.tipoAtivo === 'string' && d.tipoAtivo.trim() !== ''
    );

    this.acoesChart$ = createChartObservable(
      this.acoesDataSource,
      'Patrimônio em Ações',
      false,
      (a: AtivoVO) => parseFloat(a.valorAtualFormatado),
      (a: AtivoVO) => a.tickerFormatado,
      (a: AtivoVO) => !isNaN(parseFloat(a.valorAtualFormatado)) && parseFloat(a.valorAtualFormatado) >= 0 && a.tickerFormatado?.trim() !== ''
    );

    this.fundosChart$ = createChartObservable(
      this.fundosDataSource,
      'Patrimônio em Fundos',
      false,
      (f: AtivoVO) => parseFloat(f.valorAtualFormatado),
      (f: AtivoVO) => f.tickerFormatado,
      (f: AtivoVO) => !isNaN(parseFloat(f.valorAtualFormatado)) && parseFloat(f.valorAtualFormatado) >= 0 && f.tickerFormatado?.trim() !== ''
    );

    this.caixaChart$ = createChartObservable(
      this.caixaDataSource,
      'Patrimônio em Caixa',
      false,
      (c: AtivoVO) => parseFloat(c.valorAtualFormatado),
      (c: AtivoVO) => c.descricaoFormatada, // Usar descrição para caixa se ticker não for tão relevante
      (c: AtivoVO) => !isNaN(parseFloat(c.valorAtualFormatado)) && parseFloat(c.valorAtualFormatado) >= 0 && c.descricaoFormatada?.trim() !== ''
    );

    this.assetsChart$ = createChartObservable(
      this.assetsDataSource,
      'Patrimônio em Ativos Internacionais', // Alterado para "Ativos Internacionais"
      false,
      (a: AtivoVO) => parseFloat(a.valorAtualFormatado),
      (a: AtivoVO) => a.tickerFormatado,
      (a: AtivoVO) => !isNaN(parseFloat(a.valorAtualFormatado)) && parseFloat(a.valorAtualFormatado) >= 0 && a.tickerFormatado?.trim() !== ''
    );
  }

  getTotalInvestido(): number {
    const total = this.distribuicaoDataSource.data.reduce((sum, item) => sum + (item.valorTotal || 0), 0);
    // console.log('Total Investido (da distribuição):', total); // Removido log excessivo
    return total;
  }

  // Métodos de totalização simplificados e corrigidos para segurança de tipo
  getTotalValorInvestidoAcoes(): number {
    return this.acoesDataSource.data.reduce((sum, item) => sum + (item.valorInvestidoFormatado ? parseFloat(item.valorInvestidoFormatado) : 0), 0);
  }

  getTotalValorInvestidoFundos(): number {
    return this.fundosDataSource.data.reduce((sum, item) => sum + (item.valorInvestidoFormatado ? parseFloat(item.valorInvestidoFormatado) : 0), 0);
  }

  getTotalValorInvestidoCaixa(): number {
    return this.caixaDataSource.data.reduce((sum, item) => sum + (item.valorInvestidoFormatado ? parseFloat(item.valorInvestidoFormatado) : 0), 0);
  }

  getTotalValorInvestidoAssets(): number {
    return this.assetsDataSource.data.reduce((sum, item) => sum + (item.valorInvestidoFormatado ? parseFloat(item.valorInvestidoFormatado) : 0), 0);
  }

  getTotalValorAtualAcoes(): number {
    return this.acoesDataSource.data.reduce((sum, item) => sum + (item.valorAtualFormatado ? parseFloat(item.valorAtualFormatado) : 0), 0);
  }

  getTotalValorAtualFundos(): number {
    return this.fundosDataSource.data.reduce((sum, item) => sum + (item.valorAtualFormatado ? parseFloat(item.valorAtualFormatado) : 0), 0);
  }

  getTotalValorAtualCaixa(): number {
    return this.caixaDataSource.data.reduce((sum, item) => sum + (item.valorAtualFormatado ? parseFloat(item.valorAtualFormatado) : 0), 0);
  }

  getTotalValorAtualAssets(): number {
    return this.assetsDataSource.data.reduce((sum, item) => sum + (item.valorAtualFormatado ? parseFloat(item.valorAtualFormatado) : 0), 0);
  }

  getTotalLucroPrejuizoAcoes(): number {
    return this.acoesDataSource.data.reduce((sum, item) => sum + (item.lucroPrejuizoFormatado ? parseFloat(item.lucroPrejuizoFormatado) : 0), 0);
  }

  getTotalLucroPrejuizoFundos(): number {
    return this.fundosDataSource.data.reduce((sum, item) => sum + (item.lucroPrejuizoFormatado ? parseFloat(item.lucroPrejuizoFormatado) : 0), 0);
  }

  getTotalLucroPrejuizoCaixa(): number {
    return this.caixaDataSource.data.reduce((sum, item) => sum + (item.lucroPrejuizoFormatado ? parseFloat(item.lucroPrejuizoFormatado) : 0), 0);
  }

  getTotalLucroPrejuizoAssets(): number {
    return this.assetsDataSource.data.reduce((sum, item) => sum + (item.lucroPrejuizoFormatado ? parseFloat(item.lucroPrejuizoFormatado) : 0), 0);
  }

  getPercentualRF(): number {
    const totalValorAtualGeral = this.getTotalValorAtualAcoes() + this.getTotalValorAtualFundos() + this.getTotalValorAtualCaixa() + this.getTotalValorAtualAssets();
    const rf = this.getTotalValorAtualCaixa(); // Considerando Caixa como Renda Fixa
    const percentual = totalValorAtualGeral > 0 ? (rf / totalValorAtualGeral) * 100 : 0;
    return Math.round(percentual);
  }

  getPercentualRV(): number {
    const totalValorAtualGeral = this.getTotalValorAtualAcoes() + this.getTotalValorAtualFundos() + this.getTotalValorAtualCaixa() + this.getTotalValorAtualAssets();
    const rv = this.getTotalValorAtualAcoes() + this.getTotalValorAtualFundos() + this.getTotalValorAtualAssets(); // Ações, Fundos e Assets como Renda Variável
    const percentual = totalValorAtualGeral > 0 ? (rv / totalValorAtualGeral) * 100 : 0;
    return Math.round(percentual);
  }

  private getChartOptions(series: number[], labels: string[], title: string, isPercentage: boolean): ApexOptions {
    const hasData = series && series.length > 0 && labels && labels.length > 0 && !series.every(val => val === 0);
    const chartSeries = hasData ? series : [1];
    const chartLabels = hasData ? labels.map(label => String(label)) : ['Sem dados'];

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
      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6EE7B7', '#FBBF24', '#FCA5A5'], // Mais cores para mais diversidade
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
          if (!hasData) {
            return 'Sem dados';
          }
          return `${seriesName}: ${isPercentage ? value.toFixed(1) + '%' : 'R$ ' + value.toFixed(2)}`;
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => (hasData ? (isPercentage ? `${val.toFixed(1)}%` : `${val.toFixed(0)}%`) : ''),
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
          formatter: val => (hasData ? (isPercentage ? `${val.toFixed(1)}%` : `R$ ${val.toFixed(2)}`) : 'Sem dados'),
        },
      },
      stroke: {
        width: 2,
        colors: ['#FFFFFF'],
      },
    };
  }

  private initChart(chartElement: ElementRef<HTMLDivElement>, options: ApexOptions, chartId: string): void {
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
        this.authService.user().pipe(take(1)).subscribe(user => {
          if (user?.id) {
            this.snackBar.open('Transação registrada com sucesso!', 'Fechar', {
              duration: 3000,
              panelClass: ['success-snackbar'],
            });
            this.loadData(user.id);
          } else {
            console.error('ID do usuário não disponível para recarregar dados após transação.');
            this.snackBar.open('Erro: ID do usuário não disponível.', 'Fechar', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
          }
        });
      } else {
        console.log('Diálogo fechado sem submissão');
      }
    });
  }

  openEditDialog(element: AtivoVO, category: string): void {
    console.log(`Abrindo diálogo de edição para ${category}:`, element);
    const dialogRef = this.dialog.open(TransactionDialogComponent, {
      width: '600px',
      disableClose: true,
      autoFocus: true,
      data: {
        title: `Editar ${category}`,
        action: 'edit',
        transaction: element,
        category
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        console.log(`Edição submetida para ${category}:`, result);
        this.authService.user().pipe(take(1)).subscribe(user => {
          if (user?.id) {
            this.dashboardSrv.updateAtivo(user.id, result, result.category).pipe(
              catchError(error => {
                console.error(`Erro ao atualizar ativo na categoria ${result.category}:`, error);
                this.snackBar.open('Erro ao atualizar ativo.', 'Fechar', {
                  duration: 5000,
                  panelClass: ['error-snackbar'],
                });
                return of(null);
              })
            ).subscribe((updateResult) => {
              if (updateResult) {
                this.snackBar.open('Ativo atualizado com sucesso!', 'Fechar', {
                  duration: 3000,
                  panelClass: ['success-snackbar'],
                });
                this.loadData(user.id);
              }
            });
          } else {
            console.error('ID do usuário não disponível para recarregar dados após edição.');
            this.snackBar.open('Erro: ID do usuário não disponível.', 'Fechar', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
          }
        });
      } else {
        console.log('Diálogo de edição fechado sem submissão');
      }
    });
  }

  openDeleteDialog(element: AtivoVO, category: string): void {
    console.log(`Abrindo diálogo de exclusão para ${category}:`, element);
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar Exclusão',
        message: `Tem certeza que deseja excluir o ativo "${element.tickerFormatado}" (${element.descricaoFormatada}) da categoria "${category}"?`,
      },
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.authService.user().pipe(take(1)).subscribe(user => {
          if (user?.id && element.id) {
            this.dashboardSrv.deleteAtivo(user.id, element.id, category).pipe(
              catchError(error => {
                console.error(`Erro ao excluir ativo da categoria ${category}:`, error);
                this.snackBar.open('Erro ao excluir ativo.', 'Fechar', {
                  duration: 5000,
                  panelClass: ['error-snackbar'],
                });
                return of(null);
              })
            ).subscribe((deleteResult: any) => {
              if (deleteResult) {
                this.snackBar.open('Ativo excluído com sucesso!', 'Fechar', {
                  duration: 3000,
                  panelClass: ['success-snackbar'],
                });
                this.loadData(user.id);
              }
            });
          } else {
            console.error('ID do usuário ou do ativo não disponível para exclusão.');
            this.snackBar.open('Erro: ID do usuário ou do ativo não disponível.', 'Fechar', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
          }
        });
      } else {
        console.log('Diálogo de exclusão cancelado.');
      }
    });
  }
}

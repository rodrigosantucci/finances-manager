import { Component, inject, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MtxPhotoviewerModule } from '@ng-matero/extensions/photoviewer';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { PageHeaderComponent } from '@shared';
import { HttpClient } from '@angular/common/http';
import { map, take, takeUntil } from 'rxjs/operators';
import { Observable, Subject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { NgIf, NgFor } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SettingsService } from '@core/bootstrap/settings.service';
import { AuthService } from '@core/authentication';

@Component({
  selector: 'app-assets-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  standalone: true,
  imports: [
    MatGridListModule,
    MtxPhotoviewerModule,
    PageHeaderComponent,
    MatCardModule,
    MtxSelectModule,
    MatFormFieldModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatTooltipModule,
  ],
})
export class AssetsStatsComponent implements OnInit, OnDestroy {
  private readonly dialog = inject(MatDialog);
  private readonly http = inject(HttpClient);
  private readonly renderer = inject(Renderer2);
  private readonly snackBar = inject(MatSnackBar);
  private readonly settings = inject(SettingsService);
  private readonly authService = inject(AuthService);


  temaSelecionado = this.settings.getThemeColor();
  currentTheme: 'light' | 'dark' = this.temaSelecionado;
  private readonly apiUserPatrimonioPrefix = '/api/patrimonios/usuario/';



  private readonly userId = this.authService.getCurrentUserValue().id || 0; // Obtém o ID do usuário autenticado ou 0 se não estiver autenticado

  private destroy$ = new Subject<void>();

  userTickets: { name: string; symbol: string }[] = [];
  selectedTicker: string | null = null;
  currentLang: 'br' | 'en' = 'br';

  loadingWidgets: boolean = false;
  errorMessage: string | null = null;

  private injectedScripts: HTMLScriptElement[] = [];

  titles = [
    { id: 'symbol-info', text: 'Informações do Símbolo', cols: 1, rows: 1, type: 'symbol-info', scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js', width: '100%', height: '200' },
     {
      id: 'symbol-overview',
      text: 'Visão Geral do Símbolo',
      cols: 1,
      rows: 1,
      type: 'symbol-overview',
      scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js',
      width: '100%',
      height: '400',
    },
    { id: 'technical-analysis', text: 'Análise Técnica', cols: 1, rows: 1, type: 'technical-analysis', scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js', width: '100%', height: '450' },
    { id: 'financials', text: 'Dados Financeiros', cols: 1, rows: 1, type: 'financials', scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-financials.js', width: '100%', height: '1000' },
    { id: 'symbol-profile', text: 'Perfil do Símbolo', cols: 1, rows: 1, type: 'symbol-profile', scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js', width: '100%', height: '500' }

  ];

  fixedCols = 2;
  fixedRowHeight = 400;
  ratioGutter = '10px';

  ngOnInit(): void {
    this.loadUserTickets();
  }

  ngOnDestroy(): void {
    this.destroyTradingViewWidgets();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserTickets(): void {
    this.errorMessage = null;
    const url = `${this.apiUserPatrimonioPrefix}${this.userId}/patrimoniocompleto`;
    this.http
      .get<any[]>(url)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Erro ao carregar tickets do usuário:', error);
          this.errorMessage = 'Não foi possível carregar os tickets do usuário. Tente novamente mais tarde.';
          this.snackBar.open(this.errorMessage, 'Fechar', { duration: 5000 });
          return of([]);
        })
      )
      .subscribe({
        next: (data) => {
          this.userTickets = data
            .filter((item) => [1, 2, 4].includes(item.tipoAtivo))
            .map((item) => ({
              name: item.descricao,
              symbol: item.ticker,
            }));
          if (this.userTickets.length > 0) {
            if (!this.selectedTicker) {
              this.selectedTicker = this.userTickets[0].symbol;
            }
          } else {
            this.errorMessage = 'Nenhum ativo do tipo Ação, FII ou Ativo Estrangeiro encontrado para o usuário.';
            this.snackBar.open(this.errorMessage, 'Fechar', { duration: 5000 });
          }
        },
      });
  }

  onTickerSelected(): void {
    this.errorMessage = null;
    this.loadingWidgets = false;
    console.log('Ticker selecionado:', this.selectedTicker);
  }

  loadTradingViewWidgets(): void {
    if (!this.selectedTicker) {
      this.errorMessage = 'Por favor, selecione um ativo para visualizar os widgets.';
      this.snackBar.open(this.errorMessage, 'Fechar', { duration: 5000 });
      return;
    }

    this.errorMessage = null;
    this.loadingWidgets = true;

    this.destroyTradingViewWidgets();

    let fullTicker = this.selectedTicker;
    if (fullTicker && (fullTicker.match(/^[A-Z]{4}\d{1,2}$/) || fullTicker.match(/^[A-Z]{6}\d{1,2}$/))) {
      if (!fullTicker.startsWith('BMFBOVESPA:')) {
        fullTicker = `BMFBOVESPA:${fullTicker}`;
      }
    }

    const widgetConfigs = this.titles.map((title) => ({
      id: title.id,
      text: title.text,
      scriptSrc: title.scriptSrc,
      options: {
        ...(title.id === 'symbol-overview'
          ? {
              symbols: [[`${fullTicker}|1D`]],
              lineWidth: 2,
              lineType: 0,
              chartType: 'area',
              showVolume: true,
              fontColor: this.currentTheme === 'dark' ? 'rgb(106, 109, 120)' : 'rgb(33, 37, 41)',
              gridLineColor: this.currentTheme === 'dark' ? 'rgba(242, 242, 242, 0.06)' : 'rgba(0, 0, 0, 0.06)',
              volumeUpColor: this.currentTheme === 'dark' ? 'rgba(34, 171, 148, 0.5)' : 'rgba(46, 125, 50, 0.5)',
              volumeDownColor: this.currentTheme === 'dark' ? 'rgba(247, 82, 95, 0.5)' : 'rgba(211, 47, 47, 0.5)',
              backgroundColor: this.currentTheme === 'dark' ? '#0F0F0F' : '#FFFFFF',
              widgetFontColor: this.currentTheme === 'dark' ? '#DBDBDB' : '#212529',
              upColor: this.currentTheme === 'dark' ? '#22ab94' : '#2e7d32',
              downColor: this.currentTheme === 'dark' ? '#f7525f' : '#d32f2f',
              borderUpColor: this.currentTheme === 'dark' ? '#22ab94' : '#2e7d32',
              borderDownColor: this.currentTheme === 'dark' ? '#f7525f' : '#d32f2f',
              wickUpColor: this.currentTheme === 'dark' ? '#22ab94' : '#2e7d32',
              wickDownColor: this.currentTheme === 'dark' ? '#f7525f' : '#d32f2f',
              chartOnly: false,
              scalePosition: 'right',
              scaleMode: 'Normal',
              fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
              valuesTracking: '1',
              changeMode: 'price-and-percent',
              dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
              fontSize: '10',
              headerFontSize: 'medium',
              autosize: true,
              noTimeScale: false,
              hideDateRanges: false,
              hideMarketStatus: false,
              hideSymbolLogo: false,
            }
          : { symbol: fullTicker }),
        colorTheme: this.currentTheme,
        isTransparent: false,
        locale: this.currentLang,
        width: title.width,
        height: title.height,
        ...(title.id === 'technical-analysis' ? { displayMode: 'single', interval: '1m', disableInterval: false, showIntervalTabs: true } : {}),
        ...(title.id === 'financials' ? { displayMode: 'regular' } : {}),
      },
    }));

    let loadedScriptsCount = 0;
    const totalScripts = widgetConfigs.length;
    let anyScriptFailed = false;

    setTimeout(() => {
      widgetConfigs.forEach((config) => {
        const containerId = `widget-${config.id}`;
        const container = document.getElementById(containerId);

        if (!container) {
          console.error(`Erro: Container com ID ${containerId} não encontrado.`);
          anyScriptFailed = true;
          loadedScriptsCount++;
          this.checkLoadingCompletion(loadedScriptsCount, totalScripts, anyScriptFailed);
          return;
        }

        this.renderer.setProperty(container, 'innerHTML', '');
        const widgetContainer = this.renderer.createElement('div');
        this.renderer.addClass(widgetContainer, 'tradingview-widget-container__widget');
        const copyrightContainer = this.renderer.createElement('div');
        const link = this.renderer.createElement('a');
        this.renderer.setAttribute(link, 'href', 'https://www.tradingview.com/');
        this.renderer.setAttribute(link, 'rel', 'noopener nofollow');
        this.renderer.setAttribute(link, 'target', '_blank');
        const span = this.renderer.createElement('span');
        this.renderer.addClass(span, 'blue-text');
        this.renderer.appendChild(link, span);
        this.renderer.appendChild(copyrightContainer, link);
        this.renderer.appendChild(container, widgetContainer);
        this.renderer.appendChild(container, copyrightContainer);

        const scriptContent = JSON.stringify(config.options);
        const script = this.renderer.createElement('script');
        this.renderer.setAttribute(script, 'type', 'text/javascript');
        this.renderer.setAttribute(script, 'src', config.scriptSrc);
        this.renderer.setAttribute(script, 'async', 'true');
        this.renderer.setProperty(script, 'textContent', scriptContent);

        this.injectedScripts.push(script);

        script.onload = () => {
          loadedScriptsCount++;
          console.log(`Script ${config.id} carregado. Total: ${loadedScriptsCount}/${totalScripts}`);
          this.checkLoadingCompletion(loadedScriptsCount, totalScripts, anyScriptFailed);
        };

        script.onerror = () => {
          console.error(`Falha ao carregar o script do widget: ${config.id}`);
          anyScriptFailed = true;
          loadedScriptsCount++;
          this.checkLoadingCompletion(loadedScriptsCount, totalScripts, anyScriptFailed);
        };

        this.renderer.appendChild(widgetContainer, script);
      });
    }, 50);

    setTimeout(() => {
      if (this.loadingWidgets) {
        this.loadingWidgets = false;
        this.errorMessage = 'Tempo limite para carregamento dos widgets. Verifique sua conexão.';
        this.snackBar.open(this.errorMessage, 'Fechar', { duration: 8000 });
      }
    }, 15000);
  }

  clearWidgets(): void {
    this.destroyTradingViewWidgets();
    this.selectedTicker = null;
    this.errorMessage = null;
    this.loadingWidgets = false;
    this.snackBar.open('Widgets limpos com sucesso.', 'Fechar', { duration: 3000 });
  }

  private checkLoadingCompletion(loadedCount: number, totalCount: number, hasFailed: boolean): void {
    if (loadedCount === totalCount) {
      this.loadingWidgets = false;
      if (hasFailed) {
        this.errorMessage = 'Alguns widgets não puderam ser carregados. Verifique o console para mais detalhes.';
        this.snackBar.open(this.errorMessage, 'Fechar', { duration: 8000 });
      }
    }
  }

  private destroyTradingViewWidgets(): void {
    this.injectedScripts.forEach((script) => {
      if (script.parentNode) {
        this.renderer.removeChild(script.parentNode, script);
      }
    });
    this.injectedScripts = [];

    this.titles.forEach((title) => {
      const containerId = `widget-${title.id}`;
      const container = document.getElementById(containerId);
      if (container) {
        this.renderer.setProperty(container, 'innerHTML', '');
      }
    });
  }
}

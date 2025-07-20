// gallery.component.ts

import { Component, inject, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatLineModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MtxPhotoviewerModule } from '@ng-matero/extensions/photoviewer';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { PageHeaderComponent } from '@shared';
import { HttpClient } from '@angular/common/http';
import { takeUntil } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { NgIf, NgFor } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-media-gallery',
  templateUrl: './gallery.component.html',
  styleUrls: ['./gallery.component.scss'],
  standalone: true,
  imports: [
    MatGridListModule,
    MatLineModule,
    MtxPhotoviewerModule,
    PageHeaderComponent,
    MatCardModule,
    MtxSelectModule,
    MatFormFieldModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatProgressBarModule,
    MatInputModule,
    MatButtonModule,
    MatOptionModule,
    MatSelectModule,
    NgIf,
    NgFor,
    MatDividerModule,
    MatListModule,
    MatToolbarModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
})
export class MediaGalleryComponent implements OnInit, OnDestroy {
  private readonly dialog = inject(MatDialog);
  private readonly http = inject(HttpClient);
  private readonly renderer = inject(Renderer2);
  private readonly snackBar = inject(MatSnackBar);

  private readonly apiUserPatrimonioPrefix = 'http://localhost:8080/api/patrimonios/usuario/';
  private readonly userId = 1;

  private destroy$ = new Subject<void>();

  userTickets: { name: string; symbol: string }[] = [];
  selectedTicker: string | null = null;
  currentTheme: 'dark' | 'light' = 'dark';
  currentLang: 'br' | 'en' = 'br';

  loadingWidgets: boolean = false;
  errorMessage: string | null = null;

  private injectedScripts: HTMLScriptElement[] = [];

  tiles = [
    { id: 'symbol-info', text: 'Informações do Símbolo', cols: 1, rows: 1, type: 'symbol-info', scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js' },
    { id: 'technical-analysis', text: 'Análise Técnica', cols: 1, rows: 1, type: 'technical-analysis', scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js' },
    { id: 'financials', text: 'Dados Financeiros', cols: 1, rows: 1, type: 'financials', scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-financials.js' },
    { id: 'symbol-profile', text: 'Perfil do Símbolo', cols: 1, rows: 1, type: 'symbol-profile', scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js' },
  ];

  fixedCols = 2;
  fixedRowHeight = 350;
  ratioGutter = '1';
  fitListHeight = 'auto';

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
          this.userTickets = data.map((item) => ({
            name: item.descricao,
            symbol: item.ticker,
          }));
          if (this.userTickets.length > 0) {
            if (!this.selectedTicker) {
              this.selectedTicker = this.userTickets[0].symbol;
            }
          } else {
            this.errorMessage = 'Nenhum ativo encontrado para o usuário.';
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
      console.warn('Botão Buscar clicado sem ativo selecionado.');
      return;
    }

    this.errorMessage = null;
    this.loadingWidgets = true;
    console.log('>>> loadTradingViewWidgets: Definindo loadingWidgets para TRUE. Iniciando carregamento.');

    this.destroyTradingViewWidgets(); // Limpa widgets existentes

    let fullTicker = this.selectedTicker;

    if (fullTicker) {
      // Adiciona o prefixo BMFBOVESPA para tickers da B3
      if (fullTicker.match(/^[A-Z]{4}\d{1,2}$/) || fullTicker.match(/^[A-Z]{6}\d{1,2}$/)) {
        // Verifica se já não tem o prefixo para evitar duplicidade
        if (!fullTicker.startsWith('BMFBOVESPA:')) {
            fullTicker = `BMFBOVESPA:${fullTicker}`;
        }
      }
      // Para outros tipos (criptos, forex, etc.), o TradingView geralmente infere.
    }

    console.log(`[loadTradingViewWidgets] Ticker final para o TradingView: ${fullTicker}`);

    const commonWidgetOptions = {
      symbol: fullTicker,
      colorTheme: this.currentTheme,
      isTransparent: false,
      locale: this.currentLang,
      width: '100%',
      height: '100%'
    };

    const widgetConfigs = [
      {
        id: 'symbol-info',
        text: 'Informações do Símbolo', // Adicionei text para log
        scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js',
        options: { ...commonWidgetOptions },
      },
      {
        id: 'technical-analysis',
        text: 'Análise Técnica', // Adicionei text para log
        scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js',
        options: {
          ...commonWidgetOptions,
          displayMode: 'single',
          interval: '1m',
          disableInterval: false,
          showIntervalTabs: true,
        },
      },
      {
        id: 'financials',
        text: 'Dados Financeiros', // Adicionei text para log
        scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-financials.js',
        options: { ...commonWidgetOptions, displayMode: 'regular' },
      },
      {
        id: 'symbol-profile',
        text: 'Perfil do Símbolo', // Adicionei text para log
        scriptSrc: 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js',
        options: { ...commonWidgetOptions },
      },
    ];

    let loadedScriptsCount = 0;
    const totalScripts = widgetConfigs.length;
    let anyScriptFailed = false;

    setTimeout(() => {
      widgetConfigs.forEach(config => {
        const containerId = 'widget-' + config.id;
        const container = document.getElementById(containerId);

        if (container) {
          const widgetContainer = container.querySelector('.tradingview-widget-container__widget');
          if (widgetContainer) {
            this.renderer.setProperty(widgetContainer, 'innerHTML', '');

            // --- LOG DOS PARÂMETROS DE CONFIGURAÇÃO DO WIDGET ---
            console.log(`[Widget Config] ${config.text} (${config.id}):`, JSON.stringify(config.options, null, 2));

            const scriptContent = JSON.stringify(config.options);
            const scriptHTML = `<script type="text/javascript" src="${config.scriptSrc}" async="true">${scriptContent}<\/script>`;

            // --- LOG DO SCRIPT HTML FINAL INJETADO ---
            console.log(`[Script HTML] ${config.text} (${config.id}):`, scriptHTML);

            const tempDiv = this.renderer.createElement('div');
            this.renderer.setProperty(tempDiv, 'innerHTML', scriptHTML);
            const script = tempDiv.firstChild as HTMLScriptElement;

            if (script) {
              const newScript = this.renderer.createElement('script');
              this.renderer.setAttribute(newScript, 'type', 'text/javascript');
              this.renderer.setAttribute(newScript, 'src', script.src);
              this.renderer.setAttribute(newScript, 'async', 'true');
              this.renderer.setProperty(newScript, 'textContent', script.textContent);

              this.injectedScripts.push(newScript);

              newScript.onload = () => {
                loadedScriptsCount++;
                console.log(`Script ${config.id} carregado. Total: ${loadedScriptsCount}/${totalScripts}`);
                this.checkLoadingCompletion(loadedScriptsCount, totalScripts, anyScriptFailed);
              };

              newScript.onerror = (errorEvent: any) => {
                console.error(`Falha ao carregar o script do widget: ${config.id}`, errorEvent);
                anyScriptFailed = true;
                loadedScriptsCount++;
                this.checkLoadingCompletion(loadedScriptsCount, totalScripts, anyScriptFailed);
              };

              this.renderer.appendChild(widgetContainer, newScript);
            } else {
              console.error(`Erro: Falha ao criar elemento script para ${config.id}.`);
              anyScriptFailed = true;
              loadedScriptsCount++;
              this.checkLoadingCompletion(loadedScriptsCount, totalScripts, anyScriptFailed);
            }

          } else {
            console.error(`Erro: Container interno do widget ('tradingview-widget-container__widget') não encontrado para ${containerId}.`);
            anyScriptFailed = true;
            loadedScriptsCount++;
            this.checkLoadingCompletion(loadedScriptsCount, totalScripts, anyScriptFailed);
          }
        } else {
          console.error(`Erro: Container principal com ID ${containerId} não encontrado. Isso pode indicar um problema de timing ou de estrutura HTML.`);
          anyScriptFailed = true;
          loadedScriptsCount++;
          this.checkLoadingCompletion(loadedScriptsCount, totalScripts, anyScriptFailed);
        }
      });
    }, 50);

    setTimeout(() => {
      if (this.loadingWidgets) {
        this.loadingWidgets = false;
        this.errorMessage = this.errorMessage || 'Tempo limite para carregamento dos widgets. Verifique sua conexão ou o console para mais detalhes.';
        this.snackBar.open(this.errorMessage, 'Fechar', { duration: 8000 });
        console.error('Alerta: Carregamento de widgets excedeu o tempo limite.');
      }
    }, 15000);
  }

  private checkLoadingCompletion(loadedCount: number, totalCount: number, hasFailed: boolean): void {
    if (loadedCount === totalCount) { // AQUI: totalCount está correto agora
      console.log('>>> checkLoadingCompletion: Todos os scripts processados. Definindo loadingWidgets para FALSE.');
      this.loadingWidgets = false;
      if (hasFailed) {
        this.errorMessage = this.errorMessage || 'Alguns widgets não puderam ser carregados. Verifique o console para mais detalhes.';
        this.snackBar.open(this.errorMessage, 'Fechar', { duration: 8000 });
      } else {
        this.errorMessage = null; // Limpa a mensagem de erro se tudo carregou com sucesso
      }
    }
  }

  private destroyTradingViewWidgets(): void {
    console.log('Destruindo widgets TradingView existentes...');
    this.injectedScripts.forEach(script => {
      if (script.parentNode) {
        this.renderer.removeChild(script.parentNode, script);
      }
    });
    this.injectedScripts = [];

    this.tiles.forEach(tile => {
      const containerId = 'widget-' + tile.id;
      const container = document.getElementById(containerId);
      if (container) {
        const widgetContainer = container.querySelector('.tradingview-widget-container__widget');
        if (widgetContainer) {
          while (widgetContainer.firstChild) {
            this.renderer.removeChild(widgetContainer, widgetContainer.firstChild);
          }
        }
      }
    });
    console.log('Widgets TradingView destruídos.');
  }

  // ... (outros métodos)
  getWidgetOptions(widgetType: string): any {
    // Este método agora é redundante para a lógica de carregamento de widgets,
    // pois a configuração é criada diretamente em loadTradingViewWidgets.
    // Mantenha-o apenas se for usado em outras partes do componente.
    let fullTicker = this.selectedTicker;
    if (fullTicker) {
        if (fullTicker.includes('/')) { /* ... */ }
        else if (fullTicker.match(/^[A-Z]{4}\d{1,2}$/) || fullTicker.match(/^[A-Z]{6}\d{1,2}$/)) {
            if (!fullTicker.startsWith('BMFBOVESPA:')) {
                fullTicker = `BMFBOVESPA:${fullTicker}`;
            }
        }
    }
    return { symbol: fullTicker, colorTheme: this.currentTheme, locale: this.currentLang };
  }

  addTag(name: string) {
    return { name, tag: true };
  }

  addTagPromise(name: string) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ id: 5, name, valid: true });
      }, 1000);
    });
  }
}

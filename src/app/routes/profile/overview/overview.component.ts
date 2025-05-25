import { Component, inject, OnInit, OnDestroy, PLATFORM_ID, AfterViewInit, Renderer2 } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '@core/authentication';
import { isPlatformBrowser } from '@angular/common';
import { SettingsService } from '@core/bootstrap/settings.service';

// Imports do Angular Material para o botão e ícone
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip'; // Para o matTooltip

@Component({
  selector: 'app-profile-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
  standalone: true,
  imports: [
    MatCardModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,   // Adicionado
    MatTooltipModule   // Adicionado
  ],
})
export class ProfileOverviewComponent implements OnInit, OnDestroy, AfterViewInit {

  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);
  private readonly settings = inject(SettingsService);

  private tradingViewScript: HTMLScriptElement | null = null;
  public isLoading = false; // Propriedade para controlar o estado de carregamento

  ngOnInit() {
    console.log('ProfileOverviewComponent OnInit');
    // Sua lógica de OnInit existente (ex: subscrição a mudanças de tema) pode permanecer aqui.
  }

  ngAfterViewInit() {
    // Carrega o widget inicialmente após a view estar pronta e apenas no navegador
    if (isPlatformBrowser(this.platformId)) {
      console.log('Initial TradingView Widget Load starting...');
      this.loadTradingViewWidget()
        .then(() => {
          console.log('Initial TradingView Widget script loaded successfully.');
        })
        .catch(error => {
          console.error('Error loading initial TradingView widget:', error);
        });
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      this.destroyTradingViewWidget();
    }
    // Sua lógica de OnDestroy existente (ex: cancelar subscrição de tema) pode permanecer aqui.
  }

  /**
   * Método público para acionar o recarregamento do widget do TradingView.
   * Gerencia o estado de 'isLoading' para feedback visual (ex: ícone girando).
   */
  public async triggerWidgetRefresh(): Promise<void> {
    if (this.isLoading) {
      console.log('Refresh already in progress.');
      return;
    }
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('Widget refresh skipped: not in browser environment.');
      return;
    }

    this.isLoading = true;
    console.log('Attempting to refresh TradingView Widget...');
    try {
      await this.loadTradingViewWidget(); // Aguarda o carregamento do script
      console.log('TradingView widget refresh initiated (script load successful).');
    } catch (error) {
      console.error('Error during widget refresh:', error);
    } finally {
      // Adiciona um pequeno delay antes de resetar isLoading para dar tempo à renderização visual do widget,
      // melhorando a percepção do usuário de que a ação foi concluída.
      setTimeout(() => {
        this.isLoading = false;
        console.log('isLoading flag reset.');
      }, 750); // Ajuste este valor conforme necessário
    }
  }

  /**
   * Carrega o script do TradingView e o anexa ao DOM.
   * Retorna uma Promise que resolve quando o script é carregado ou rejeita em caso de erro.
   */
  private loadTradingViewWidget(): Promise<void> {
    return new Promise((resolve, reject) => {
      const container = document.querySelector('.tradingview-widget-container');

      if (!container) {
        const errorMsg = 'TradingView widget container not found. Make sure the div with class .tradingview-widget-container exists in your overview.component.html.';
        console.warn(errorMsg);
        return reject(new Error(errorMsg));
      }

      // Remove qualquer instância anterior do widget
      this.destroyTradingViewWidget();

      const currentTheme = this.settings.getThemeColor();
      console.log('Tema detectado para o TradingView:', currentTheme);

      const widgetConfig = {
        feedMode: 'all_symbols',
        isTransparent: false,
        displayMode: 'adaptive',
        width: '100%',
        height: '450', // Ajuste a altura conforme necessário
        colorTheme: currentTheme,
        locale: 'pt'
      };

      this.tradingViewScript = this.renderer.createElement('script');
      this.renderer.setAttribute(this.tradingViewScript, 'type', 'text/javascript');
      this.renderer.setAttribute(this.tradingViewScript, 'src', 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js');
      this.renderer.setAttribute(this.tradingViewScript, 'async', 'true');

      if (this.tradingViewScript) {
        this.tradingViewScript.innerHTML = JSON.stringify(widgetConfig);

        this.tradingViewScript.onload = () => {
          console.log('TradingView script loaded successfully.');
          resolve();
        };
        this.tradingViewScript.onerror = (errorEvent) => {
          console.error('TradingView script failed to load.', errorEvent);
          reject(errorEvent); // Rejeita a Promise com o evento de erro
        };

        this.renderer.appendChild(container, this.tradingViewScript);
      } else {
        // Este caso é improvável se createElement funcionar, mas é uma salvaguarda.
        reject(new Error('Failed to create TradingView script element.'));
      }
    });
  }

  private destroyTradingViewWidget(): void {
    // Remove o elemento script
    if (this.tradingViewScript && this.tradingViewScript.parentNode) {
      this.renderer.removeChild(this.tradingViewScript.parentNode, this.tradingViewScript);
      this.tradingViewScript = null;
    }
    // Remove também o iframe que o TradingView pode ter criado dentro do container
    const container = document.querySelector('.tradingview-widget-container');
    if (container) {
        const iframe = container.querySelector('iframe'); // O widget geralmente é um iframe
        if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }
    }
  }
}

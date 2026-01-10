import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { LocalStorageService } from '@shared';
import { catchError, map, switchMap, take, tap, shareReplay } from 'rxjs/operators';
import { AuthService } from '@core/authentication';

export interface PatrimonioDistribuicaoVO {
  tipoAtivo: string;
  valorTotal: number;
  percentual: number;
}

interface CotacaoUSD {
  idCotacao: number;
  dataCotacao: string;
  valorCotacao: number;
  fonteDado: string;
  ticker: string;
  cambio: string;
}

export interface PatrimonioHistoricoVO {
  idHistorico: number;
  usuarioId: number;
  dataRegistro: string;
  valorTotal: number;
}

export interface AtivoVO {
  moeda: string;
  id?: number | string;
  tickerFormatado: string;
  descricaoFormatada: string;
  tipoAtivoFormatado: string;
  moedaFormatada: string;
  quantidadeFormatada: number;
  valorInvestidoFormatado: number;
  precoMedioFormatado: number;
  precoAtualFormatado: number;
  valorAtualFormatado: number;
  lucroPrejuizoFormatado: number;
  category?: string;
}

export interface PatrimonioCompletoResponse {
  ticker: string;
  quantidade: number;
  valorAtual: number;
  valorInvestido: number;
  precoMedio: number;
  lucroPrejuizo: number;
  descricao: string;
  moeda: string;
  tipoAtivo: number;
  valorInvestidoFormatado: string;
  valorAtualFormatado: string;
  precoMedioFormatado: string;
  lucroPrejuizoFormatado: string;
  descricaoFormatada: string;
  tipoAtivoFormatado: string;
  quantidadeFormatada: string;
  moedaFormatada: string;
  tickerFormatado: string;
  id: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  protected readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly store = inject(LocalStorageService);

  private readonly apiUserPatrimonioPrefix = '/api/patrimonios/usuario';
  private readonly apiCotacoesPrefix = '/api/cotacoes/tickers';
  private readonly apiTransacoesPrefix = '/api/transacoes/lote';

  private readonly PATRIMONIO_COMPLETO_KEY = 'patrimonioCompletoCache';
  private readonly PATRIMONIO_HISTORICO_KEY = 'patrimonioHistoricoCache';

  private patrimonioCompletoCache$: Observable<AtivoVO[]> | null = null;
  private cotacaoUSDCache$: Observable<number> | null = null;
  private patrimonioHistoricoCache$: Observable<PatrimonioHistoricoVO[]> | null = null;

  private getUsuarioIdObservable(): Observable<string | number | null | undefined> {
    return this.authService.user().pipe(
      take(1),
      map(user => user?.id)
    );
  }

  private apiUrl = '/api';

  createTransactionLote(usuarioId: number, jsonData: any): Observable<any> {
    const url = `${this.apiTransacoesPrefix}/${usuarioId}`;
    return this.http.post(url, jsonData).pipe(
      tap(() => this.clearPatrimonioCache())
    );
  }

  createTransaction(usuarioId: number | string, transactionData: any): Observable<any> {
    const url = `${this.apiUrl}/transacoes/${usuarioId}/criarTransacao`;
    return this.http.post(url, transactionData).pipe(
      tap(() => this.clearPatrimonioCache())
    );
  }

  private getCotacaoUSD(): Observable<number> {
    if (!this.cotacaoUSDCache$) {
      const url = `${this.apiCotacoesPrefix}?tickers=USD/BRL`;
      this.cotacaoUSDCache$ = this.http.get<CotacaoUSD[]>(url).pipe(
        map((responseArray: CotacaoUSD[]) => {
          if (!responseArray || responseArray.length === 0) {
            console.warn(`DashboardService: Empty or null USD quote response. Returning 0.`);
            return 0;
          }
          const cotacao = responseArray[0].valorCotacao;
          if (typeof cotacao !== 'number' || isNaN(cotacao) || cotacao <= 0) {
            console.warn(`DashboardService: Invalid 'valorCotacao' in response. Returning 0.`, responseArray[0]);
            return 0;
          }
          return cotacao;
        }),
        catchError(error => {
          console.error(`DashboardService: HTTP error fetching USD quote. Returning 0.`, error);
          return of(0);
        }),
        shareReplay(1)
      );
    }
    return this.cotacaoUSDCache$;
  }

  public parseFormattedString(value: string | undefined | null): number {
    if (value === null || value === undefined || value.trim() === '') {
      return 0;
    }
    let cleanedValue = value.trim();
    cleanedValue = cleanedValue.replace(/[^\d.,-]/g, '');
    if (cleanedValue.includes(',') && cleanedValue.includes('.')) {
      if (cleanedValue.indexOf(',') > cleanedValue.indexOf('.')) {
        cleanedValue = cleanedValue.replace(/\./g, '');
        cleanedValue = cleanedValue.replace(/,/g, '.');
      } else {
        cleanedValue = cleanedValue.replace(/,/g, '');
      }
    } else if (cleanedValue.includes(',')) {
      cleanedValue = cleanedValue.replace(/,/g, '.');
    }
    const parsed = parseFloat(cleanedValue);
    if (isNaN(parsed)) {
      console.warn(`[DashboardService.parseFormattedString] Failed to parse: "${value}" -> "${cleanedValue}". Returning 0.`);
      return 0;
    }
    return parsed;
  }

  private convertUsdToBrlNumeric(ativos: AtivoVO[], cotacaoUSD: number): AtivoVO[] {
    if (cotacaoUSD <= 0) {
      console.warn(`[convertUsdToBrlNumeric] Invalid or zero USD quote (${cotacaoUSD}). Returning assets without numeric conversion.`);
      return ativos;
    }
    return ativos.map(ativo => {
      const ativoModificado = { ...ativo };
      if (ativoModificado.moedaFormatada === 'USD') {
        const valorAtualUSD = this.parseFormattedString(ativoModificado.valorAtualFormatado?.toString());
        ativoModificado.valorAtualFormatado = isNaN(valorAtualUSD) ? 0 : valorAtualUSD * cotacaoUSD;
        const valorInvestidoUSD = this.parseFormattedString(ativoModificado.valorInvestidoFormatado?.toString());
        ativoModificado.valorInvestidoFormatado = isNaN(valorInvestidoUSD) ? 0 : valorInvestidoUSD * cotacaoUSD;
        const precoMedioUSD = this.parseFormattedString(ativoModificado.precoMedioFormatado?.toString());
        ativoModificado.precoMedioFormatado = isNaN(precoMedioUSD) ? 0 : precoMedioUSD * cotacaoUSD;
        ativoModificado.lucroPrejuizoFormatado = ativoModificado.valorAtualFormatado - ativoModificado.valorInvestidoFormatado;
        ativoModificado.moedaFormatada = 'BRL';
      } else {
        ativoModificado.valorAtualFormatado = this.parseFormattedString(ativoModificado.valorAtualFormatado?.toString());
        ativoModificado.valorInvestidoFormatado = this.parseFormattedString(ativoModificado.valorInvestidoFormatado?.toString());
        ativoModificado.precoMedioFormatado = this.parseFormattedString(ativoModificado.precoMedioFormatado?.toString());
        ativoModificado.lucroPrejuizoFormatado = this.parseFormattedString(ativoModificado.lucroPrejuizoFormatado?.toString());
      }
      ativoModificado.quantidadeFormatada = this.parseFormattedString(ativoModificado.quantidadeFormatada?.toString());
      return ativoModificado;
    });
  }

  public getPatrimonioCompleto(): Observable<AtivoVO[]> {
    if (!this.patrimonioCompletoCache$) {
      this.patrimonioCompletoCache$ = this.getUsuarioIdObservable().pipe(
        switchMap(usuarioId => {
          if (usuarioId === undefined || usuarioId === null) {
            console.error("User ID not available for fetching complete patrimony.");
            return of([]);
          }
          const url = `${this.apiUserPatrimonioPrefix}/${usuarioId}/patrimoniocompleto`;
          return forkJoin({
            patrimonio: this.http.get<PatrimonioCompletoResponse[]>(url),
            cotacao: this.getCotacaoUSD()
          }).pipe(
            switchMap(({ patrimonio, cotacao }) => {
              if (!patrimonio || patrimonio.length === 0) {
                return of([]);
              }
              const ativosVO: AtivoVO[] = patrimonio.map(item => ({
                id: item.id,
                tickerFormatado: item.tickerFormatado,
                descricaoFormatada: item.descricaoFormatada,
                tipoAtivoFormatado: item.tipoAtivoFormatado,
                moedaFormatada: item.moedaFormatada,
                quantidadeFormatada: this.parseFormattedString(item.quantidadeFormatada),
                valorInvestidoFormatado: this.parseFormattedString(item.valorInvestidoFormatado),
                precoMedioFormatado: this.parseFormattedString(item.precoMedioFormatado),
                precoAtualFormatado: 0,
                valorAtualFormatado: this.parseFormattedString(item.valorAtualFormatado),
                lucroPrejuizoFormatado: this.parseFormattedString(item.lucroPrejuizoFormatado),
                moeda: item.moeda,
                category: this.mapTipoAtivoToCategory(item.tipoAtivoFormatado)
              }));
              const ativosConvertidosNumeric = this.convertUsdToBrlNumeric(ativosVO, cotacao);
              const tickersToFetch = ativosConvertidosNumeric
                .filter(ativo => ativo.tipoAtivoFormatado !== 'CAIXA')
                .map(ativo => ativo.tickerFormatado);
              if (tickersToFetch.length > 0) {
                const cotacoesUrl = `${this.apiCotacoesPrefix}?tickers=${tickersToFetch.join(',')}`;
                return this.http.get<CotacaoUSD[]>(cotacoesUrl).pipe(
                  map(cotacoes => {
                    const cotacoesMap = new Map<string, { valorCotacao: number, cambio: string }>(
                      cotacoes.map(c => [c.ticker, { valorCotacao: c.valorCotacao, cambio: c.cambio }])
                    );
                    return ativosConvertidosNumeric.map(ativo => {
                      if (ativo.tipoAtivoFormatado === 'CAIXA') {
                        return ativo;
                      }
                      const cotacaoAtivo = cotacoesMap.get(ativo.tickerFormatado);
                      const precoAtual = cotacaoAtivo
                        ? (cotacaoAtivo.cambio === 'USD' ? cotacaoAtivo.valorCotacao * cotacao : cotacaoAtivo.valorCotacao)
                        : 0;
                      const valorAtualCalculado = ativo.quantidadeFormatada * precoAtual;
                      const lucroPrejuizoCalculado = valorAtualCalculado - ativo.valorInvestidoFormatado;
                      return {
                        ...ativo,
                        precoAtualFormatado: precoAtual,
                        valorAtualFormatado: valorAtualCalculado,
                        lucroPrejuizoFormatado: lucroPrejuizoCalculado
                      };
                    });
                  }),
                  catchError(error => {
                    console.error(`DashboardService: Error fetching quotes for complete patrimony:`, error);
                    return of(ativosConvertidosNumeric.map(ativo => ({
                      ...ativo,
                      precoAtualFormatado: 0
                    })));
                  })
                );
              }
              return of(ativosConvertidosNumeric);
            }),
            tap(data => this.store.set(this.PATRIMONIO_COMPLETO_KEY, data)),
            catchError(error => {
              console.error(`DashboardService: Error fetching complete patrimony for user:`, error);
              return of([]);
            })
          );
        }),
        shareReplay(1)
      );
    }
    return this.patrimonioCompletoCache$;
  }

  getPatrimonioHistorico(usuarioId: number): Observable<PatrimonioHistoricoVO[]> {
    if (!this.patrimonioHistoricoCache$) {
      this.patrimonioHistoricoCache$ = this.getUsuarioIdObservable().pipe(
        switchMap(authUserId => {
          if (authUserId === undefined || authUserId === null) {
            console.error("User ID not available for fetching historical patrimony.");
            return of([]);
          }
          if (authUserId !== usuarioId) {
            console.warn(`User ID mismatch: auth ID does not match requested ID.`);
            return of([]);
          }
          const url = `${this.apiUserPatrimonioPrefix}/${usuarioId}/historico`;
          return forkJoin({
            historico: this.http.get<PatrimonioHistoricoVO[]>(url).pipe(
              map(data => {
                return data
                  .map(item => ({
                    idHistorico: item.idHistorico,
                    usuarioId: item.usuarioId,
                    dataRegistro: this.validateDate(item.dataRegistro) ?? new Date().toISOString(),
                    valorTotal: this.validateNumber(item.valorTotal) ?? 0
                  }))
                  .filter(item => item.dataRegistro !== null && item.valorTotal !== null) as PatrimonioHistoricoVO[];
              }),
              catchError(error => {
                console.error(`DashboardService: Error fetching historical patrimony for user:`, error);
                return of([]);
              })
            ),
            completo: this.getPatrimonioCompleto()
          }).pipe(
            map(({ historico, completo }) => {
              if (!historico || historico.length === 0) {
                console.warn(`No historical data available for user.`);
                return [];
              }

              return historico;
            }),
            tap(data => this.store.set(this.PATRIMONIO_HISTORICO_KEY, data)),
            catchError(error => {
              console.error(`DashboardService: Error processing historical patrimony:`, error);
              return of([]);
            }),
            shareReplay(1)
          );
        })
      );
    }
    return this.patrimonioHistoricoCache$;
  }

  getDistribuicaoPatrimonio(): Observable<PatrimonioDistribuicaoVO[]> {
    return this.getPatrimonioCompleto().pipe(
      map(patrimonioCompleto => this.calculateDistribuicao(patrimonioCompleto)),
      catchError(error => {
        console.error(`DashboardService: Error fetching patrimony distribution:`, error);
        return of([]);
      })
    );
  }

  private calculateDistribuicao(patrimonioCompleto: AtivoVO[]): PatrimonioDistribuicaoVO[] {
    if (!patrimonioCompleto || patrimonioCompleto.length === 0) {
      return [];
    }
    const categoryTotals: { [key: string]: number } = {};
    patrimonioCompleto.forEach(ativo => {
      const category = ativo.category || 'outros';
      categoryTotals[category] = (categoryTotals[category] || 0) + (ativo.valorAtualFormatado || 0);
    });
    const distribuicaoModificada: PatrimonioDistribuicaoVO[] = Object.entries(categoryTotals).map(([tipoAtivo, total]) => ({
      tipoAtivo: tipoAtivo.charAt(0).toUpperCase() + tipoAtivo.slice(1),
      valorTotal: total,
      percentual: 0
    }));
    const totalGeral = distribuicaoModificada.reduce((sum, item) => sum + item.valorTotal, 0);
    const distribuicaoFinal = distribuicaoModificada.map(item => {
      item.percentual = totalGeral > 0 ? (item.valorTotal / totalGeral) * 100 : 0;
      item.percentual = Math.round(item.percentual * 100) / 100;
      return item;
    });
    return distribuicaoFinal;
  }

  getPatrimonioAcoes(): Observable<AtivoVO[]> {
    return this.getPatrimonioCompleto().pipe(
      map(patrimonioCompleto => patrimonioCompleto.filter(ativo => ativo.category === 'acoes')),
      catchError(error => {
        console.error(`DashboardService: Error filtering actions from complete patrimony:`, error);
        return of([]);
      })
    );
  }

  getPatrimonioFundos(): Observable<AtivoVO[]> {
    return this.getPatrimonioCompleto().pipe(
      map(patrimonioCompleto => patrimonioCompleto.filter(ativo => ativo.category === 'fundos')),
      catchError(error => {
        console.error(`DashboardService: Error filtering funds from complete patrimony:`, error);
        return of([]);
      })
    );
  }

  getPatrimonioCaixa(): Observable<AtivoVO[]> {
    return this.getPatrimonioCompleto().pipe(
      map(patrimonioCompleto => patrimonioCompleto.filter(ativo => ativo.category === 'caixa')),
      catchError(error => {
        console.error(`DashboardService: Error filtering cash from complete patrimony:`, error);
        return of([]);
      })
    );
  }

  getPatrimonioAssets(): Observable<AtivoVO[]> {
    return this.getPatrimonioCompleto().pipe(
      map(patrimonioCompleto => patrimonioCompleto.filter(ativo => ativo.category === 'assets')),
      catchError(error => {
        console.error(`DashboardService: Error filtering assets from complete patrimony:`, error);
        return of([]);
      })
    );
  }

  // --- Stored Data Access Methods ---

  public getStoredPatrimonioCompleto(): AtivoVO[] {
    return this.store.get(this.PATRIMONIO_COMPLETO_KEY) || [];
  }

  public getStoredPatrimonioHistorico(): PatrimonioHistoricoVO[] {
    return this.store.get(this.PATRIMONIO_HISTORICO_KEY) || [];
  }

  public getStoredDistribuicaoPatrimonio(): PatrimonioDistribuicaoVO[] {
    const completo = this.getStoredPatrimonioCompleto();
    return this.calculateDistribuicao(completo);
  }

  public getStoredPatrimonioAcoes(): AtivoVO[] {
    const completo = this.getStoredPatrimonioCompleto();
    return completo.filter(ativo => ativo.category === 'acoes');
  }

  public getStoredPatrimonioFundos(): AtivoVO[] {
    const completo = this.getStoredPatrimonioCompleto();
    return completo.filter(ativo => ativo.category === 'fundos');
  }

  public getStoredPatrimonioCaixa(): AtivoVO[] {
    const completo = this.getStoredPatrimonioCompleto();
    return completo.filter(ativo => ativo.category === 'caixa');
  }

  public getStoredPatrimonioAssets(): AtivoVO[] {
    const completo = this.getStoredPatrimonioCompleto();
    return completo.filter(ativo => ativo.category === 'assets');
  }

  public deleteAtivo(usuarioId: number | string, tickerFormatado: string, category: string): Observable<void> {
    if (!['fundos', 'acoes', 'caixa', 'assets'].includes(category)) {
      console.error(`Invalid category for deletion: ${category}`);
      return throwError(() => new Error('Invalid category'));
    }
    const encodedTicker = encodeURIComponent(tickerFormatado);
    const url = `${this.apiUserPatrimonioPrefix}/${usuarioId}/${encodedTicker}`;
    return this.http.delete<void>(url, { observe: 'response' }).pipe(
      tap(response => {
        if (response.status === 204) {
          console.log(`Ticker ${tickerFormatado} deleted successfully from category ${category} (204 No Content).`);
          this.clearPatrimonioCache();
        } else {
          console.warn(`Unexpected response deleting ticker ${tickerFormatado}: status ${response.status}`);
        }
      }),
      map(() => void 0),
      catchError(error => {
        console.error(`Error deleting ticker ${tickerFormatado} from category ${category}:`, error);
        return throwError(() => new Error(`Error deleting ticker: ${error.message || 'Unknown error'}`));
      })
    );
  }

  updateAtivo(usuarioId: number | string, ativo: AtivoVO, category: string): Observable<void> {
    if (!['fundos', 'acoes', 'caixa', 'assets', 'outros'].includes(category)) {
      console.error(`Invalid category for update: ${category}`);
      return throwError(() => new Error('Invalid category'));
    }
    if (!ativo.tickerFormatado || ativo.tickerFormatado.trim() === '') {
      console.error(`Invalid ticker for asset in category ${category}:`, ativo);
      return throwError(() => new Error('Invalid ticker'));
    }
    const encodedTicker = encodeURIComponent(ativo.tickerFormatado);
    const url = `${this.apiUserPatrimonioPrefix}/${usuarioId}/${encodedTicker}`;
    const ativoParaEnviar: any = {
      idPatrimonio: typeof ativo.id === 'string' ? Number(ativo.id) : (ativo.id || 0),
      descricao: ativo.descricaoFormatada || '',
      quantidade: ativo.quantidadeFormatada || 0,
      precoMedio: ativo.precoMedioFormatado || 0,
      valorInvestido: ativo.valorInvestidoFormatado || 0,
      ticker: ativo.tickerFormatado,
      usuario: { id: Number(usuarioId) || 0 },
      tipoAtivo: this.mapCategoryToTipoAtivoNumber(category),
      moeda: ativo.moeda || 'BRL'
    };
    if (ativoParaEnviar.tipoAtivo === 3) {
      const valorAtual = typeof ativo.valorAtualFormatado === 'string'
        ? parseFloat((ativo.valorAtualFormatado as string).replace(',', '.')) || 0
        : (typeof ativo.valorAtualFormatado === 'number' ? ativo.valorAtualFormatado : 0);
      if (valorAtual > 0) {
        ativoParaEnviar.valorAtual = valorAtual;
      }
    }
    return this.http.put<void>(url, ativoParaEnviar, { headers: { 'Content-Type': 'application/json' } }).pipe(
      tap(() => {
        console.log(`Asset with ticker ${ativo.tickerFormatado} updated successfully in category ${category}.`);
        this.clearPatrimonioCache();
      }),
      catchError(error => {
        console.error(`Error updating asset with ticker ${ativo.tickerFormatado} in category ${category}:`, error);
        return throwError(() => new Error(`Error updating asset: ${error.message || 'Unknown error'}`));
      })
    );
  }

  addTransaction(userId: number | string, transactionData: any): Observable<any> {
    const category = transactionData.category;
    if (!['fundos', 'acoes', 'assets', 'caixa'].includes(category)) {
      console.error(`Invalid category for transaction: ${category}`);
      return throwError(() => new Error('Invalid category'));
    }
    this.clearPatrimonioCache();
    return of({ success: true });
  }

  public clearPatrimonioCache(): void {
    this.patrimonioCompletoCache$ = null;
    this.cotacaoUSDCache$ = null;
    this.patrimonioHistoricoCache$ = null;
    console.log('DashboardService: Patrimony and historical cache cleared.');
  }

  private mapTipoAtivoToCategory(tipoAtivoFormatado: string): string {
    switch (tipoAtivoFormatado.toUpperCase()) {
      case 'AÇÃO': return 'acoes';
      case 'FII':
      case 'FUNDO': return 'fundos';
      case 'CAIXA': return 'caixa';
      case 'ASSET': return 'assets';
      default: return 'outros';
    }
  }

  private mapCategoryToTipoAtivoNumber(category: string): number {
    switch (category.toLowerCase()) {
      case 'acoes': return 1;
      case 'fundos': return 2;
      case 'caixa': return 3;
      case 'assets': return 4;
      default: return 0;
    }
  }

private validateDate(date: string | undefined | null): string | undefined {
    if (!date) {
        console.warn(`Invalid date: ${date}`);
        return undefined;
    }

    // Regex para validar o formato DD/MM/YYYY
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = date.match(dateRegex);

    if (match) {
        // Extrai dia, mês e ano
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // Mês começa em 0 no JavaScript
        const year = parseInt(match[3], 10);

        // Cria objeto Date
        const parsed = new Date(year, month, day);

        // Verifica se a data é válida
        if (
            !isNaN(parsed.getTime()) &&
            parsed.getDate() === day &&
            parsed.getMonth() === month &&
            parsed.getFullYear() === year
        ) {
            // Retorna a data no formato original (ou pode formatar como preferir)
            return date;
        } else {
            console.warn(`Invalid date values: ${date}`);
            return undefined;
        }
    }

    // Tenta parsear outros formatos (como fallback, para compatibilidade com o código original)
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
        return date;
    }

    console.warn(`Invalid date format: ${date}`);
    return undefined;
}

  private validateNumber(value: any): number | undefined {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      console.warn(`Invalid number format: ${value}`);
      return undefined;
    }
    return parsed;
  }
}

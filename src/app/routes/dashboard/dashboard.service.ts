import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of, throwError } from 'rxjs';
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

export interface AtivoVO {
  moeda: string;
  id?: number | string; // 'id' pode ser opcional ou vir no patrimonio completo
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
  tipoAtivo: number; // Supondo que 1: AÇÃO, 2: FII, etc.
  valorInvestidoFormatado: string;
  valorAtualFormatado: string;
  precoMedioFormatado: string;
  lucroPrejuizoFormatado: string;
  descricaoFormatada: string;
  tipoAtivoFormatado: string; // Ex: "AÇÃO", "FII", "CAIXA", "ASSET"
  quantidadeFormatada: string;
  moedaFormatada: string;
  tickerFormatado: string;
  // --- Adição abaixo ---
  id: number; // Adicionado para capturar o ID numérico do ativo do backend
  // --------------------
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  protected readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly apiUserPatrimonioPrefix = '/api/patrimonios/usuario/';
  private readonly apiCotacoesPrefix = '/api/cotacoes/tickers/';

  private readonly apiTransacoesPrefix = '/api/transacoes/lote/';


  // Cache para o patrimônio completo
  private patrimonioCompletoCache$: Observable<AtivoVO[]> | null = null;
  // Cache para a cotação USD
  private cotacaoUSDCache$: Observable<number> | null = null;

  private getUsuarioIdObservable(): Observable<string | number | null | undefined> {
    return this.authService.user().pipe(
      take(1),
      map(user => user?.id)
    );
  }


  private apiUrl = '/api'; // Ajuste para o URL base da sua API



  createTransactionLote(usuarioId: number, jsonData: any): Observable<any> {
    // A URL é construída dinamicamente com o ID do usuário.
    const url = `${this.apiTransacoesPrefix}${usuarioId}`;
    return this.http.post(url, jsonData);
  }


  // Método para criar uma nova transação
  createTransaction(usuarioId: number | string, transactionData: any): Observable<any> {
    const url = `${this.apiUrl}/transacoes/${usuarioId}/criarTransacao`;
    return this.http.post(url, transactionData);
  }

  private getCotacaoUSD(): Observable<number> {
    if (!this.cotacaoUSDCache$) {
      const url = `${this.apiCotacoesPrefix}?tickers=USD/BRL`;
      this.cotacaoUSDCache$ = this.http.get<CotacaoUSD[]>(url).pipe(
        map((responseArray: CotacaoUSD[]) => {
          if (!responseArray || responseArray.length === 0) {
            console.warn(`DashboardService: Resposta da API de cotação veio vazia ou nula para USD. Retornando 0.`);
            return 0;
          }

          const cotacao = responseArray[0].valorCotacao;

          if (typeof cotacao !== 'number' || isNaN(cotacao) || cotacao <= 0) {
            console.warn(`DashboardService: A propriedade 'valorCotacao' é inválida no primeiro item da resposta. Retornando 0.`, responseArray[0]);
            return 0;
          }
          return cotacao;
        }),
        catchError(error => {
          console.error(`DashboardService: Erro HTTP ao buscar cotação USD. Retornando 0.`, error);
          return of(0);
        }),
        shareReplay(1) // Cacheia o último valor e o compartilha com novos inscritos
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
      console.warn(`[DashboardService.parseFormattedString] Falha ao parsear: "${value}" -> "${cleanedValue}". Retornando 0.`);
      return 0;
    }
    return parsed;
  }

  private convertUsdToBrlNumeric(ativos: AtivoVO[], cotacaoUSD: number): AtivoVO[] {
    if (cotacaoUSD <= 0) {
      console.warn(`[convertUsdToBrlNumeric] Cotação USD inválida ou zero (${cotacaoUSD}). Retornando ativos sem conversão numérica.`);
      return ativos;
    }

    return ativos.map(ativo => {
      const ativoModificado = { ...ativo };

      if (ativoModificado.moedaFormatada === 'USD') {
        const valorAtualUSD = this.parseFormattedString(ativoModificado.valorAtualFormatado?.toString());
        if (!isNaN(valorAtualUSD)) {
          ativoModificado.valorAtualFormatado = valorAtualUSD * cotacaoUSD;
        } else {
          ativoModificado.valorAtualFormatado = 0;
        }

        const valorInvestidoUSD = this.parseFormattedString(ativoModificado.valorInvestidoFormatado?.toString());
        if (!isNaN(valorInvestidoUSD)) {
          ativoModificado.valorInvestidoFormatado = valorInvestidoUSD * cotacaoUSD;
        } else {
          ativoModificado.valorInvestidoFormatado = 0;
        }

        const precoMedioUSD = this.parseFormattedString(ativoModificado.precoMedioFormatado?.toString());
        if (!isNaN(precoMedioUSD)) {
          ativoModificado.precoMedioFormatado = precoMedioUSD * cotacaoUSD;
        } else {
          ativoModificado.precoMedioFormatado = 0;
        }

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
            console.error("ID do usuário não disponível para buscar patrimônio completo.");
            return of([]);
          }

          const url = `${this.apiUserPatrimonioPrefix}${usuarioId}/patrimoniocompleto`;
          return forkJoin({
            patrimonio: this.http.get<PatrimonioCompletoResponse[]>(url),
            cotacao: this.getCotacaoUSD()
          }).pipe(
            switchMap(({ patrimonio, cotacao }) => {
              if (!patrimonio || patrimonio.length === 0) {
                return of([]);
              }

              const ativosVO: AtivoVO[] = patrimonio.map(item => ({
                id: item.ticker, // Usando ticker como id temporário se 'id' não vier
                tickerFormatado: item.tickerFormatado,
                descricaoFormatada: item.descricaoFormatada,
                tipoAtivoFormatado: item.tipoAtivoFormatado,
                moedaFormatada: item.moedaFormatada,
                quantidadeFormatada: this.parseFormattedString(item.quantidadeFormatada),
                valorInvestidoFormatado: this.parseFormattedString(item.valorInvestidoFormatado),
                precoMedioFormatado: this.parseFormattedString(item.precoMedioFormatado),
                precoAtualFormatado: 0, // Inicializa com 0, será atualizado com a cotação real
                valorAtualFormatado: this.parseFormattedString(item.valorAtualFormatado),
                lucroPrejuizoFormatado: this.parseFormattedString(item.lucroPrejuizoFormatado),
                moeda: item.moeda,
                category: this.mapTipoAtivoToCategory(item.tipoAtivoFormatado) // Mapeia para a categoria usada internamente
              }));

              // Converte os valores de USD para BRL, se necessário, para todo o patrimônio
              const ativosConvertidosNumeric = this.convertUsdToBrlNumeric(ativosVO, cotacao);

              // Extrai os tickers dos ativos e cria a query string para cotações (se aplicável)
              const tickersToFetch = ativosConvertidosNumeric
                .filter(ativo => ativo.tipoAtivoFormatado !== 'CAIXA') // Caixa não precisa de cotação externa
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
                        return ativo; // Caixa já tem o valor correto
                      }

                      const cotacaoAtivo = cotacoesMap.get(ativo.tickerFormatado);
                      const precoAtual = cotacaoAtivo
                        ? (cotacaoAtivo.cambio === 'USD' ? cotacaoAtivo.valorCotacao * cotacao : cotacaoAtivo.valorCotacao)
                        : 0; // Se não encontrar cotação, assume 0

                      // Recalcula valorAtualFormatado e lucroPrejuizoFormatado com o precoAtual
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
                    console.error(`DashboardService: Erro ao buscar cotações para o patrimônio completo:`, error);
                    // Retorna os ativos convertidos numericamente, com precoAtualFormatado zerado
                    return of(ativosConvertidosNumeric.map(ativo => ({
                      ...ativo,
                      precoAtualFormatado: 0
                    })));
                  })
                );
              } else {
                return of(ativosConvertidosNumeric);
              }
            }),
            catchError(error => {
              console.error(`DashboardService: Erro ao buscar patrimônio completo para usuário ${usuarioId}:`, error);
              return of([]);
            })
          );
        }),
        shareReplay(1) // Cacheia o resultado para múltiplas subscrições
      );
    }
    return this.patrimonioCompletoCache$;
  }






  getDistribuicaoPatrimonio(): Observable<PatrimonioDistribuicaoVO[]> {
    return this.getPatrimonioCompleto().pipe(
      map(patrimonioCompleto => {
        if (!patrimonioCompleto || patrimonioCompleto.length === 0) {
          return [];
        }

        // Calcular totais por categoria
        const categoryTotals: { [key: string]: number } = {};
        patrimonioCompleto.forEach(ativo => {
          const category = ativo.category || 'outros'; // Garante que há uma categoria
          categoryTotals[category] = (categoryTotals[category] || 0) + (ativo.valorAtualFormatado || 0);
        });

        const distribuicaoModificada: PatrimonioDistribuicaoVO[] = Object.entries(categoryTotals).map(([tipoAtivo, total]) => ({
          tipoAtivo: tipoAtivo.charAt(0).toUpperCase() + tipoAtivo.slice(1), // Capitaliza a primeira letra
          valorTotal: total,
          percentual: 0 // Será calculado abaixo
        }));

        const totalGeral = distribuicaoModificada.reduce((sum, item) => sum + item.valorTotal, 0);

        const distribuicaoFinal = distribuicaoModificada.map(item => {
          item.percentual = totalGeral > 0 ? (item.valorTotal / totalGeral) * 100 : 0;
          item.percentual = Math.round(item.percentual * 100) / 100; // Arredonda para 2 casas decimais
          return item;
        });

        return distribuicaoFinal;
      }),
      catchError(error => {
        console.error(`DashboardService: Erro ao buscar distribuição de patrimônio:`, error);
        return of([]);
      })
    );
  }

  getPatrimonioAcoes(): Observable<AtivoVO[]> {
    return this.getPatrimonioCompleto().pipe(
      map(patrimonioCompleto =>
        patrimonioCompleto.filter(ativo => ativo.category === 'acoes')
      ),
      catchError(error => {
        console.error(`DashboardService: Erro ao filtrar ações do patrimônio completo:`, error);
        return of([]);
      })
    );
  }

  getPatrimonioFundos(): Observable<AtivoVO[]> {
    return this.getPatrimonioCompleto().pipe(
      map(patrimonioCompleto =>
        patrimonioCompleto.filter(ativo => ativo.category === 'fundos')
      ),
      catchError(error => {
        console.error(`DashboardService: Erro ao filtrar fundos do patrimônio completo:`, error);
        return of([]);
      })
    );
  }

  getPatrimonioCaixa(): Observable<AtivoVO[]> {
    return this.getPatrimonioCompleto().pipe(
      map(patrimonioCompleto =>
        patrimonioCompleto.filter(ativo => ativo.category === 'caixa')
      ),
      catchError(error => {
        console.error(`DashboardService: Erro ao filtrar caixa do patrimônio completo:`, error);
        return of([]);
      })
    );
  }

  getPatrimonioAssets(): Observable<AtivoVO[]> {
    return this.getPatrimonioCompleto().pipe(
      map(patrimonioCompleto =>
        patrimonioCompleto.filter(ativo => ativo.category === 'assets')
      ),
      catchError(error => {
        console.error(`DashboardService: Erro ao filtrar assets do patrimônio completo:`, error);
        return of([]);
      })
    );
  }

  // As funções deleteAtivo, updateAtivo e addTransaction não precisam ser alteradas,
  // pois elas já usam o `usuarioId` e a `category` para interagir com a API de forma genérica.
  // Elas não dependem diretamente de como os dados são obtidos inicialmente.

  public deleteAtivo(usuarioId: number | string, tickerFormatado: string, category: string): Observable<void> {
    if (!['fundos', 'acoes', 'caixa', 'assets'].includes(category)) {
      console.error(`Categoria inválida para exclusão: ${category}`);
      return throwError(() => new Error('Categoria inválida'));
    }

    const encodedTicker = encodeURIComponent(tickerFormatado);
    const url = `${this.apiUserPatrimonioPrefix}${usuarioId}/${encodedTicker}`;

    return this.http.delete<void>(url, { observe: 'response' }).pipe(
      tap(response => {
        if (response.status === 204) {
          console.log(`Ticker ${tickerFormatado} excluído com sucesso da categoria ${category} (204 No Content).`);
          // Opcional: invalidar o cache de patrimonioCompleto aqui se a exclusão afeta os dados
          this.patrimonioCompletoCache$ = null;
        } else {
          console.warn(`Resposta inesperada ao excluir Ticker ${tickerFormatado}: status ${response.status}`);
        }
      }),
      map(() => void 0),
      catchError(error => {
        console.error(`Erro ao excluir Ticker ${tickerFormatado} da categoria ${category}:`, error);
        return throwError(() => new Error(`Erro ao excluir Ticker: ${error.message || 'Erro desconhecido'}`));
      })
    );
  }

    updateAtivo(usuarioId: number | string, ativo: AtivoVO, category: string): Observable<void> {
    // Adicionado 'outros' às categorias válidas, caso seu backend aceite.
    if (!['fundos', 'acoes', 'caixa', 'assets', 'outros'].includes(category)) {
      console.error(`Categoria inválida para atualização: ${category}`);
      return throwError(() => new Error('Categoria inválida'));
    }

    if (!ativo.tickerFormatado || ativo.tickerFormatado.trim() === '') {
      console.error(`Ticker inválido para ativo na categoria ${category}:`, ativo);
      return throwError(() => new Error('Ticker inválido'));
    }

    const encodedTicker = encodeURIComponent(ativo.tickerFormatado);
    const url = `${this.apiUserPatrimonioPrefix}${usuarioId}/${encodedTicker}`;
    console.log('URL de atualização gerada:', url);

    const ativoParaEnviar: any = {
      idPatrimonio: typeof ativo.id === 'string' ? Number(ativo.id) : (ativo.id || 0),
      descricao: ativo.descricaoFormatada || '',
      quantidade: ativo.quantidadeFormatada || 0,
      precoMedio: ativo.precoMedioFormatado || 0,
      valorInvestido: ativo.valorInvestidoFormatado || 0,
      ticker: ativo.tickerFormatado,
      usuario: {
        id: Number(usuarioId) || 0 // Garante que o ID do usuário seja um número
      },
      tipoAtivo: this.mapCategoryToTipoAtivoNumber(category),
      moeda: ativo.moeda || 'BRL'
    };

    // Para tipoAtivo = 3 (Caixa), inclui valorAtual com base em valorAtualFormatado
    // NOTA: Usando tipoAtivo = 3 para Caixa. Ajustar para tipoAtivo = 4 se for a intenção.
    if (ativoParaEnviar.tipoAtivo === 3) {
      const valorAtual = typeof ativo.valorAtualFormatado === 'string'
        ? parseFloat((ativo.valorAtualFormatado as string).replace(',', '.')) || 0
        : (typeof ativo.valorAtualFormatado === 'number' ? ativo.valorAtualFormatado : 0);
      if (valorAtual > 0) {
        ativoParaEnviar.valorAtual = valorAtual;
        console.log(`Incluindo valorAtual=${valorAtual} para ticker ${ativo.tickerFormatado} (Caixa)`);
      } else {
        console.warn(`valorAtualFormatado inválido (${ativo.valorAtualFormatado}) para ticker ${ativo.tickerFormatado} (Caixa). Não incluído.`);
      }
    }

    console.log('Objeto enviado para atualização:', ativoParaEnviar);

    return this.http.put<void>(url, ativoParaEnviar, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      tap(() => {
        console.log(`Ativo com ticker ${ativo.tickerFormatado} atualizado com sucesso na categoria ${category}.`);
        this.patrimonioCompletoCache$ = null;
      }),
      catchError(error => {
        console.error(`Erro ao atualizar ativo com ticker ${ativo.tickerFormatado} na categoria ${category}:`, {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          requestBody: ativoParaEnviar
        });
        const backendErrorMessage = error.error?.attributeName && error.error?.objectName
          ? `Erro de validação no campo '${error.error.attributeName}' para o objeto '${error.error.objectName}'. Valor inválido: '${error.error.value}'`
          : error.error?.message || error.message || 'Erro desconhecido';
        return throwError(() => new Error(`Erro ao atualizar ativo: ${backendErrorMessage}`));
      })
    );
  }

  addTransaction(userId: number | string, transactionData: any): Observable<any> {
    const category = transactionData.category;
    if (!['fundos', 'acoes', 'assets', 'caixa'].includes(category)) {
      console.error(`Categoria inválida para transação: ${category}`);
      return throwError(() => new Error('Categoria inválida'));
    }

    // Como esta é uma função simulada, ela não faz uma chamada HTTP real.
    // Em um cenário real, você faria uma chamada POST/PUT para adicionar a transação.
    // Após uma transação bem-sucedida, você deve invalidar o cache de patrimônio completo.
    this.patrimonioCompletoCache$ = null;

    return of({ success: true });
  }



  public clearPatrimonioCache(): void {
    this.patrimonioCompletoCache$ = null;
    this.cotacaoUSDCache$ = null; // Também limpa o cache da cotação USD
 //   console.log('DashboardService: Cache de patrimônio limpo.');
  }



  private mapTipoAtivoToCategory(tipoAtivoFormatado: string): string {
    switch (tipoAtivoFormatado.toUpperCase()) {
      case 'AÇÃO':
        return 'acoes';
      case 'FII': // Considerando FIIs como Fundos
      case 'FUNDO':
        return 'fundos';
      case 'CAIXA':
        return 'caixa';
      case 'ASSET': // Ou o que for retornado da API
        return 'assets';
      default:
        return 'outros';
    }
  }

  // --- Adição abaixo ---
  private mapCategoryToTipoAtivoNumber(category: string): number {
    switch (category.toLowerCase()) {
      case 'acoes': return 1;
      case 'fundos': return 2;
      case 'caixa': return 3;
      case 'assets': return 4;
      default: return 0; // Valor padrão se a categoria não for mapeada
    }
  }

}

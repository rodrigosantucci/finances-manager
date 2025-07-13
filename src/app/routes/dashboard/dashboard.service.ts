import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, take, tap } from 'rxjs/operators';
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
  id: number | string;
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


@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  protected readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly apiUserPatrimonioPrefix = '/api/patrimonios/usuario/';
  private readonly apiCotacoesPrefix = '/api/cotacoes/tickers/';

  private getUsuarioIdObservable(): Observable<string | number | null | undefined> {
    return this.authService.user().pipe(
      take(1),
      map(user => user?.id)
    );
  }

  private getCotacaoUSD(): Observable<number> {
    const url = `${this.apiCotacoesPrefix}?tickers=USD/BRL`;
 //   console.log(`DashboardService: Solicitando cotação USD da URL: ${url}`);

    return this.http.get<CotacaoUSD[]>(url).pipe(
      tap(response => {
        // You can log or inspect the response here if needed
      }),
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

    //    console.log(`DashboardService: Cotação USD extraída com sucesso: ${cotacao}`);
        return cotacao;
      }),
      catchError(error => {
        console.error(`DashboardService: Erro HTTP ao buscar cotação USD. Retornando 0.`, error);
        return of(0);
      })
    );
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
     //   console.log(`Convertendo USD para BRL (valor NUMÉRICO) para ativo ${ativoModificado.tickerFormatado}`);

        const valorAtualUSD = this.parseFormattedString(ativoModificado.valorAtualFormatado?.toString());
        if (!isNaN(valorAtualUSD)) {
          ativoModificado.valorAtualFormatado = valorAtualUSD * cotacaoUSD;
        } else {
          console.warn(`Não foi possível parsear valorAtualFormatado para ${ativoModificado.tickerFormatado}. Valor: ${ativoModificado.valorAtualFormatado}. Atribuindo 0.`);
          ativoModificado.valorAtualFormatado = 0;
        }

        const valorInvestidoUSD = this.parseFormattedString(ativoModificado.valorInvestidoFormatado?.toString());
        if (!isNaN(valorInvestidoUSD)) {
          ativoModificado.valorInvestidoFormatado = valorInvestidoUSD * cotacaoUSD;
        } else {
          console.warn(`Não foi possível parsear valorInvestidoFormatado para ${ativoModificado.tickerFormatado}. Valor: ${ativoModificado.valorInvestidoFormatado}. Atribuindo 0.`);
          ativoModificado.valorInvestidoFormatado = 0;
        }

        const precoMedioUSD = this.parseFormattedString(ativoModificado.precoMedioFormatado?.toString());
        if (!isNaN(precoMedioUSD)) {
          ativoModificado.precoMedioFormatado = precoMedioUSD * cotacaoUSD;
        } else {
          console.warn(`Não foi possível parsear precoMedioFormatado para ${ativoModificado.tickerFormatado}. Valor: ${ativoModificado.precoMedioFormatado}. Atribuindo 0.`);
          ativoModificado.precoMedioFormatado = 0;
        }

        ativoModificado.lucroPrejuizoFormatado = ativoModificado.valorAtualFormatado - ativoModificado.valorInvestidoFormatado;

        ativoModificado.moedaFormatada = 'BRL';
      } else {
     //   console.log(`Ativo ${ativoModificado.tickerFormatado} não é USD (${ativoModificado.moedaFormatada}). Pulando conversão numérica.`);
        ativoModificado.valorAtualFormatado = this.parseFormattedString(ativoModificado.valorAtualFormatado?.toString());
        ativoModificado.valorInvestidoFormatado = this.parseFormattedString(ativoModificado.valorInvestidoFormatado?.toString());
        ativoModificado.precoMedioFormatado = this.parseFormattedString(ativoModificado.precoMedioFormatado?.toString());
        ativoModificado.lucroPrejuizoFormatado = this.parseFormattedString(ativoModificado.lucroPrejuizoFormatado?.toString());
      }
      ativoModificado.quantidadeFormatada = this.parseFormattedString(ativoModificado.quantidadeFormatada?.toString());
      return ativoModificado;
    });
  }

  getDistribuicaoPatrimonio(): Observable<PatrimonioDistribuicaoVO[]> {
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("ID do usuário não disponível para buscar distribuição de patrimônio.");
          return of([]);
        }

        const distUrl = `${this.apiUserPatrimonioPrefix}${usuarioId}/distribuicao`;
     //   console.log(`DashboardService: Solicitando distribuição para usuário ID: ${usuarioId} da URL: ${distUrl}`);

        return forkJoin({
          distribuicao: this.http.get<PatrimonioDistribuicaoVO[]>(distUrl),
          acoes: this.getPatrimonioAcoes(),
          fundos: this.getPatrimonioFundos(),
          caixa: this.getPatrimonioCaixa(),
          assets: this.getPatrimonioAssets()
        }).pipe(
          map(({ distribuicao, acoes, fundos, caixa, assets }) => {
       //     console.log(`DashboardService: Distribuição bruta recebida:`, distribuicao);

            // Calculate category totals from asset data (already in BRL)
            const categoryTotals: { [key: string]: number } = {
              Ações: acoes.reduce((sum, item) => sum + (item.valorAtualFormatado || 0), 0),
              Fundos: fundos.reduce((sum, item) => sum + (item.valorAtualFormatado || 0), 0),
              Caixa: caixa.reduce((sum, item) => sum + (item.valorAtualFormatado || 0), 0),
              Assets: assets.reduce((sum, item) => sum + (item.valorAtualFormatado || 0), 0)
            };
        //    console.log(`DashboardService: Totais calculados por categoria (BRL):`, categoryTotals);

            // Create a map of distribution items by tipoAtivo
            const distribuicaoMap = new Map<string, PatrimonioDistribuicaoVO>(
              distribuicao.map(item => [item.tipoAtivo, { ...item }])
            );

            // Update valorTotal in distribution to match category totals
            Object.entries(categoryTotals).forEach(([tipoAtivo, total]) => {
              if (distribuicaoMap.has(tipoAtivo)) {
                const item = distribuicaoMap.get(tipoAtivo)!;
                const originalValor = item.valorTotal;
                item.valorTotal = total;
       //         console.log(`DashboardService: Ajustando '${tipoAtivo}' valorTotal de ${originalValor} para ${total} (BRL)`);
              } else {
                // If category is missing in distribution, add it
                distribuicaoMap.set(tipoAtivo, {
                  tipoAtivo,
                  valorTotal: total,
                  percentual: 0 // Will be calculated below
                });
        //        console.log(`DashboardService: Adicionando '${tipoAtivo}' à distribuição com valorTotal ${total}`);
              }
            });

            // Convert map back to array
            const distribuicaoModificada = Array.from(distribuicaoMap.values());

            // Calculate total for percentage
            const totalGeral = distribuicaoModificada.reduce((sum, item) => sum + item.valorTotal, 0);
      //      console.log(`DashboardService: Total geral para percentuais: ${totalGeral}`);

            // Update percentages
            const distribuicaoFinal = distribuicaoModificada.map(item => {
              item.percentual = totalGeral > 0 ? (item.valorTotal / totalGeral) * 100 : 0;
              item.percentual = Math.round(item.percentual * 100) / 100; // Round to 2 decimals
       //       console.log(`DashboardService: '${item.tipoAtivo}' - Valor: ${item.valorTotal}, Percentual: ${item.percentual}%`);
              return item;
            });

      //      console.log(`DashboardService: Distribuição final:`, distribuicaoFinal);
            return distribuicaoFinal;
          }),
          catchError(error => {
            console.error(`DashboardService: Erro ao buscar distribuição de patrimônio para usuário ${usuarioId}:`, error);
            return of([]);
          })
        );
      })
    );
  }

getPatrimonioAcoes(): Observable<AtivoVO[]> {
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("ID do usuário não disponível para buscar patrimônio de ações.");
          return of([]);
        }

        const acoesUrl = `${this.apiUserPatrimonioPrefix}${usuarioId}/acoes`;
      //  console.log(`DashboardService: Solicitando ações para usuário ID: ${usuarioId} da URL: ${acoesUrl}`);

        return forkJoin({
          acoes: this.http.get<AtivoVO[]>(acoesUrl),
          cotacao: this.getCotacaoUSD()
        }).pipe(
          switchMap(({ acoes, cotacao }) => {
        //    console.log(`DashboardService: Ações brutas recebidas:`, acoes);
        //    console.log(`DashboardService: Cotação USD recebida para ações: ${cotacao}`);

            if (!acoes || acoes.length === 0) {
         //     console.log(`DashboardService: Nenhuma ação encontrada para usuário ${usuarioId}.`);
              return of([]);
            }

            // Converte os valores de USD para BRL, se necessário
            const acoesConvertidasNumeric = this.convertUsdToBrlNumeric(acoes, cotacao);
        //    console.log(`DashboardService: Ações após conversão USD->BRL:`, acoesConvertidasNumeric);

            // Extrai os tickers das ações e cria a query string
            const tickers = acoesConvertidasNumeric.map(ativo => ativo.tickerFormatado).join(',');
            const cotacoesUrl = `${this.apiCotacoesPrefix}?tickers=${tickers}`;
        //    console.log(`DashboardService: Solicitando cotações para tickers: ${tickers} da URL: ${cotacoesUrl}`);

            // Faz uma única chamada à API de Cotações
            return this.http.get<CotacaoUSD[]>(cotacoesUrl).pipe(
              map(cotacoes => {
                // Mapeia as cotações para um objeto para fácil acesso
                const cotacoesMap = new Map<string, number>(
                  cotacoes.map(c => [c.ticker, c.valorCotacao])
                );

                // Atualiza as ações com os preços atuais e a categoria
                return acoesConvertidasNumeric.map(ativo => ({
                  ...ativo,
                  precoAtualFormatado: cotacoesMap.get(ativo.tickerFormatado) || 0,
                  category: 'acoes'
                }));
              }),
              catchError(error => {
                console.error(`DashboardService: Erro ao buscar cotações para tickers ${tickers}:`, error);
                // Retorna ações com precoAtualFormatado zerado em caso de erro
                return of(
                  acoesConvertidasNumeric.map(ativo => ({
                    ...ativo,
                    precoAtualFormatado: 0,
                    category: 'acoes'
                  }))
                );
              })
            );
          }),
          catchError(error => {
            console.error(`DashboardService: Erro ao buscar ações para usuário ${usuarioId}:`, error);
            return of([]);
          })
        );
      })
    );
}

getPatrimonioFundos(): Observable<AtivoVO[]> {
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("ID do usuário não disponível para buscar patrimônio de fundos.");
          return of([]);
        }

        const fundosUrl = `${this.apiUserPatrimonioPrefix}${usuarioId}/fundos`;
     //   console.log(`DashboardService: Solicitando fundos para usuário ID: ${usuarioId} da URL: ${fundosUrl}`);

        return forkJoin({
          fundos: this.http.get<AtivoVO[]>(fundosUrl),
          cotacao: this.getCotacaoUSD()
        }).pipe(
          switchMap(({ fundos, cotacao }) => {
        //    console.log(`DashboardService: Fundos brutos recebidos:`, fundos);
        //    console.log(`DashboardService: Cotação USD recebida para fundos: ${cotacao}`);

            if (!fundos || fundos.length === 0) {
           //   console.log(`DashboardService: Nenhum fundo encontrado para usuário ${usuarioId}.`);
              return of([]);
            }

            // Converte os valores de USD para BRL, se necessário
            const fundosConvertidosNumeric = this.convertUsdToBrlNumeric(fundos, cotacao);
        //    console.log(`DashboardService: Fundos após conversão USD->BRL:`, fundosConvertidosNumeric);

            // Extrai os tickers dos fundos e cria a query string
            const tickers = fundosConvertidosNumeric.map(ativo => ativo.tickerFormatado).join(',');
            const cotacoesUrl = `${this.apiCotacoesPrefix}?tickers=${tickers}`;
          //  console.log(`DashboardService: Solicitando cotações para tickers: ${tickers} da URL: ${cotacoesUrl}`);

            // Faz uma única chamada à API de Cotações
            return this.http.get<CotacaoUSD[]>(cotacoesUrl).pipe(
              map(cotacoes => {
                // Mapeia as cotações para um objeto para fácil acesso
                const cotacoesMap = new Map<string, number>(
                  cotacoes.map(c => [c.ticker, c.valorCotacao])
                );

                // Atualiza os fundos com os preços atuais e a categoria
                return fundosConvertidosNumeric.map(ativo => ({
                  ...ativo,
                  precoAtualFormatado: cotacoesMap.get(ativo.tickerFormatado) || 0,
                  category: 'fundos'
                }));
              }),
              catchError(error => {
                console.error(`DashboardService: Erro ao buscar cotações para tickers ${tickers}:`, error);
                // Retorna fundos com precoAtualFormatado zerado em caso de erro
                return of(
                  fundosConvertidosNumeric.map(ativo => ({
                    ...ativo,
                    precoAtualFormatado: 0,
                    category: 'fundos'
                  }))
                );
              })
            );
          }),
          catchError(error => {
            console.error(`DashboardService: Erro ao buscar fundos para usuário ${usuarioId}:`, error);
            return of([]);
          })
        );
      })
    );
}

  getPatrimonioCaixa(): Observable<AtivoVO[]> {
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
        //  console.error("ID do usuário não disponível para buscar patrimônio de caixa.");
          return of([]);
        }

        const caixaUrl = `${this.apiUserPatrimonioPrefix}${usuarioId}/caixa`;
       // console.log(`DashboardService: Solicitando caixa para usuário ID: ${usuarioId} da URL: ${caixaUrl}`);

        return forkJoin({
          caixa: this.http.get<AtivoVO[]>(caixaUrl),
          cotacao: this.getCotacaoUSD()
        }).pipe(
          map(({ caixa, cotacao }) => {
        //    console.log(`DashboardService: Caixa bruta recebida:`, caixa);
        //    console.log(`DashboardService: Cotação USD recebida para caixa: ${cotacao}`);

            if (!caixa || caixa.length === 0) {
        //      console.log(`DashboardService: Nenhum caixa encontrado para usuário ${usuarioId}.`);
              return [];
            }

            const caixaConvertidosNumeric = this.convertUsdToBrlNumeric(caixa, cotacao);
        //    console.log(`DashboardService: Caixa após conversão USD->BRL:`, caixaConvertidosNumeric);

            return caixaConvertidosNumeric.map(ativo => ({
              ...ativo,
              category: 'caixa'
            }));
          }),
          catchError(error => {
            console.error(`DashboardService: Erro ao buscar caixa para usuário ${usuarioId}:`, error);
            return of([]);
          })
        );
      })
    );
  }

  getPatrimonioAssets(): Observable<AtivoVO[]> {
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("ID do usuário não disponível para buscar patrimônio de assets internacionais.");
          return of([]);
        }

        const assetsUrl = `${this.apiUserPatrimonioPrefix}${usuarioId}/assets`;
      //  console.log(`DashboardService: Solicitando assets para usuário ID: ${usuarioId} da URL: ${assetsUrl}`);

        return forkJoin({
          assets: this.http.get<AtivoVO[]>(assetsUrl),
          cotacao: this.getCotacaoUSD()
        }).pipe(
          switchMap(({ assets, cotacao }) => {
       //     console.log(`DashboardService: Assets brutos recebidos:`, assets);
       //     console.log(`DashboardService: Cotação USD recebida para assets: ${cotacao}`);

            if (!assets || assets.length === 0) {
         //     console.log(`DashboardService: Nenhum ativo internacional encontrado para usuário ${usuarioId}.`);
              return of([]);
            }

            // Converte os valores de USD para BRL, se necessário
            const assetsConvertidosNumeric = this.convertUsdToBrlNumeric(assets, cotacao);
        //    console.log(`DashboardService: Assets após conversão USD->BRL:`, assetsConvertidosNumeric);

            // Extrai os tickers dos assets e cria a query string
            const tickers = assetsConvertidosNumeric.map(ativo => ativo.tickerFormatado).join(',');
            const cotacoesUrl = `${this.apiCotacoesPrefix}?tickers=${tickers}`;
       //     console.log(`DashboardService: Solicitando cotações para tickers: ${tickers} da URL: ${cotacoesUrl}`);

            // Faz uma única chamada à API de Cotações
            return this.http.get<CotacaoUSD[]>(cotacoesUrl).pipe(
              map(cotacoes => {
                // Mapeia as cotações para um objeto para fácil acesso
                const cotacoesMap = new Map<string, { valorCotacao: number, cambio: string }>(
                  cotacoes.map(c => [c.ticker, { valorCotacao: c.valorCotacao, cambio: c.cambio }])
                );

                // Atualiza os assets com os preços atuais e a categoria
                return assetsConvertidosNumeric.map(ativo => {
                  const cotacaoAtivo = cotacoesMap.get(ativo.tickerFormatado);
                  const precoAtual = cotacaoAtivo
                    ? (cotacaoAtivo.cambio === 'USD' ? cotacaoAtivo.valorCotacao * cotacao : cotacaoAtivo.valorCotacao)
                    : 0;

                  return {
                    ...ativo,
                    precoAtualFormatado: precoAtual,
                    category: 'assets'
                  };
                });
              }),
              catchError(error => {
                console.error(`DashboardService: Erro ao buscar cotações para tickers ${tickers}:`, error);
                // Retorna assets com precoAtualFormatado zerado em caso de erro
                return of(
                  assetsConvertidosNumeric.map(ativo => ({
                    ...ativo,
                    precoAtualFormatado: 0,
                    category: 'assets'
                  }))
                );
              })
            );
          }),
          catchError(error => {
            console.error(`DashboardService: Erro ao buscar assets para usuário ${usuarioId}:`, error);
            return of([]);
          })
        );
      })
    );
}

public deleteAtivo(usuarioId: number | string, tickerFormatado: string, category: string): Observable<void> {
  if (!['fundos', 'acoes', 'caixa', 'assets'].includes(category)) {
    console.error(`Categoria inválida para exclusão: ${category}`);
    return throwError(() => new Error('Categoria inválida'));
  }

  const encodedTicker = encodeURIComponent(tickerFormatado);
  const url = `${this.apiUserPatrimonioPrefix}${usuarioId}/${encodedTicker}`;
//  console.log(`DashboardService: Excluindo Ticker ${tickerFormatado} na categoria ${category} para usuário ${usuarioId} na URL: ${url}`);

  return this.http.delete<void>(url, { observe: 'response' }).pipe(
    tap(response => {
      if (response.status === 204) {
        console.log(`Ticker ${tickerFormatado} excluído com sucesso da categoria ${category} (204 No Content).`);
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
    if (!['fundos', 'acoes', 'caixa', 'assets'].includes(category)) {
        console.error(`Categoria inválida para atualização: ${category}`);
        return throwError(() => new Error('Categoria inválida'));
    }

    if (!ativo.tickerFormatado || ativo.tickerFormatado.trim() === '') {
        console.error(`Ticker inválido para ativo na categoria ${category}:`, ativo);
        return throwError(() => new Error('Ticker inválido'));
    }

    const encodedTicker = encodeURIComponent(ativo.tickerFormatado);
    const url = `${this.apiUserPatrimonioPrefix}${usuarioId}/${encodedTicker}`;
    console.log('URL gerada:', url);

    const ativoParaEnviar = {
        idPatrimonio: ativo.id || 0, // Necessário para identificar o registro
        descricao: ativo.descricaoFormatada || '', // Campo editável: Nome
        quantidade: Number(ativo.quantidadeFormatada) || 0, // Campo editável: Quantidade
        precoMedio: Number(ativo.precoMedioFormatado) || 0, // Campo editável: Preço Médio
        valorInvestido: Number(ativo.valorInvestidoFormatado) || 0, // Campo editável: Valor Investido
        ticker: ativo.tickerFormatado, // Necessário para referência
        usuario: {
            id: Number(usuarioId) || 0 // Necessário para associação com o usuário
        },
    };

   // console.log('Payload enviado:', JSON.stringify(ativoParaEnviar, null, 2));

    return this.http.put<void>(url, ativoParaEnviar, {
        headers: { 'Content-Type': 'application/json' }
    }).pipe(
        tap(() => console.log(`Ativo com ticker ${ativo.tickerFormatado} atualizado com sucesso na categoria ${category}.`)),
        catchError(error => {
            console.error(`Erro ao atualizar ativo com ticker ${ativo.tickerFormatado} na categoria ${category}:`, {
                status: error.status,
                statusText: error.statusText,
                error: error.error
            });
            return throwError(() => new Error(`Erro ao atualizar ativo: ${error.error?.message || error.message || 'Erro desconhecido'}`));
        })
    );
}

  addTransaction(userId: number | string, transactionData: any): Observable<any> {
      const category = transactionData.category;
      if (!['fundos', 'acoes', 'assets','caixa'].includes(category)) {
          console.error(`Categoria inválida para transação: ${category}`);
          return throwError(() => new Error('Categoria inválida'));
      }

  //    console.log(`Transação adicionada com sucesso na categoria ${category} para usuário ${userId}:`, transactionData);

      // Retorna um Observable vazio para evitar erro de falta de retorno
      return of({ success: true });
  }
}

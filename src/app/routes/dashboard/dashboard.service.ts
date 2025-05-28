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
  id: number | string;
  tickerFormatado: string;
  descricaoFormatada: string;
  tipoAtivoFormatado: string;
  moedaFormatada: string;
  quantidadeFormatada: number;
  valorInvestidoFormatado: number;
  precoMedioFormatado: number;
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
    const url = `${this.apiCotacoesPrefix}?tickers=USDBRL`;
    console.log(`DashboardService: Solicitando cotação USD da URL: ${url}`);

    return this.http.get<CotacaoUSD[]>(url).pipe(
      tap(response => console.log(`DashboardService: Resposta da cotação USD recebida:`, response)),
      map(responseArray => {
        if (!responseArray || responseArray.length === 0) {
          console.warn(`DashboardService: Resposta da API de cotação veio vazia ou nula para USD. Retornando 0.`);
          return 0;
        }

        const cotacao = responseArray[0].valorCotacao;

        if (typeof cotacao !== 'number' || isNaN(cotacao) || cotacao <= 0) {
          console.warn(`DashboardService: A propriedade 'valorCotacao' é inválida no primeiro item da resposta. Retornando 0.`, responseArray[0]);
          return 0;
        }

        console.log(`DashboardService: Cotação USD extraída com sucesso: ${cotacao}`);
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
        console.log(`Convertendo USD para BRL (valor NUMÉRICO) para ativo ${ativoModificado.tickerFormatado}`);

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
        console.log(`Ativo ${ativoModificado.tickerFormatado} não é USD (${ativoModificado.moedaFormatada}). Pulando conversão numérica.`);
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
        console.log(`DashboardService: Solicitando distribuição para usuário ID: ${usuarioId} da URL: ${distUrl}`);

        return forkJoin({
          distribuicao: this.http.get<PatrimonioDistribuicaoVO[]>(distUrl),
          acoes: this.getPatrimonioAcoes(),
          fundos: this.getPatrimonioFundos(),
          caixa: this.getPatrimonioCaixa(),
          assets: this.getPatrimonioAssets()
        }).pipe(
          map(({ distribuicao, acoes, fundos, caixa, assets }) => {
            console.log(`DashboardService: Distribuição bruta recebida:`, distribuicao);

            // Calculate category totals from asset data (already in BRL)
            const categoryTotals: { [key: string]: number } = {
              Ações: acoes.reduce((sum, item) => sum + (item.valorAtualFormatado || 0), 0),
              Fundos: fundos.reduce((sum, item) => sum + (item.valorAtualFormatado || 0), 0),
              Caixa: caixa.reduce((sum, item) => sum + (item.valorAtualFormatado || 0), 0),
              Assets: assets.reduce((sum, item) => sum + (item.valorAtualFormatado || 0), 0)
            };
            console.log(`DashboardService: Totais calculados por categoria (BRL):`, categoryTotals);

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
                console.log(`DashboardService: Ajustando '${tipoAtivo}' valorTotal de ${originalValor} para ${total} (BRL)`);
              } else {
                // If category is missing in distribution, add it
                distribuicaoMap.set(tipoAtivo, {
                  tipoAtivo,
                  valorTotal: total,
                  percentual: 0 // Will be calculated below
                });
                console.log(`DashboardService: Adicionando '${tipoAtivo}' à distribuição com valorTotal ${total}`);
              }
            });

            // Convert map back to array
            const distribuicaoModificada = Array.from(distribuicaoMap.values());

            // Calculate total for percentage
            const totalGeral = distribuicaoModificada.reduce((sum, item) => sum + item.valorTotal, 0);
            console.log(`DashboardService: Total geral para percentuais: ${totalGeral}`);

            // Update percentages
            const distribuicaoFinal = distribuicaoModificada.map(item => {
              item.percentual = totalGeral > 0 ? (item.valorTotal / totalGeral) * 100 : 0;
              item.percentual = Math.round(item.percentual * 100) / 100; // Round to 2 decimals
              console.log(`DashboardService: '${item.tipoAtivo}' - Valor: ${item.valorTotal}, Percentual: ${item.percentual}%`);
              return item;
            });

            console.log(`DashboardService: Distribuição final:`, distribuicaoFinal);
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
        console.log(`DashboardService: Solicitando ações para usuário ID: ${usuarioId} da URL: ${acoesUrl}`);

        return forkJoin({
          acoes: this.http.get<AtivoVO[]>(acoesUrl),
          cotacao: this.getCotacaoUSD()
        }).pipe(
          map(({ acoes, cotacao }) => {
            console.log(`DashboardService: Ações brutas recebidas:`, acoes);
            console.log(`DashboardService: Cotação USD recebida para ações: ${cotacao}`);

            if (!acoes || acoes.length === 0) {
              console.log(`DashboardService: Nenhuma ação encontrada para usuário ${usuarioId}.`);
              return [];
            }

            const acoesConvertidasNumeric = this.convertUsdToBrlNumeric(acoes, cotacao);
            console.log(`DashboardService: Ações após conversão USD->BRL:`, acoesConvertidasNumeric);

            return acoesConvertidasNumeric.map(ativo => ({
              ...ativo,
              category: 'acoes'
            }));
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
        console.log(`DashboardService: Solicitando fundos para usuário ID: ${usuarioId} da URL: ${fundosUrl}`);

        return forkJoin({
          fundos: this.http.get<AtivoVO[]>(fundosUrl),
          cotacao: this.getCotacaoUSD()
        }).pipe(
          map(({ fundos, cotacao }) => {
            console.log(`DashboardService: Fundos brutos recebidos:`, fundos);
            console.log(`DashboardService: Cotação USD recebida para fundos: ${cotacao}`);

            if (!fundos || fundos.length === 0) {
              console.log(`DashboardService: Nenhum fundo encontrado para usuário ${usuarioId}.`);
              return [];
            }

            const fundosConvertidosNumeric = this.convertUsdToBrlNumeric(fundos, cotacao);
            console.log(`DashboardService: Fundos após conversão USD->BRL:`, fundosConvertidosNumeric);

            return fundosConvertidosNumeric.map(ativo => ({
              ...ativo,
              category: 'fundos'
            }));
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
          console.error("ID do usuário não disponível para buscar patrimônio de caixa.");
          return of([]);
        }

        const caixaUrl = `${this.apiUserPatrimonioPrefix}${usuarioId}/caixa`;
        console.log(`DashboardService: Solicitando caixa para usuário ID: ${usuarioId} da URL: ${caixaUrl}`);

        return forkJoin({
          caixa: this.http.get<AtivoVO[]>(caixaUrl),
          cotacao: this.getCotacaoUSD()
        }).pipe(
          map(({ caixa, cotacao }) => {
            console.log(`DashboardService: Caixa bruta recebida:`, caixa);
            console.log(`DashboardService: Cotação USD recebida para caixa: ${cotacao}`);

            if (!caixa || caixa.length === 0) {
              console.log(`DashboardService: Nenhum caixa encontrado para usuário ${usuarioId}.`);
              return [];
            }

            const caixaConvertidosNumeric = this.convertUsdToBrlNumeric(caixa, cotacao);
            console.log(`DashboardService: Caixa após conversão USD->BRL:`, caixaConvertidosNumeric);

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
        console.log(`DashboardService: Solicitando assets para usuário ID: ${usuarioId} da URL: ${assetsUrl}`);

        return forkJoin({
          assets: this.http.get<AtivoVO[]>(assetsUrl),
          cotacao: this.getCotacaoUSD()
        }).pipe(
          map(({ assets, cotacao }) => {
            console.log(`DashboardService: Assets brutos recebidos:`, assets);
            console.log(`DashboardService: Cotação USD recebida para assets: ${cotacao}`);

            if (!assets || assets.length === 0) {
              console.log(`DashboardService: Nenhum ativo internacional encontrado para usuário ${usuarioId}.`);
              return [];
            }

            const assetsConvertidosNumeric = this.convertUsdToBrlNumeric(assets, cotacao);
            console.log(`DashboardService: Assets após conversão USD->BRL:`, assetsConvertidosNumeric);

            return assetsConvertidosNumeric.map(ativo => ({
              ...ativo,
              category: 'assets'
            }));
          }),
          catchError(error => {
            console.error(`DashboardService: Erro ao buscar assets para usuário ${usuarioId}:`, error);
            return of([]);
          })
        );
      })
    );
  }

  deleteAtivo(usuarioId: number | string, ativoId: number | string, category: string): Observable<void> {
    let url: string;
    switch (category) {
      case 'acoes':
        url = `${this.apiUserPatrimonioPrefix}${usuarioId}/acoes/${ativoId}`;
        break;
      case 'fundos':
        url = `${this.apiUserPatrimonioPrefix}${usuarioId}/fundos/${ativoId}`;
        break;
      case 'caixa':
        url = `${this.apiUserPatrimonioPrefix}${usuarioId}/caixa/${ativoId}`;
        break;
      case 'assets':
        url = `${this.apiUserPatrimonioPrefix}${usuarioId}/assets/${ativoId}`;
        break;
      default:
        console.error(`Categoria inválida para exclusão: ${category}`);
        return throwError(() => new Error('Categoria inválida'));
    }

    console.log(`DashboardService: Excluindo ativo ID ${ativoId} na categoria ${category} para usuário ${usuarioId} na URL: ${url}`);
    return this.http.delete<void>(url).pipe(
      tap(() => console.log(`Ativo ID ${ativoId} excluído com sucesso da categoria ${category}.`)),
      catchError(error => {
        console.error(`Erro ao excluir ativo ID ${ativoId} da categoria ${category}:`, error);
        return throwError(() => new Error(`Erro ao excluir ativo: ${error.message || 'Erro desconhecido'}`));
      })
    );
  }

  updateAtivo(usuarioId: number | string, ativo: AtivoVO, category: string): Observable<void> {
    let url: string;
    switch (category) {
      case 'acoes':
        url = `${this.apiUserPatrimonioPrefix}${usuarioId}/acoes/${ativo.id}`;
        break;
      case 'fundos':
        url = `${this.apiUserPatrimonioPrefix}${usuarioId}/fundos/${ativo.id}`;
        break;
      case 'caixa':
        url = `${this.apiUserPatrimonioPrefix}${usuarioId}/caixa/${ativo.id}`;
        break;
      case 'assets':
        url = `${this.apiUserPatrimonioPrefix}${usuarioId}/assets/${ativo.id}`;
        break;
      default:
        console.error(`Categoria inválida para atualização: ${category}`);
        return throwError(() => new Error('Categoria inválida'));
    }

    const ativoParaEnviar = { ...ativo };
    ativoParaEnviar.valorInvestidoFormatado = ativo.valorInvestidoFormatado;
    ativoParaEnviar.precoMedioFormatado = ativo.precoMedioFormatado;
    ativoParaEnviar.valorAtualFormatado = ativo.valorAtualFormatado;
    ativoParaEnviar.lucroPrejuizoFormatado = ativo.lucroPrejuizoFormatado;
    ativoParaEnviar.quantidadeFormatada = ativo.quantidadeFormatada;

    console.log(`DashboardService: Atualizando ativo ID ${ativo.id} na categoria ${category} na URL: ${url}`);
    return this.http.put<void>(url, ativoParaEnviar).pipe(
      tap(() => console.log(`Ativo ID ${ativo.id} atualizado com sucesso na categoria ${category}.`)),
      catchError(error => {
        console.error(`Erro ao atualizar ativo ID ${ativo.id} na categoria ${category}:`, error);
        return throwError(() => new Error(`Erro ao atualizar ativo: ${error.message || 'Erro desconhecido'}`));
      })
    );
  }

  addTransaction(userId: number | string, transactionData: any): Observable<any> {
    const category = transactionData.category;
    if (!category) {
      return throwError(() => new Error('Categoria da transação não especificada.'));
    }

    const url = `${this.apiUserPatrimonioPrefix}${userId}/${category}`;
    console.log(`DashboardService: Adicionando transação na categoria ${category} para usuário ${userId} na URL: ${url}`);

    const dataToSend = { ...transactionData };
    dataToSend.valorInvestido = this.parseFormattedString(transactionData.valorInvestido?.toString()).toString();
    dataToSend.precoMedio = this.parseFormattedString(transactionData.precoMedio?.toString()).toString();
    dataToSend.quantidade = this.parseFormattedString(transactionData.quantidade?.toString()).toString();

    return this.http.post<any>(url, dataToSend).pipe(
      tap(response => console.log(`Transação adicionada com sucesso:`, response)),
      catchError(error => {
        console.error(`Erro ao adicionar transação na categoria ${category}:`, error);
        return throwError(() => new Error(`Erro ao adicionar transação: ${error.message || 'Erro desconhecido'}`));
      })
    );
  }
}

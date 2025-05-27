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
  id: number | string; // Permitir string para novos ativos antes de receber um ID do backend
  tickerFormatado: string;
  descricaoFormatada: string;
  tipoAtativoFormatado: string;
  moedaFormatada: string;
  quantidadeFormatada: number; // Alterado para number
  valorInvestidoFormatado: number; // Alterado para number
  precoMedioFormatado: number; // Alterado para number
  valorAtualFormatado: number; // Alterado para number
  lucroPrejuizoFormatado: number; // Alterado para number
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

  // Permanece para parsear strings de entrada (ex: do formulário de edição)
  public parseFormattedString(value: string | undefined | null): number {
    if (value === null || value === undefined || value.trim() === '') {
      return 0;
    }
    let cleanedValue = value.trim();

    // Remove caracteres não numéricos, exceto vírgulas, pontos e sinais de menos
    cleanedValue = cleanedValue.replace(/[^\d.,-]/g, '');

    // Verifica se há tanto vírgula quanto ponto para decidir a formatação
    if (cleanedValue.includes(',') && cleanedValue.includes('.')) {
      // Se a vírgula vier depois do ponto, é formato brasileiro (ex: 1.000,00)
      if (cleanedValue.indexOf(',') > cleanedValue.indexOf('.')) {
        cleanedValue = cleanedValue.replace(/\./g, ''); // Remove separadores de milhar
        cleanedValue = cleanedValue.replace(/,/g, '.'); // Troca vírgula por ponto decimal
      } else {
        // Se o ponto vier depois da vírgula, é formato americano (ex: 1,000.00)
        cleanedValue = cleanedValue.replace(/,/g, ''); // Remove separadores de milhar
      }
    } else if (cleanedValue.includes(',')) {
      // Se tiver só vírgula, assume que é separador decimal (formato brasileiro)
      cleanedValue = cleanedValue.replace(/,/g, '.');
    }

    const parsed = parseFloat(cleanedValue);

    if (isNaN(parsed)) {
      console.warn(`[DashboardService.parseFormattedString] Falha ao parsear: "${value}" -> "${cleanedValue}". Retornando 0.`);
      return 0;
    }
    return parsed;
  }

  // Este método agora é privado e só usado internamente para formatar para BRL se necessário,
  // mas os dados retornados pelos getters serão numéricos.
  private formatToBRL(value: number | undefined | null): string {
    if (value === null || value === undefined || isNaN(value)) {
      return 'R$ --';
    }
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Converte os valores USD para BRL numericamente
  private convertUsdToBrlNumeric(ativos: AtivoVO[], cotacaoUSD: number): AtivoVO[] {
    if (cotacaoUSD <= 0) {
      console.warn(`[convertUsdToBrlNumeric] Cotação USD inválida ou zero (${cotacaoUSD}). Retornando ativos sem conversão numérica.`);
      return ativos;
    }

    return ativos.map(ativo => {
      const ativoModificado = { ...ativo };

      if (ativoModificado.moedaFormatada === 'USD') {
        console.log(`Convertendo USD para BRL (valor NUMÉRICO) para ativo ${ativoModificado.tickerFormatado}`);

        // Garante que os valores são strings antes de parsear, pois a API pode enviá-los como strings
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

        // Recalcula lucro/prejuízo após a conversão
        ativoModificado.lucroPrejuizoFormatado = ativoModificado.valorAtualFormatado - ativoModificado.valorInvestidoFormatado;

        ativoModificado.moedaFormatada = 'BRL'; // Atualiza a moeda para BRL
      } else {
        console.log(`Ativo ${ativoModificado.tickerFormatado} não é USD (${ativoModificado.moedaFormatada}). Pulando conversão numérica.`);
        // Mesmo que não seja USD, certifique-se de que os valores sejam numéricos
        ativoModificado.valorAtualFormatado = this.parseFormattedString(ativoModificado.valorAtualFormatado?.toString());
        ativoModificado.valorInvestidoFormatado = this.parseFormattedString(ativoModificado.valorInvestidoFormatado?.toString());
        ativoModificado.precoMedioFormatado = this.parseFormattedString(ativoModificado.precoMedioFormatado?.toString());
        ativoModificado.lucroPrejuizoFormatado = this.parseFormattedString(ativoModificado.lucroPrejuizoFormatado?.toString());
      }
      // Garante que a quantidade também é numérica
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
          cotacao: this.getCotacaoUSD()
        }).pipe(
          map(({ distribuicao, cotacao }) => {
            console.log(`DashboardService: Distribuição bruta recebida:`, distribuicao);
            console.log(`DashboardService: Cotação USD recebida para distribuição: ${cotacao}`);

            const distribuicaoModificada = distribuicao.map(item => ({ ...item }));

            let totalGeralOriginal = distribuicaoModificada.reduce((sum, item) => sum + item.valorTotal, 0);
            let totalGeralAjustado = totalGeralOriginal;

            const assetsEntry = distribuicaoModificada.find(item => item.tipoAtivo === 'Assets');

            if (assetsEntry && cotacao > 0) {
              const assetsOriginalValor = assetsEntry.valorTotal;
              const assetsValorBrl = assetsOriginalValor * cotacao;
              assetsEntry.valorTotal = assetsValorBrl;
              console.log(`DashboardService: Convertendo 'Assets' total (${assetsOriginalValor} USD) para BRL (${assetsValorBrl}) usando cotação ${cotacao}`);

              totalGeralAjustado = totalGeralOriginal - assetsOriginalValor + assetsValorBrl;
              console.log(`DashboardService: Total Geral Ajustado: ${totalGeralOriginal} (Original) - ${assetsOriginalValor} (Assets Original) + ${assetsValorBrl} (Assets BRL) = ${totalGeralAjustado}`);
            } else if (assetsEntry && cotacao <= 0) {
              console.warn(`DashboardService: Cotação USD inválida (${cotacao}) para converter 'Assets' total. Mantendo valor original (${assetsEntry.valorTotal}) para 'Assets'.`);
            } else if (!assetsEntry) {
              console.log(`DashboardService: Categoria 'Assets' não encontrada na distribuição. Nenhuma conversão de distribuição aplicada.`);
            }

            const distribuicaoFinal = distribuicaoModificada.map(item => {
              const totalParaPercentual = totalGeralAjustado > 0 ? totalGeralAjustado : 0;
              item.percentual = totalParaPercentual > 0 ? (item.valorTotal / totalParaPercentual) * 100 : 0;
              item.percentual = Math.round(item.percentual);
              console.log(`Item "${item.tipoAtivo}": Valor ${item.valorTotal.toFixed(2)}, Total ${totalParaPercentual.toFixed(2)}, Percentual ${item.percentual}%`);
              return item;
            });

            console.log(`DashboardService: Distribuição final após ajustes:`, distribuicaoFinal);
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

        return this.http.get<AtivoVO[]>(acoesUrl).pipe(
          tap(acoes => console.log(`DashboardService: Ações brutas recebidas:`, acoes)),
          map(ativos => ativos.map(ativo => ({
            ...ativo,
            // Converte para número aqui, a formatação para R$ será no HTML
            valorInvestidoFormatado: this.parseFormattedString(ativo.valorInvestidoFormatado?.toString()),
            precoMedioFormatado: this.parseFormattedString(ativo.precoMedioFormatado?.toString()),
            valorAtualFormatado: this.parseFormattedString(ativo.valorAtualFormatado?.toString()),
            lucroPrejuizoFormatado: this.parseFormattedString(ativo.lucroPrejuizoFormatado?.toString()),
            quantidadeFormatada: this.parseFormattedString(ativo.quantidadeFormatada?.toString()), // Garante que a quantidade também é numérica
            category: 'acoes'
          }))),
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

        return this.http.get<AtivoVO[]>(fundosUrl).pipe(
          tap(fundos => console.log(`DashboardService: Fundos brutos recebidos:`, fundos)),
          map(ativos => ativos.map(ativo => ({
            ...ativo,
            valorInvestidoFormatado: this.parseFormattedString(ativo.valorInvestidoFormatado?.toString()),
            precoMedioFormatado: this.parseFormattedString(ativo.precoMedioFormatado?.toString()),
            valorAtualFormatado: this.parseFormattedString(ativo.valorAtualFormatado?.toString()),
            lucroPrejuizoFormatado: this.parseFormattedString(ativo.lucroPrejuizoFormatado?.toString()),
            quantidadeFormatada: this.parseFormattedString(ativo.quantidadeFormatada?.toString()),
            category: 'fundos'
          }))),
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

        return this.http.get<AtivoVO[]>(caixaUrl).pipe(
          tap(caixa => console.log(`DashboardService: Caixa bruta recebida:`, caixa)),
          map(ativos => ativos.map(ativo => ({
            ...ativo,
            valorInvestidoFormatado: this.parseFormattedString(ativo.valorInvestidoFormatado?.toString()),
            precoMedioFormatado: this.parseFormattedString(ativo.precoMedioFormatado?.toString()),
            valorAtualFormatado: this.parseFormattedString(ativo.valorAtualFormatado?.toString()),
            lucroPrejuizoFormatado: this.parseFormattedString(ativo.lucroPrejuizoFormatado?.toString()),
            quantidadeFormatada: this.parseFormattedString(ativo.quantidadeFormatada?.toString()),
            category: 'caixa'
          }))),
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

            // Converte os valores para BRL numericamente primeiro
            const assetsConvertidosNumeric = this.convertUsdToBrlNumeric(assets, cotacao);
            console.log(`DashboardService: Assets após conversão USD->BRL (numérico):`, assetsConvertidosNumeric);

            // Retorna os ativos com valores numéricos. A formatação será no HTML.
            const assetsFinal = assetsConvertidosNumeric.map(ativo => ({
              ...ativo,
              // Garante que a quantidade também é numérica
              quantidadeFormatada: this.parseFormattedString(ativo.quantidadeFormatada?.toString()),
              category: 'assets'
            }));

            return assetsFinal;
          }),
          catchError(error => {
            console.error(`DashboardService: Erro ao buscar assets para usuário ${usuarioId}:`, error);
            return of([]);
          })
        );
      })
    );
  }

  /**
   * Deleta um ativo com base na categoria e ID.
   * @param usuarioId ID do usuário logado.
   * @param ativoId ID do ativo a ser deletado.
   * @param category Categoria do ativo ('acoes', 'fundos', 'caixa', 'assets').
   * @returns Observable<void>
   */
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

  /**
   * Atualiza um ativo com base na categoria e ID.
   * @param usuarioId ID do usuário logado.
   * @param ativo Objeto AtivoVO com os dados atualizados (numéricos).
   * @param category Categoria do ativo ('acoes', 'fundos', 'caixa', 'assets').
   * @returns Observable<void>
   */
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

    // Antes de enviar, converta os valores numéricos para strings, se o backend espera strings
    // Se o backend espera números, remova o .toString()
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

  // Se você tiver um método para adicionar novas transações, ele também precisará ser ajustado
  addTransaction(userId: number | string, transactionData: any): Observable<any> {
    const category = transactionData.category;
    if (!category) {
      return throwError(() => new Error('Categoria da transação não especificada.'));
    }

    const url = `${this.apiUserPatrimonioPrefix}${userId}/${category}`;
    console.log(`DashboardService: Adicionando transação na categoria ${category} para usuário ${userId} na URL: ${url}`);

    // Converta os valores numéricos para strings antes de enviar se o backend espera strings
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

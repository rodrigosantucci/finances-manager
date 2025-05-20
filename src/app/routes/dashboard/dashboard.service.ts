import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core'; // Importe inject
import { forkJoin, Observable, of, throwError } from 'rxjs'; // Importe throwError
import { catchError, map, switchMap, take, tap } from 'rxjs/operators'; // Importe switchMap e tap, take
import { AuthService } from '@core/authentication'; // Ajuste o caminho para o seu AuthService



// Mantenha suas interfaces de DTO
export interface PatrimonioDistribuicaoVO {
  id: number;
  tipoAtivo: string;
  valorTotal: number;
  percentual: number;
}

  interface CotacaoUSD {
    idCotacao: number;
    dataCotacao: string;
    valorCotacao: number; // Esta é a propriedade que contém o valor da cotação
    fonteDado: string;
    ticker: string;
    cambio: string;
}

export interface AtivoVO {
  id: number;
  tickerFormatado: string;
  descricaoFormatada: string;
  tipoAtivoFormatado: string;
  moedaFormatada: string;
  quantidadeFormatada: string;
  valorInvestidoFormatado: string;
  precoMedioFormatado: string;
  valorAtualFormatado: string;
  lucroPrejuizoFormatado: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {

  protected readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);


  private readonly apiUserPatrimonioPrefix = '/api/patrimonios/usuario/';
  private readonly apiCotacoesPrefix = '/api/cotacoes/tickers/';

  // Remova o construtor de injeção se usar inject()
  constructor(/* private http: HttpClient, private authService: AuthService */) {}

  // Método auxiliar para obter o ID do usuário logado.
  // Agora ele apenas retorna o Observable<User> do AuthService e mapeia para o ID,
  // garantindo que o ID seja number ou string (ou null/undefined).
  private getUsuarioIdObservable(): Observable<string | number | null | undefined> {
    // authService.user() é um BehaviorSubject<User>, então .pipe(take(1)) pega o valor atual.
    return this.authService.user().pipe(
      take(1), // Pega apenas o valor atual/primeiro e completa
      map(user => user?.id) // Mapeia para a propriedade 'id' do objeto User
    );
  }




   // Método para buscar cotação do USD
  // Retorna o número da cotação ou 0 em caso de falha/lista vazia
   private getCotacaoUSD(): Observable<number> {
        // Verifique se a URL está correta para obter a cotação USD
        const url = `${this.apiCotacoesPrefix}?tickers=USDBRL`; // URL conforme seu log
        console.log(`DashboardService: Solicitando cotação USD da URL: ${url}`);

        return this.http.get<CotacaoUSD[]>(url).pipe(
            tap(response => console.log(`DashboardService: Resposta da cotação USD recebida:`, response)),
            map(responseArray => {
                // Se o array estiver vazio ou nulo, retorne 0
                if (!responseArray || responseArray.length === 0) {
                    console.warn(`DashboardService: Resposta da API de cotação veio vazia ou nula para USD. Retornando 0.`);
                    return 0; // <<-- RETORNA 0 SE VAZIO -->>
                }

                const cotacao = responseArray[0].valorCotacao;

                 // Verifica se a propriedade valorCotacao existe e é um número válido
                 if (typeof cotacao !== 'number' || isNaN(cotacao) || cotacao <= 0) {
                      console.warn(`DashboardService: A propriedade 'valorCotacao' é inválida no primeiro item da resposta. Retornando 0.`, responseArray[0]);
                      return 0; // <<-- RETORNA 0 SE VALOR INVÁLIDO -->>
                 }

                 console.log(`DashboardService: Cotação USD extraída com sucesso: ${cotacao}`);
                 return cotacao; // Retorna o valor numérico da cotação
            }),
            catchError(error => {
                 console.error(`DashboardService: Erro HTTP ao buscar cotação USD. Retornando 0.`, error);
                 return of(0); // Retorna um Observable que emite 0 e completa em caso de erro HTTP
            })
        );
    }

    // Método auxiliar para parsear string formatada para number
    // ESTE MÉTODO PRECISA SER CAPAZ DE PARSEAR OS FORMATOS EXATOS QUE SUA API RETORNA
    public parseFormattedString(value: string | undefined | null): number {
        if (value === null || value === undefined || value.trim() === '') {
            return 0;
        }
        let cleanedValue = value.trim();

        // Remove todos os caracteres que não são dígitos, ponto, vírgula ou hífen
        cleanedValue = cleanedValue.replace(/[^\d.,-]/g, '');

        // Heurística para determinar separador decimal:
        if (cleanedValue.includes(',') && cleanedValue.includes('.')) {
             if (cleanedValue.indexOf(',') > cleanedValue.indexOf('.')) { // Formato BR (ponto milhar, vírgula decimal)
                cleanedValue = cleanedValue.replace(/\./g, ''); // Remove separador de milhar (ponto)
                cleanedValue = cleanedValue.replace(/,/g, '.'); // Substitui separador decimal (vírgula) por ponto
             } else { // Formato US (vírgula milhar, ponto decimal)
                cleanedValue = cleanedValue.replace(/,/g, ''); // Remove separador de milhar (vírgula) - ponto já é decimal
             }
         } else if (cleanedValue.includes(',')) { // Apenas vírgula presente -> é o separador decimal
             cleanedValue = cleanedValue.replace(/,/g, '.');
         }

        const parsed = parseFloat(cleanedValue);

        if (isNaN(parsed)) {
             console.warn(`[DashboardService.parseFormattedString] Falha ao parsear: "${value}" -> "${cleanedValue}". Retornando 0.`);
             return 0;
        }
        return parsed;
    }

   // Método auxiliar para formatar number para string BRL (AINDA NECESSÁRIO PARA LUCRO/PREJUÍZO?)
   // Manteremos este, mas ele não será usado para formatar os valores principais *antes* de retornar.
   private formatToBRL(value: number | undefined | null): string {
       if (value === null || value === undefined || isNaN(value)) {
           return 'R$ --'; // Ou ''
       }
       return value.toLocaleString('pt-BR', {
           style: 'currency',
           currency: 'BRL',
           minimumFractionDigits: 2,
           maximumFractionDigits: 2
       });
   }


   // <<-- NOVO MÉTODO AUXILIAR: Converte USD para BRL e atribui valores NUMÉRICOS -->>
   // Este método atribui NÚMEROS aos campos *Formatado (ignorando a tipagem string da interface)
   private convertUsdToBrlNumeric(ativos: AtivoVO[], cotacaoUSD: number): AtivoVO[] {
       // Esta conversão para número só ocorre se a cotação for válida (> 0)
       if (cotacaoUSD <= 0) {
           console.warn(`[convertUsdToBrlNumeric] Cotação USD inválida ou zero (${cotacaoUSD}). Retornando ativos sem conversão numérica.`);
           return ativos; // Retorna a lista original se a cotação não for válida
       }

       return ativos.map(ativo => {
           const ativoModificado = { ...ativo };

           // Verifica se a moeda é USD (cotacaoUSD > 0 já garantido)
           if (ativoModificado.moedaFormatada === 'USD') {
               console.log(`Convertendo USD para BRL (valor NUMÉRICO) para ativo ${ativoModificado.tickerFormatado}`);

               // --- Conversão para Valor Atual (atribui NÚMERO a campo STRING) ---
               const valorAtualUSD = this.parseFormattedString(ativoModificado.valorAtualFormatado);
               if (!isNaN(valorAtualUSD)) {
                  const valorAtualBrl = valorAtualUSD * cotacaoUSD;
                  (ativoModificado.valorAtualFormatado as any) = valorAtualBrl; // <<-- ATRIBUI NÚMERO A CAMPO STRING -->>
               } else {
                  console.warn(`Não foi possível parsear valorAtualFormatado para ${ativoModificado.tickerFormatado}. Valor: ${ativoModificado.valorAtualFormatado}. Atribuindo 0.`);
                  (ativoModificado.valorAtualFormatado as any) = 0; // Atribui 0 numérico em caso de falha de parsing
               }

               // --- Conversão para Valor Investido (atribui NÚMERO a campo STRING) ---
               const valorInvestidoUSD = this.parseFormattedString(ativoModificado.valorInvestidoFormatado);
                if (!isNaN(valorInvestidoUSD)) {
                   const valorInvestidoBrl = valorInvestidoUSD * cotacaoUSD;
                   (ativoModificado.valorInvestidoFormatado as any) = valorInvestidoBrl; // <<-- ATRIBUI NÚMERO A CAMPO STRING -->>
                } else {
                  console.warn(`Não foi possível parsear valorInvestidoFormatado para ${ativoModificado.tickerFormatado}. Valor: ${ativoModificado.valorInvestidoFormatado}. Atribuindo 0.`);
                   (ativoModificado.valorInvestidoFormatado as any) = 0; // Atribui 0 numérico
                }

               // --- Conversão para Preço Médio (atribui NÚMERO a campo STRING) ---
                const precoMedioUSD = this.parseFormattedString(ativoModificado.precoMedioFormatado);
                if (!isNaN(precoMedioUSD)) {
                   const precoMedioBrl = precoMedioUSD * cotacaoUSD;
                   (ativoModificado.precoMedioFormatado as any) = precoMedioBrl; // <<-- ATRIBUI NÚMERO A CAMPO STRING -->>
                } else {
                   console.warn(`Não foi possível parsear precoMedioFormatado para ${ativoModificado.tickerFormatado}. Valor: ${ativoModificado.precoMedioFormatado}. Atribuindo 0.`);
                    (ativoModificado.precoMedioFormatado as any) = 0; // Atribui 0 numérico
                }

                // --- Recálculo Lucro/Prejuízo (atribui NÚMERO a campo STRING) ---
                // Usa os valores JÁ NUMÉRICOS atribuídos acima
                 const valorAtualBrlNum = ativoModificado.valorAtualFormatado as unknown as number; // Já deve ser o número
                 const valorInvestidoBrlNum = ativoModificado.valorInvestidoFormatado as unknown as number; // Já deve ser o número
                 const lucroPrejuizoBrlRecalculado = (!isNaN(valorAtualBrlNum) && !isNaN(valorInvestidoBrlNum)) ? valorAtualBrlNum - valorInvestidoBrlNum : 0;
                 (ativoModificado.lucroPrejuizoFormatado as any) = lucroPrejuizoBrlRecalculado; // <<-- ATRIBUI NÚMERO A CAMPO STRING -->>


               // --- Altera a moeda para BRL ---
               ativoModificado.moedaFormatada = 'BRL';
           } else {
             console.log(`Ativo ${ativoModificado.tickerFormatado} não é USD (${ativoModificado.moedaFormatada}). Pulando conversão numérica.`);
           }

           return ativoModificado;
       });
   }



   // <<-- MÉTODO getDistribuicaoPatrimonio: Aplicando Lógica de Conversão com SUPOSIÇÃO -->>
  getDistribuicaoPatrimonio(): Observable<PatrimonioDistribuicaoVO[]> {
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("ID do usuário não disponível para buscar distribuição de patrimônio.");
          return of([]); // Retorna Observable vazio se sem usuário
        }

        const distUrl = `${this.apiUserPatrimonioPrefix}${usuarioId}/distribuicao`;
        console.log(`DashboardService: Solicitando distribuição para usuário ID: ${usuarioId} da URL: ${distUrl}`);

        // Usa forkJoin para obter os dados de distribuição E a cotação do USD em paralelo
        return forkJoin({
          distribuicao: this.http.get<PatrimonioDistribuicaoVO[]>(distUrl), // Busca a distribuição
          cotacao: this.getCotacaoUSD() // Busca a cotação (retorna número ou 0)
        }).pipe(
          map(({ distribuicao, cotacao }) => {
            console.log(`DashboardService: Distribuição bruta recebida:`, distribuicao);
            console.log(`DashboardService: Cotação USD recebida para distribuição: ${cotacao}`);


            // Cria cópias dos itens para não modificar o array original recebido
            const distribuicaoModificada = distribuicao.map(item => ({ ...item }));

            let totalGeralOriginal = distribuicaoModificada.reduce((sum, item) => sum + item.valorTotal, 0);
            let totalGeralAjustado = totalGeralOriginal;

            // --- Lógica para Encontrar e Converter a Categoria 'Assets' ---
            const assetsEntry = distribuicaoModificada.find(item => item.tipoAtivo === 'Assets');

            // Realiza a conversão SOMENTE para a entrada 'Assets', SE encontrada e a cotação for válida (> 0)
            if (assetsEntry && cotacao > 0) {
                const assetsOriginalValor = assetsEntry.valorTotal; // Valor original (supostamente em USD)
                const assetsValorBrl = assetsOriginalValor * cotacao; // Converte para BRL

                assetsEntry.valorTotal = assetsValorBrl; // Atualiza o valor Total com o valor em BRL
                console.log(`DashboardService: Convertendo 'Assets' total (${assetsOriginalValor} USD) para BRL (${assetsValorBrl}) usando cotação ${cotacao}`);

                // Ajusta o total geral do patrimônio
                totalGeralAjustado = totalGeralOriginal - assetsOriginalValor + assetsValorBrl;
                console.log(`DashboardService: Total Geral Ajustado: ${totalGeralOriginal} (Original) - ${assetsOriginalValor} (Assets Original) + ${assetsValorBrl} (Assets BRL) = ${totalGeralAjustado}`);

            } else if (assetsEntry && cotacao <= 0) {
                 console.warn(`DashboardService: Cotação USD inválida (${cotacao}) para converter 'Assets' total. Mantendo valor original (${assetsEntry.valorTotal}) para 'Assets'.`);
            } else if (!assetsEntry) {
                 console.log(`DashboardService: Categoria 'Assets' não encontrada na distribuição. Nenhuma conversão de distribuição aplicada.`);
            }
            // --- Fim da Lógica de Conversão para 'Assets' ---


            // Recalcula todos os percentuais baseados no novo total geral ajustado
            const distribuicaoFinal = distribuicaoModificada.map(item => {
                // Use o total geral ajustado para o cálculo do percentual
                const totalParaPercentual = totalGeralAjustado > 0 ? totalGeralAjustado : 0; // Evita divisão por zero

                // Recalcula o percentual com base no valorTotal (que pode ter sido ajustado) e o totalGeralAjustado
                item.percentual = totalParaPercentual > 0 ? (item.valorTotal / totalParaPercentual) * 100 : 0;
                item.percentual = Math.round(item.percentual); // Arredonda o percentual para inteiro (como pedido antes)

                 console.log(`Item "${item.tipoAtivo}": Valor ${item.valorTotal.toFixed(2)}, Total ${totalParaPercentual.toFixed(2)}, Percentual ${item.percentual}%`); // Loga os valores pós-cálculo

                return item; // Retorna o item modificado
            });

            // Opcional: Adicionar um item para o Total Geral na lista
            // distribuicaoFinal.push({
            //     tipoAtivo: 'Total Geral (Estimado BRL)',
            //     valorTotal: totalGeralAjustado,
            //     percentual: distribuicaoFinal.reduce((sum, item) => sum + item.percentual, 0) // A soma pode não ser 100 exata devido ao arredondamento
            // });


            console.log(`DashboardService: Distribuição processada (conversão aplicada em 'Assets' se possível):`, distribuicaoFinal);
            return distribuicaoFinal; // Retorna a lista de distribuição processada
          }),
          // Este catchError pega erros na busca da distribuição OU falhas fatais na busca da cotação
          catchError(error => {
            console.error(`DashboardService: Erro ao buscar ou processar distribuição de patrimônio para usuário ${usuarioId}:`, error);
            // Retorna Observable vazio em caso de qualquer erro
            return of([]);
          })
        );
      })
    );
  }

  getPatrimonioAcoes(): Observable<AtivoVO[]> {
    // Aplica a mesma lógica com switchMap
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("ID do usuário não disponível para buscar patrimônio de ações.");
          return of([]);
        }
        const url = `${this.apiUserPatrimonioPrefix}${usuarioId}/acoes`;
        console.log(`DashboardService: Solicitando acoes para usuário ID: ${usuarioId} da URL: ${url}`);
        return this.http.get<AtivoVO[]>(url).pipe(
          tap(acoes => {
            console.log(`Patrimônio de acoes recebido para usuário ${usuarioId}:`, acoes);
          }),
          catchError(error => {
            console.error(`Erro ao buscar patrimônio de acoes para usuário ${usuarioId}:`, error);
            return of([]);
          })
        );
      })
    );
  }

  getPatrimonioFundos(): Observable<AtivoVO[]> {
    // Aplica a mesma lógica com switchMap
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("ID do usuário não disponível para buscar patrimônio de fundos.");
          return of([]);
        }
        const url = `${this.apiUserPatrimonioPrefix}${usuarioId}/fundos`;
        console.log(`DashboardService: Solicitando fundos para usuário ID: ${usuarioId} da URL: ${url}`);
        return this.http.get<AtivoVO[]>(url).pipe(
          tap(fundos => { // Mudado o nome da variável para 'fundos'
            console.log(`Patrimônio de fundos recebido para usuário ${usuarioId}:`, fundos);
          }),
          catchError(error => {
            console.error(`Erro ao buscar patrimônio de fundos para usuário ${usuarioId}:`, error);
            return of([]);
          })
        );
      })
    );
  }

  getPatrimonioCaixa(): Observable<AtivoVO[]> {
    // Aplica a mesma lógica com switchMap
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("ID do usuário não disponível para buscar patrimônio de caixa.");
          return of([]);
        }
        const url = `${this.apiUserPatrimonioPrefix}${usuarioId}/caixa`;
        console.log(`DashboardService: Solicitando caixa para usuário ID: ${usuarioId} da URL: ${url}`);
        return this.http.get<AtivoVO[]>(url).pipe(
          tap(caixa => { // Mudado o nome da variável para 'caixa'
            console.log(`Patrimônio de caixa recebido para usuário ${usuarioId}:`, caixa);
          }),
          catchError(error => {
            console.error(`Erro ao buscar patrimônio de caixa para usuário ${usuarioId}:`, error);
            return of([]);
          })
        );
      })
    );
  }


   getPatrimonioAssets(): Observable<AtivoVO[]> {
    // Aplica a mesma lógica com switchMap para obter o ID do usuário
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("ID do usuário não disponível para buscar patrimônio de ativos.");
          return of([]); // Retorna Observable vazio se sem usuário
        }

        const assetsUrl = `${this.apiUserPatrimonioPrefix}${usuarioId}/assets`;
        console.log(`DashboardService: Solicitando assets para usuário ID: ${usuarioId} da URL: ${assetsUrl}`);

        // Busca os ativos primeiro
        return this.http.get<AtivoVO[]>(assetsUrl).pipe(
             tap(assets => {
                 console.log(`DashboardService: Patrimônio de ativos BRUTO recebido para usuário ${usuarioId}:`, assets);
             }),
             // Catch error na busca de ativos - se falhar, retorna lista vazia
             catchError(assetError => {
                 console.error(`DashboardService: Erro ao buscar patrimônio de ativos para usuário ${usuarioId}:`, assetError);
                 return of([]); // Retorna Observable vazio se falha na busca inicial
             }),
             // Usa switchMap para buscar a cotação APÓS receber os ativos
             switchMap(ativos => {
                 // Se a busca de ativos retornou vazio, não precisamos buscar cotação
                 if (!ativos || ativos.length === 0) {
                      console.log(`DashboardService: Nenhum ativo encontrado ou erro anterior. Pulando busca de cotação e retornando lista vazia.`);
                      return of([]);
                 }

                 console.log(`DashboardService: Ativos recebidos (${ativos.length}). Tentando buscar cotação USD.`);
                 // Busca a cotação. Se falhar (API vazia/erro), o método getCotacaoUSD AGORA retorna 0.
                 return this.getCotacaoUSD().pipe(
                     // Mapeia a cotação (ou 0, se falhou) para aplicar a conversão numérica
                     map(cotacao => {
                         // <<-- CHAMA O NOVO MÉTODO QUE RETORNA NÚMEROS SE COTAÇÃO > 0 -->>
                         // A conversão numérica só ocorrerá DENTRO do auxiliar SE a cotação for > 0.
                         const assetsProcessados = this.convertUsdToBrlNumeric(ativos, cotacao);
                         console.log(`DashboardService: Patrimônio de ativos processado (valores numéricos para USD convertidos se cotação > 0) para usuário ${usuarioId}:`, assetsProcessados);
                         return assetsProcessados; // Retorna a lista processada (numérica para USD ou original)
                     }),
                      // Este catchError só pegaria erros Lançados *dentro* do map acima.
                      // Erros HTTP da cotação e resposta vazia já são tratados para retornar 0 pelo catchError/map dentro de getCotacaoUSD().
                     catchError(processingError => {
                        console.error(`DashboardService: Erro durante o processamento/map após obter cotação.`, processingError);
                         // Em caso de erro inesperado no map, retorna Observable vazio como fallback seguro.
                        return of([]);
                     })
                 );
             })
        );
      })
    );
  }

}

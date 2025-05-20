import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Transacao } from '../transacoes/transaction.service'; // Ajuste o caminho conforme necessário

// Interface AtivoVO para tipagem dos ativos
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
export class PatrimonioService {
  // Base URL para as requisições, assumindo que o baseUrlInterceptor adiciona a URL da API
  private readonly baseUrl = '/api/patrimonios/usuario/';

  constructor(private http: HttpClient) {}

  /**
   * Obtém a lista de tickers únicos associados ao usuário
   * @param usuarioId ID do usuário
   * @returns Observable com a lista de tickers únicos
   */
  getUserTickers(usuarioId: number): Observable<string[]> {
    const url = `${this.baseUrl}${usuarioId}`;
    return this.http.get<Transacao[]>(url).pipe(
      map(transacoes => {
        // Extrai tickers únicos das transações
        const tickers = new Set<string>(transacoes.map(t => t.ticker));
        return Array.from(tickers);
      }),
      catchError(this.handleError('buscar tickers'))
    );
  }

  /**
   * Edita um ativo existente para o usuário
   * @param usuarioId ID do usuário
   * @param ativo Dados do ativo a serem atualizados
   * @returns Observable com o ativo atualizado
   */
  editAtivo(usuarioId: number, ativo: AtivoVO): Observable<AtivoVO> {
    const url = `${this.baseUrl}${usuarioId}/ativos/${ativo.id}`;
    return this.http.put<AtivoVO>(url, ativo).pipe(
      catchError(this.handleError('editar ativo'))
    );
  }

  /**
   * Exclui um ativo do usuário
   * @param usuarioId ID do usuário
   * @param ativoId ID do ativo a ser excluído
   * @returns Observable<void> indicando sucesso ou falha
   */
  deleteAtivo(usuarioId: number, ativoId: number): Observable<void> {
    const url = `${this.baseUrl}${usuarioId}/ativos/${ativoId}`;
    return this.http.delete<void>(url).pipe(
      catchError(this.handleError('excluir ativo'))
    );
  }

  /**
   * Trata erros das requisições HTTP
   * @param operation Operação que gerou o erro (para contexto na mensagem)
   * @returns Função que processa o erro e retorna um Observable com a mensagem de erro
   */
  private handleError(operation: string) {
    return (error: HttpErrorResponse): Observable<never> => {
      let errorMessage = `Erro desconhecido ao ${operation}!`;
      if (error.error instanceof ErrorEvent) {
        // Erro do lado do cliente ou de rede
        errorMessage = `Erro do cliente ao ${operation}: ${error.error.message}`;
      } else {
        // Erro retornado pelo backend
        errorMessage = error.error?.message ||
          `Erro do servidor ao ${operation}: Código ${error.status}, Mensagem: ${error.message}`;
      }
      console.error(errorMessage);
      return throwError(() => new Error(errorMessage));
    };
  }
}

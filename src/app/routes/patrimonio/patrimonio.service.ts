import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Transacao } from '../transacoes/transaction.service'; // Ajuste o caminho conforme necessário

@Injectable({
  providedIn: 'root',
})
export class PatrimonioService {
  // Use um caminho relativo. O baseUrlInterceptor adicionará a URL base da API.
  // Assumindo que o endpoint para buscar transações por usuário é '/api/patrimonios/usuario/{id}'
  private readonly baseUrl = '/api/patrimonios/usuario/';

  constructor(private http: HttpClient) {}

  // Corrigida a assinatura do método para aceitar usuarioId como number
  getUserTickers(usuarioId: number): Observable<string[]> {
    // Constrói a URL completa usando o caminho base e o ID do usuário
    const url = `${this.baseUrl}${usuarioId}`;
    // A requisição GET para esta URL deve retornar uma lista de Transacoes
    return this.http.get<Transacao[]>(url).pipe(
      map(transacoes => {
        // Extrai os tickers únicos da lista de transações
        const tickers = new Set<string>(transacoes.map(t => t.ticker));
        return Array.from(tickers);
      }),
      catchError(this.handleError)
    );
  }

  // Método privado para tratamento de erros
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Erro desconhecido ao buscar tickers!';
    if (error.error instanceof ErrorEvent) {
      // Erro do lado do cliente ou de rede
      errorMessage = `Erro do cliente: ${error.error.message}`;
    } else {
      // O backend retornou um código de resposta de erro
      // Tenta obter a mensagem de erro do corpo da resposta da API
      errorMessage = error.error?.message || `Erro do servidor: Código ${error.status}, Mensagem: ${error.message}`;
    }
    console.error(errorMessage); // Loga o erro no console
    // Retorna um Observable com um erro para que o componente chamador possa tratá-lo
    return throwError(() => new Error(errorMessage));
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Transacao {
  ticker: string;
  dataTransacao: string; // YYYY-MM-DD format for LocalDate
  tipoTransacao: 'COMPRA' | 'VENDA' | 'DIVIDENDO' | 'JUROS';
  tipoAtivo: number; // 1 = AÇÃO, 2 = TÍTULO, 3 = MOEDA
  quantidade: number;
  valorTransacao: number;
  moeda: string;
  observacao?: string;
  corretora?: string;
  usuarioId?: number; // Optional, for Usuario relationship
}

@Injectable({
  providedIn: 'root',
})
export class TransacaoService {
  private readonly apiUrl = 'http://localhost:8080/api/transacoes/1/criarTransacao';

  constructor(private http: HttpClient) {}

  createTransacao(transacao: Transacao): Observable<Transacao> {
    return this.http.post<Transacao>(this.apiUrl, transacao, {
      headers: { 'Content-Type': 'application/json' },
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Erro ao criar transação';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Código: ${error.status}, Mensagem: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}

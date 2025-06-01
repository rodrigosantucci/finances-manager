import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Cotacao {
  ticker: string;
  valor: number;
  data: string;
}

@Injectable({
  providedIn: 'root',
})
export class CotacaoService {

  private readonly apiCotacoesPrefix = '/api/cotacoes/tickers/';

  constructor(private http: HttpClient) {}

  atualizarCotacoes(tickers: string[]): Observable<Cotacao[]> {
    const params = {
      tickers: tickers.join(',') // Convert array to comma-separated string

    };
    return this.http.get<Cotacao[]>(this.apiCotacoesPrefix, { params }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Erro ao atualizar cotações';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      errorMessage = error.error?.message || `Código: ${error.status}, Mensagem: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}

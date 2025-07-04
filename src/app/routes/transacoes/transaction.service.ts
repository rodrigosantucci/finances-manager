import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { AuthService } from '@core/authentication/auth.service';
import { User } from '@core';

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
  usuario?: User;
  category?: string; // Optional, for categorization
}

@Injectable({
  providedIn: 'root',
})
export class TransacaoService {
   private readonly apiUserTransacaoPrefix = '/api/transacoes/';
   private readonly authService = inject(AuthService);

  constructor(private http: HttpClient) {}


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


  createTransacao(transacao: Transacao): Observable<Transacao> {
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("ID do usuário não disponível para criar transação.");
          return throwError(() => new Error("ID do usuário não disponível para criar transação."));
        }


        transacao.usuario = { id: usuarioId } as User; // Define o ID do usuário na transação
        // Monta a URL para criar a transação
        const transacaoUrl = `${this.apiUserTransacaoPrefix}${usuarioId}/criarTransacao`;
        // Faz a requisição POST para criar a transação
        return this.http.post<Transacao>(transacaoUrl, transacao, {
          headers: { 'Content-Type': 'application/json' },
        }).pipe(
          catchError(error => this.handleError(error))
        );
      })
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

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core'; // Importe inject
import { Observable, of, throwError } from 'rxjs'; // Importe throwError
import { catchError, map, switchMap, take, tap } from 'rxjs/operators'; // Importe switchMap e tap, take
import { AuthService } from '@core/authentication'; // Ajuste o caminho para o seu AuthService

// Mantenha suas interfaces de DTO
export interface PatrimonioDistribuicaoVO {
  tipoAtivo: string;
  valorTotal: number;
  percentual: number;
}

export interface AtivoVO {
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
  // Use 'inject()' para injetar o HttpClient e o AuthService
  protected readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService); // AuthService injetado aqui

  // Use um nome mais descritivo para o prefixo da API
  // Este é o segmento da URL após a URL base (ex: http://localhost:8080).
  private readonly apiUserPatrimonioPrefix = '/api/patrimonios/usuario/';

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

  getDistribuicaoPatrimonio(): Observable<PatrimonioDistribuicaoVO[]> {
    // *** CORREÇÃO AQUI: Use switchMap para lidar com o Observable do ID do usuário ***
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => { // switchMap "espera" o Observable anterior (getUsuarioIdObservable) emitir
        // AGORA, usuarioId DENTRO DESTE BLOCO é o valor emitido (o ID do usuário ou null/undefined)
        if (usuarioId === undefined || usuarioId === null) {
          console.error("ID do usuário não disponível para buscar distribuição de patrimônio.");
          // Retorna um Observable vazio se o ID do usuário não estiver disponível
          return of([]);
        }

        // Constrói a URL corretamente AGORA QUE TEMOS O ID
        const url = `${this.apiUserPatrimonioPrefix}${usuarioId}/distribuicao`; // Ex: /api/patrimonios/usuario/123/distribuicao
        console.log(`DashboardService: Solicitando distribuição para usuário ID: ${usuarioId} da URL: ${url}`);

        // Faz a chamada HTTP e retorna o Observable dela
        return this.http.get<PatrimonioDistribuicaoVO[]>(url).pipe(
          tap(distribuicao => { // Use tap para efeitos colaterais como logs sem modificar os dados
            console.log(`Distribuição de patrimônio recebida para usuário ${usuarioId}:`, distribuicao);
          }),
          catchError(error => {
            console.error(`Erro ao buscar distribuição de patrimônio para usuário ${usuarioId}:`, error);
            // Decide como tratar o erro - retornar of([]) esconde o erro do subscriber
            return of([]); // Retorna um observable vazio (Array vazio) em caso de erro
              // Ou use throwError(() => new Error(...)) para propagar o erro
          })
        );
      }) // Fim do switchMap
    ); // Fim do pipe
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
    // Aplica a mesma lógica com switchMap
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("ID do usuário não disponível para buscar patrimônio de ativos.");
          return of([]);
        }
        const url = `${this.apiUserPatrimonioPrefix}${usuarioId}/assets`;
        console.log(`DashboardService: Solicitando assets para usuário ID: ${usuarioId} da URL: ${url}`);
        return this.http.get<AtivoVO[]>(url).pipe(
          tap(assets => { // Mudado o nome da variável para 'assets'
            console.log(`Patrimônio de ativos recebido para usuário ${usuarioId}:`, assets);
          }),
          catchError(error => {
            console.error(`Erro ao buscar patrimônio de ativos para usuário ${usuarioId}:`, error);
            return of([]);
          })
        );
      })
    );
  }


  // Removido o método handleError privado individual e a lógica foi movida para o catchError em cada método.
   // Se preferir um handler centralizado, ajuste-o para ser uma função que retorna a função tratadora.
   // Exemplo de handler centralizado que retorna a função:
   /*
   private handleError(context: string, userId: number | string) {
       return (error: HttpErrorResponse): Observable<never> => {
           // ... lógica de log e erro ...
           console.error(`DashboardService - Erro ao buscar ${context} para usuário ${userId}:`, error);
           // Retorna Observable de erro ou vazio dependendo da necessidade
           return throwError(() => new Error(...)); // ou return of([]);
       };
   }
   */
   // E usaria nos pipes: catchError(this.handleError('distribuição', usuarioId))

   // Mantenha a lógica de log dentro do catchError em cada pipe por enquanto para maior clareza.

}

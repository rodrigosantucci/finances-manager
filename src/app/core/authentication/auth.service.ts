import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, iif, map, merge, Observable, of, share, switchMap, take, tap } from 'rxjs';
import { filterObject, isEmptyObject } from './helpers';
// Assumindo 'interface' contém AuthResponse { token: string, user?: User }, Token { access_token: string, ... }, e User { id?: string | number, ... }
import {  Token, User } from './interface'; // Certifique-se de que este caminho está correto
import { LoginService } from './login.service'; // Certifique-se de que este caminho está correto
import { TokenService } from './token.service'; // Certifique-se de que este caminho está correto

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly loginService = inject(LoginService);
  private readonly tokenService = inject(TokenService);

  // BehaviorSubject para armazenar o estado do usuário.
   // Inicializamos com um objeto vazio, mas a lógica de carga do storage
   // no construtor irá popular se houver dados salvos.
  private user$ = new BehaviorSubject<User>({}); // Mantido o tipo e inicialização originais

   // Chave para armazenar os dados do usuário no localStorage
  private readonly USER_STORAGE_KEY = 'currentUserData';


  // Observable que lida com as mudanças de token e refresh, e atribui o usuário
  private change$ = merge(
    this.tokenService.change(), // Observa mudanças no token (set, clear)
    this.tokenService.refresh().pipe(switchMap(() => this.refresh())) // Observa eventos de refresh e tenta refrescar
  ).pipe(
    switchMap(() => this.assignUser()), // Quando o token muda ou é refrescado, tenta atribuir o usuário
    share() // Compartilha a execução deste Observable entre múltiplos subscribers
  );


  constructor() {
     // *** AJUSTE: Tenta carregar os dados do usuário do localStorage ao inicializar o serviço ***
    this.loadUserDataFromStorage();

     // Subscreve ao pipeline 'change$' para que ele comece a reagir a mudanças de token
     // (incluindo o token que pode ter sido carregado do storage pelo TokenService)
     // e acione o assignUser() na inicialização.
     this.change$.subscribe();
  }

  // Método de inicialização (pode ser chamado no APP_INITIALIZER)
   // Agora, este método apenas garante que o pipeline 'change$' seja ativado e resolva a Promise.
  init() {
    return new Promise<void>(resolve => {
        // O subscribe no construtor já ativa o pipeline.
        // Podemos adicionar um take(1) aqui se quisermos que o init() resolva após a primeira verificação de status.
        this.change$.pipe(take(1)).subscribe(() => resolve());
    });
  }

  // Retorna o Observable que emite quando o estado de autenticação/usuário muda (agora baseado no user$)
  change(): Observable<User> { // Mantido o tipo de retorno original
    return this.user$.asObservable();
  }

  // Verifica se o token é válido (usuário autenticado)
  check() {
    return this.tokenService.valid(); // Assume que TokenService.valid() verifica o token no localStorage
  }

  // Realiza o login
  login(username: string, password: string, rememberMe = false) {
    // Chama o loginService que DEVE retornar AuthResponse { token: string, user?: User }
    return this.loginService.login(username, password, rememberMe).pipe(
      tap(response => {
        // Salva o token usando o TokenService (assume que TokenService salva no localStorage)
        this.tokenService.set({ access_token: response.token } as Token); // Assumindo que TokenService espera este formato

        // *** AJUSTE: Salva os dados do usuário recebidos na resposta e atualiza o BehaviorSubject ***
        if (response.user) {
            this.saveUserData(response.user); // Salva no localStorage
            this.user$.next(response.user); // Atualiza o BehaviorSubject
        } else {
             // Se a API de login não retorna o usuário, limpamos/mantemos vazio
            this.clearUserData(); // Limpa do localStorage
            this.user$.next({}); // Atualiza o BehaviorSubject com objeto vazio
             console.warn('AuthService: Login bem-sucedido, mas dados do usuário não retornados pela API.');
        }
         console.log('AuthService: Login bem-sucedido. Token e dados do usuário (se retornados) salvos.');
      }),
      // Mapeia para o status de autenticação após o tap
      map(() => this.check())
    );
  }

  // Tenta refrescar o token
  refresh() {
    return this.loginService
      .refresh(filterObject({ refresh_token: this.tokenService.getRefreshToken() })) // Chama o serviço de login para refresh
      .pipe(
        catchError(() => {
            console.error('AuthService: Falha ao refrescar token.');
            this.logout().subscribe(); // Força logout em caso de falha no refresh (subscreve para executar o tap do logout)
            return of(undefined); // Emite undefined para completar o pipeline
        }),
        tap(token => {
            if (token) {
               this.tokenService.set(token as Token); // Salva o novo token (assume que TokenService salva no localStorage)
               console.log('AuthService: Token refrescado e salvo.');
               // Nota: O refresh da API geralmente NÃO retorna dados do usuário.
               // A lógica em assignUser() (chamada pelo pipeline change$)
               // tentará carregar o usuário do storage ou decidirá que não há usuário.
               // Não salvamos dados do usuário aqui, pois eles vêm do login inicial.
            } else {
                // catchError já lidou com a falha e chamou logout
            }
        }),
        map(() => this.check()) // Retorna o status de autenticação após o refresh (ou falha)
      );
  }

  // Realiza o logout
  logout() {
    // Chama o endpoint de logout no backend (opcional, dependendo da sua API)
    return this.loginService.logout().pipe(
      tap(() => {
          this.tokenService.clear(); // Limpa o token (localStorage)
          this.clearUserData(); // Limpa os dados do usuário (localStorage)
          this.user$.next({}); // Limpa o BehaviorSubject com objeto vazio
          console.log('AuthService: Logout realizado. Token e dados do usuário limpos.');
          // Opcional: Redirecionar para a página de login aqui ou no componente que chama logout
          // this.router.navigate(['/auth/login']); // Se você injetar o Router
      }),
      map(() => !this.check()), // Retorna true se o logout foi bem-sucedido (não está mais autenticado)
       catchError(error => {
           console.error('AuthService: Erro durante o logout (no backend). Limpando localmente.', error);
           // Limpa localmente mesmo se o endpoint de logout falhar
           this.tokenService.clear();
           this.clearUserData();
           this.user$.next({});
           // Decida se quer relançar o erro ou retornar um Observable de sucesso/false
           return of(false); // Retorna false para indicar falha no logout do backend, mas sucesso local
           // return throwError(() => error); // Relança o erro
       })
    );
  }

  // Retorna o Observable do usuário logado
  user(): BehaviorSubject<User> { // Mantido o tipo de retorno original
    return this.user$;
  }

   // Retorna o valor atual do usuário logado (útil para acesso síncrono)
   getCurrentUserValue(): User { // Mantido o tipo de retorno original
       return this.user$.getValue();
   }


  // Retorna o menu do usuário (chama o serviço de login apenas se autenticado)
  menu() {
    // Usa this.check() que verifica a validade do token (que está no localStorage)
    return iif(() => this.check(), this.loginService.menu(), of([]));
  }

   // --- NOVOS MÉTODOS PARA PERSISTÊNCIA DE DADOS DO USUÁRIO ---

   // Salva os dados do usuário no localStorage
   private saveUserData(user: User): void {
       try {
           localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
           console.log('AuthService: Dados do usuário salvos no localStorage.');
       } catch (e) {
           console.error('AuthService: Erro ao salvar dados do usuário no localStorage', e);
       }
   }

   // Carrega os dados do usuário do localStorage
   private loadUserDataFromStorage(): void {
       try {
           const userString = localStorage.getItem(this.USER_STORAGE_KEY);
           if (userString) {
               const user: User = JSON.parse(userString);
               // Opcional: Adicionar validação básica na estrutura do objeto User aqui
               // Ex: if (user && typeof user === 'object' && user.id !== undefined && user.id !== null) { ... }
               // Usa isEmptyObject para verificar se o objeto não é apenas {}
               if (!isEmptyObject(user as any)) { // Exemplo de validação básica
                  this.user$.next(user); // Popula o BehaviorSubject com os dados carregados
                  console.log('AuthService: Dados do usuário carregados do localStorage.');
               } else {
                   console.warn('AuthService: Dados do usuário no localStorage inválidos ou incompletos.');
                   this.clearUserData(); // Limpa dados inválidos do storage
               }
           } else {
               console.log('AuthService: Nenhum dado de usuário encontrado no localStorage.');
           }
       } catch (e) {
           console.error('AuthService: Erro ao carregar dados do usuário do localStorage', e);
           this.clearUserData(); // Limpa dados corrompidos do storage
       }
       // Garante que o user$ tenha um valor inicial ({} se nada foi carregado)
       if (isEmptyObject(this.user$.getValue() as any)) {
            this.user$.next({});
       }
   }

   // Limpa os dados do usuário do localStorage
   private clearUserData(): void {
       localStorage.removeItem(this.USER_STORAGE_KEY);
       console.log('AuthService: Dados do usuário removidos do localStorage.');
   }

   // --- MÉTODO assignUser AJUSTADO ---
   // Este método é chamado pelo pipeline 'change$'
   private assignUser(): Observable<User> { // Mantido o tipo de retorno original
       console.log('AuthService: assignUser() called. Checking authentication status...');

       // Verifica se o token é válido (TokenService.valid() verifica localStorage)
       if (this.check()) {
           console.log('AuthService: Token válido encontrado.');
           // Se o token é válido, verifica se o userSubject já está populado
           if (!isEmptyObject(this.user$.getValue() as any)) {
               console.log('AuthService: Token válido e userSubject já populado.');
               // Se já populado (provavelmente carregado do storage na inicialização ou por login), apenas emite o valor atual
               return of(this.user$.getValue());
           } else {
                console.log('AuthService: Token válido, mas userSubject vazio. Tentando carregar do storage...');
                // Tenta carregar do storage. loadUserDataFromStorage() irá chamar user$.next() se encontrar dados válidos.
                this.loadUserDataFromStorage();

                // Após tentar carregar do storage, verifica novamente se o userSubject foi populado.
                if (!isEmptyObject(this.user$.getValue() as any)) {
                    console.log('AuthService: Dados do usuário carregados do storage pelo assignUser.');
                    return of(this.user$.getValue()); // Emite o usuário carregado
                } else {
                    console.warn('AuthService: Token válido, mas dados do usuário ausentes no storage e userSubject vazio. Buscando da API...');
                    // *** AQUI VOCÊ PRECISARIA BUSCAR OS DADOS DO USUÁRIO DA API ***
                    // Se a API de login NÃO retorna o usuário, e ele não está no storage,
                    // você precisa de uma chamada API separada para obter os dados do usuário logado.
                    // Você precisaria do ID do usuário (talvez decodificando o token) ou de um endpoint genérico /api/user.

                    // Exemplo CONCEITUAL (assumindo que loginService.user() existe e pode buscar o usuário logado sem ID explícito se o token estiver presente)
                    // return this.loginService.user().pipe( // Assumindo um método user() que busca o usuário logado
                    //     tap(user => {
                    //         this.saveUserData(user); // Salva no storage
                    //         this.user$.next(user); // Popula userSubject
                    //         console.log('AuthService: Dados do usuário buscados da API e salvos.');
                    //     }),
                    //     catchError(err => {
                    //         console.error('AuthService: Falha ao buscar dados do usuário da API.', err);
                    //         this.logout().subscribe(); // Força logout se não conseguir obter dados do usuário
                    //         return of({}); // Emite objeto vazio em caso de erro
                    //     })
                    // );

                    // Se você não tem uma forma de buscar o usuário da API neste ponto,
                    // o userSubject permanecerá com o valor atual (que ainda é {}).
                    console.error('AuthService: Não foi possível obter dados do usuário. Implementar busca da API ou garantir que a API de login retorne os dados.');
                    // Não limpamos o token ou dados locais aqui automaticamente, pois o token é válido.
                    // A decisão de limpar dependeria da estratégia de busca da API.
                    return of(this.user$.getValue()); // Emite o valor atual (ainda {})
                }
           }
       } else {
           // Token NÃO é válido
           console.log('AuthService: Token inválido ou ausente. Limpando dados do usuário.');
           this.clearUserData(); // Limpa dados do localStorage
           this.tokenService.clear(); // Garante que o token também seja limpo
           this.user$.next({}); // Limpa o BehaviorSubject com objeto vazio
           return of({}); // Emite objeto vazio
       }
   }

    // Removido o método assignUser() original, pois a lógica foi movida para o método ajustado acima.
}

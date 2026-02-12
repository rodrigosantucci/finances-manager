import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, distinctUntilChanged, iif, map, merge, Observable, of, share, switchMap, take, tap } from 'rxjs';
import { filterObject, isEmptyObject } from './helpers';
import { Token, User } from './interface'; // Certifique-se de que este caminho está correto
import { LoginService } from './login.service'; // Certifique-se de que este caminho está correto
import { TokenService } from './token.service'; // Certifique-se de que este caminho está correto
import { LocalStorageService, SessionStorageService } from '@shared';


// Importe a interface Menu do seu MenuService para garantir a tipagem correta
// Ajuste o caminho conforme a localização do seu MenuService
import { Menu } from '../bootstrap/menu.service'; // Exemplo de caminho

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly loginService = inject(LoginService);
  private readonly tokenService = inject(TokenService);
  private readonly localStorage = inject(LocalStorageService);
  private readonly sessionStorage = inject(SessionStorageService);
  private user$ = new BehaviorSubject<User>({});

  private readonly USER_STORAGE_KEY = 'currentUserData';

  private change$ = merge(
    this.tokenService.change().pipe(distinctUntilChanged()),
    this.tokenService.refresh().pipe(switchMap(() => this.refresh()))
  ).pipe(
    switchMap(() => this.assignUser()),
    share()
  );

  constructor() {
    this.loadUserDataFromStorage();
    this.change$.subscribe();
  }

  init() {
    return new Promise<void>(resolve => {
      this.change$.pipe(take(1)).subscribe(() => resolve());
    });
  }

  change(): Observable<User> {
    return this.user$.asObservable();
  }

  check() {
    return this.tokenService.valid();
  }

  login(username: string, password: string, rememberMe = false) {
    return this.loginService.login(username, password, rememberMe).pipe(
      tap(response => {
        this.tokenService.set({ access_token: response.token } as Token, rememberMe);

        if (response.user) {
          if (response.user.id && typeof response.user.id === 'number') {
            this.saveUserData(response.user, rememberMe);
            this.user$.next(response.user);
          } else {
            console.warn('AuthService: Login bem-sucedido, mas o ID do usuário retornado pela API é inválido ou não numérico.', response.user);
            this.clearUserData();
            this.user$.next({});
          }
        } else {
          this.clearUserData();
          this.user$.next({});
          console.warn('AuthService: Login bem-sucedido, mas dados do usuário não retornados pela API.');
        }
      }),
      map(() => this.check())
    );
  }

  refresh() {
    return this.loginService
      .refresh(filterObject({ refresh_token: this.tokenService.getRefreshToken() }))
      .pipe(
        catchError(() => {
          console.error('AuthService: Falha ao refrescar token.');
          this.logout().subscribe();
          return of(undefined);
        }),
        tap(token => {
          if (token) {
            this.tokenService.set(token as Token);
        //    console.log('AuthService: Token refrescado e salvo.');
          }
        }),
        map(() => this.check())
      );
  }

  logout() {
    return this.loginService.logout().pipe(
      tap(() => {
        this.tokenService.clear();
        this.clearUserData();
        this.user$.next({});
      }),
      map(() => !this.check()),
      catchError(error => {
        console.error('AuthService: Erro durante o logout (no backend). Limpando localmente.', error);
        this.tokenService.clear();
        this.clearUserData();
        this.user$.next({});
        return of(false);
      })
    );
  }

  user(): BehaviorSubject<User> {
    return this.user$;
  }

  getCurrentUserValue(): User {
    return this.user$.getValue();
  }

  /**
   * AJUSTE CRÍTICO AQUI:
   * Este método agora retorna o array COMPLETO de itens de menu.
   * Anteriormente, ele provavelmente estava a retornar apenas um subconjunto (ex: apenas Dashboard).
   * Se os seus itens de menu vêm de uma API, você precisaria ajustar 'loginService.menu()'
   * para retornar o menu completo ou buscar os dados de menu de outra fonte aqui.
   * Para fins de demonstração, estou a retornar um array fixo com Dashboard e Media.
   */
  menu(): Observable<Menu[]> {
    // Se o seu loginService.menu() já retorna o menu completo,
    // então a lógica 'iif' original pode ser mantida, mas a questão é o que ele retorna.
    // Para garantir que o menu completo seja exibido, vamos simular o retorno aqui.

    const fullMenu: Menu[] = [
      {
        route: 'dashboard',
        name: 'Dashboard',
        translationKey: 'menu.Dashboard',
        type: 'link',
        icon: 'dashboard',
        permissions: {}, // Mantenha para consistência com MenuService
      },
      {
        route: 'assets/stats',
        name: 'Dados de Ativos',
        translationKey: 'menu.Estatisticas',
        type: 'link',
        icon: 'assessment',
        permissions: {}, // Importante manter
      },
      {
        route: 'ia/assistant',
        name: 'Assistente IA',
        translationKey: 'menu.AssistenteIA',
        type: 'link',
        icon: 'adb',
        permissions: {}, // Importante manter
      },
      {
        route: 'utilities/ferramentas',
        name: 'Ferramentas',
        translationKey: 'menu.Utilidades',
        type: 'link',
        icon: 'build',
        permissions: {}, // Importante manter
      },
      {
        route: 'historico/dados',
        name: 'Histórico',
        translationKey: 'menu.Historico',
        type: 'link',
        icon: 'calendar_today',
        permissions: {}, // Importante manter
      },
    ];

//    console.log('AuthService.menu() está a retornar:', fullMenu); // Log para depuração
    return of(fullMenu); // Retorna um Observable com o menu completo
  }

  private saveUserData(user: User, rememberMe = true): void {
    try {
      if (rememberMe) {
        this.localStorage.set(this.USER_STORAGE_KEY, user);
        this.sessionStorage.remove(this.USER_STORAGE_KEY);
      } else {
        this.sessionStorage.set(this.USER_STORAGE_KEY, user);
        this.localStorage.remove(this.USER_STORAGE_KEY);
      }
    } catch (e) {
      console.error('AuthService: Erro ao guardar dados do utilizador', e);
    }
  }

  private loadUserDataFromStorage(): void {
    try {
      let user = this.localStorage.get(this.USER_STORAGE_KEY);
      if (isEmptyObject(user)) {
        user = this.sessionStorage.get(this.USER_STORAGE_KEY);
      }

      if (user && !isEmptyObject(user as any)) {
        this.user$.next(user);
      } else {
        console.warn('AuthService: Dados do utilizador no localStorage inválidos ou incompletos.');
        this.clearUserData();
      }
    } catch (e) {
      console.error('AuthService: Erro ao carregar dados do utilizador', e);
      this.clearUserData();
    }
    if (isEmptyObject(this.user$.getValue() as any)) {
      this.user$.next({});
    }
  }

  private clearUserData(): void {
    this.localStorage.remove(this.USER_STORAGE_KEY);
    this.sessionStorage.remove(this.USER_STORAGE_KEY);
  }

  private assignUser(): Observable<User> {
    if (this.check()) {
      if (!isEmptyObject(this.user$.getValue() as any)) {
        return of(this.user$.getValue());
      } else {
        this.loadUserDataFromStorage();
        if (!isEmptyObject(this.user$.getValue() as any)) {
          return of(this.user$.getValue());
        } else {
          console.error('AuthService: Não foi possível obter dados do utilizador. Implementar busca da API ou garantir que a API de login retorne os dados.');
          const userId = this.tokenService.getUserId();
          if (userId) {
            return this.loginService.user(userId).pipe(
              tap(user => {
                if (user && !isEmptyObject(user as any)) {
                  this.saveUserData(user);
                  this.user$.next(user);
                } else {
                  console.warn('AuthService: Dados do utilizador da API inválidos ou incompletos.');
                  this.clearUserData();
                  this.user$.next({});
                }
              }),
              catchError(error => {
                console.error('AuthService: Erro ao buscar dados do utilizador da API:', error);
                this.clearUserData();
                this.user$.next({});
                return of({});
              })
            );
          }
          return of(this.user$.getValue());
        }
      }
    } else {
      this.clearUserData();
      // this.tokenService.clear(); // Evita loop infinito se check() já retornou false
      this.user$.next({});
      return of({});
    }
  }
}

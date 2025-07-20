import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, iif, map, merge, Observable, of, share, switchMap, take, tap } from 'rxjs';
import { filterObject, isEmptyObject } from './helpers';
import { Token, User } from './interface'; // Certifique-se de que este caminho está correto
import { LoginService } from './login.service'; // Certifique-se de que este caminho está correto
import { TokenService } from './token.service'; // Certifique-se de que este caminho está correto

// Importe a interface Menu do seu MenuService para garantir a tipagem correta
// Ajuste o caminho conforme a localização do seu MenuService
import { Menu } from '../bootstrap/menu.service'; // Exemplo de caminho

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly loginService = inject(LoginService);
  private readonly tokenService = inject(TokenService);

  private user$ = new BehaviorSubject<User>({});

  private readonly USER_STORAGE_KEY = 'currentUserData';

  private change$ = merge(
    this.tokenService.change(),
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
        this.tokenService.set({ access_token: response.token } as Token);

        if (response.user) {
          this.saveUserData(response.user);
          this.user$.next(response.user);
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
        badge: {
          color: 'red-50',
          value: '1',
        },
        permissions: {}, // Mantenha para consistência com MenuService
      },
      {
        route: 'media/gallery',
        name: 'Estatísticas',
        translationKey: 'menu.Estatisticas',
        type: 'link',
        icon: 'assessment',
        permissions: {}, // Importante manter
      },
    ];

//    console.log('AuthService.menu() está a retornar:', fullMenu); // Log para depuração
    return of(fullMenu); // Retorna um Observable com o menu completo
  }

  private saveUserData(user: User): void {
    try {
      localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('AuthService: Erro ao guardar dados do utilizador no localStorage', e);
    }
  }

  private loadUserDataFromStorage(): void {
    try {
      const userString = localStorage.getItem(this.USER_STORAGE_KEY);
      if (userString) {
        const user: User = JSON.parse(userString);
        if (!isEmptyObject(user as any)) {
          this.user$.next(user);
        } else {
          console.warn('AuthService: Dados do utilizador no localStorage inválidos ou incompletos.');
          this.clearUserData();
        }
      }
    } catch (e) {
      console.error('AuthService: Erro ao carregar dados do utilizador do localStorage', e);
      this.clearUserData();
    }
    if (isEmptyObject(this.user$.getValue() as any)) {
      this.user$.next({});
    }
  }

  private clearUserData(): void {
    localStorage.removeItem(this.USER_STORAGE_KEY);
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
          return of(this.user$.getValue());
        }
      }
    } else {
      this.clearUserData();
      this.tokenService.clear();
      this.user$.next({});
      return of({});
    }
  }
}

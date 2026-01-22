import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Menu } from '@core/bootstrap/menu.service'; // Ajuste o caminho conforme necessário
import { User } from './interface'; // Ajuste o caminho conforme necessário

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  protected readonly http = inject(HttpClient);

  // Mantém o caminho relativo. O baseUrlInterceptor adicionará a URL base da API.
  // Verifique se este é o endpoint correto para login na sua API de produção.

  login(username: string, password: string, rememberMe = false): Observable<User> {
    return this.http.post<User>('/api/auth/login', { username, password});
  }

  // Mantém o caminho relativo. O baseUrlInterceptor adicionará a URL base da API.
  // Verifique se este é o endpoint correto para refresh na sua API de produção.
  refresh(params: Record<string, any>): Observable<User> {
    return this.http.post<User>('/api/auth/refresh', params);
  }

  // Mantém o caminho relativo. O baseUrlInterceptor adicionará a URL base da API.
  // Verifique se este é o endpoint correto para logout na sua API de produção.
  logout(): Observable<any> {
    return this.http.post<any>('/api/auth/logout', {});
  }


  // Mantém o caminho relativo. O baseUrlInterceptor adicionará a URL base da API.
  user(id:number): Observable<User> {
    return this.http.get<User>('/api/usuarios/'+ id).pipe(
      map((res: User) => res)
    );
  }

  // Mantém o caminho relativo. O baseUrlInterceptor adicionará a URL base da API.
  // AJUSTE PARA O ENDPOINT REAL QUE RETORNA O MENU NA SUA API DE PRODUÇÃO, SE EXISTIR.
  // Se não, continue usando o mock ou remova o método se não for necessário.
  menu(): Observable<Menu[]> {
    // Mock menu data to avoid HTTP request
    const mockMenu: Menu[] = [
      {
        route: 'dashboard',
        name: 'Dashboard',
        type: 'link',
        icon: 'dashboard',
        badge: { color: 'red-50', value: '1' },
      },
    ];
    return of(mockMenu);


  }
}

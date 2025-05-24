// src/app/modules/settings/settings.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, take, map, tap } from 'rxjs/operators';
import { AuthService } from '@core/authentication/auth.service';
import { User } from '@core/authentication/interface';

// Ajuste a interface para refletir o que o backend retorna para o avatar
// Se o backend retorna o 'id' do usuário para ser usado na URL do avatar:
export interface IProfileReduced {
  username: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  estrategia: string;
  perfil: string;
  // O backend pode retornar o ID do usuário como o "identificador" do avatar
  // ou um nome de arquivo específico, ou a URL COMPLETA se já for resolvida.
  // Vamos assumir que ele retorna o 'id' do próprio usuário para o avatar.
  avatarIdentifier?: number; // <<-- AJUSTE AQUI SE SEU BACKEND RETORNA OUTRO TIPO
  id?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  protected readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly apiUsuariosPrefix = '/api/usuarios/';
  private readonly apiAvatarsPrefix = '/api/avatars/';

  constructor() {}

  private getUsuarioIdObservable(): Observable<number | null | undefined> {
    return this.authService.user().pipe(
      take(1),
      map(user => user?.id)
    );
  }

  getProfile(): Observable<IProfileReduced | null> {
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("SettingsService: ID do usuário não disponível para buscar perfil.");
          return of(null);
        }
        const url = `${this.apiUsuariosPrefix}${usuarioId}`;
        console.log(`SettingsService: Solicitando perfil para usuário ID: ${usuarioId} da URL: ${url}`);
        return this.http.get<IProfileReduced>(url).pipe(
          tap(data => console.log(`SettingsService: Perfil recebido para usuário ${usuarioId}:`, data)),
          catchError((error: HttpErrorResponse) => {
            console.error(`SettingsService: Erro ao buscar perfil para usuário ${usuarioId}:`, error);
            return of(null);
          })
        );
      })
    );
  }

  // Ao atualizar o perfil, o backend precisa de um modo de saber qual imagem associar
  // O FormData já contém 'avatar', e o backend usará o ID do usuário da URL.
  updateProfile(formData: FormData): Observable<IProfileReduced | null> {
    return this.getUsuarioIdObservable().pipe(
      switchMap(usuarioId => {
        if (usuarioId === undefined || usuarioId === null) {
          console.error("SettingsService: ID do usuário não disponível para atualizar perfil.");
          return of(null);
        }

        const url = `${this.apiUsuariosPrefix}${usuarioId}`; // Ou um endpoint específico para upload de avatar
        console.log(`SettingsService: Enviando atualização de perfil para usuário ID: ${usuarioId} da URL: ${url}`);

        // O backend espera o FormData contendo 'avatar' (o arquivo de imagem)
        return this.http.put<IProfileReduced>(url, formData).pipe(
          tap(response => console.log(`SettingsService: Perfil atualizado com sucesso para usuário ${usuarioId}:`, response)),
          catchError((error: HttpErrorResponse) => {
            console.error(`SettingsService: Erro ao atualizar perfil para usuário ${usuarioId}:`, error);
            return of(null);
          })
        );
      })
    );
  }

  // Helper para construir a URL COMPLETA do avatar, apontando para o endpoint do backend
  // Assumimos que 'avatarIdentifier' é o ID do usuário.
  // Se o backend retorna uma URL absoluta (ex: de um CDN), esta função não é necessária
  // ou simplesmente retorna a URL já absoluta.
  getFullAvatarUrl(avatarIdentifier: number | undefined | null): string {
    if (avatarIdentifier === undefined || avatarIdentifier === null) {
      return ''; // Retorna string vazia ou um placeholder padrão. O componente usará o default.
    }

    return `${this.apiAvatarsPrefix}${avatarIdentifier}`;
  }
}

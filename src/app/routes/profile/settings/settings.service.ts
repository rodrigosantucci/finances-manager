import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { catchError, switchMap, take, map, tap } from 'rxjs/operators';
import { AuthService } from '@core/authentication/auth.service';
import { User } from '@core/authentication/interface';
import { LocalStorageService } from '@shared';

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
  provider?: AIProvider;
  geminiApiKey?: string;
  openaiApiKey?: string;
  aiBackendEndpoint?: string;
}

export type AIProvider = 'gemini' | 'openai';

export interface AIAccessSettings {
  provider?: AIProvider | null;
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  aiBackendEndpoint?: string | null;
  activeOpenAI?: boolean | null;
  activeGemini?: boolean | null;
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  protected readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly storage = inject(LocalStorageService);

  private readonly apiUsuariosPrefix = '/api/usuarios/';
  private readonly apiAvatarsPrefix = '/api/avatars/';

  public aiSettingsUpdated = new Subject<void>();

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
          console.error('SettingsService: ID do usuário não disponível para buscar perfil.');
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
          console.error('SettingsService: ID do usuário não disponível para atualizar perfil.');
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

  getAISettings(userId: number): Observable<AIAccessSettings> {
    const url = `${this.apiUsuariosPrefix}${userId}/llm/keys/validate`;
    return this.http.get<{ openaiValid: boolean; geminiValid: boolean; openaiMessage: string; geminiMessage: string }>(url).pipe(
      map(res => ({
        activeOpenAI: res.openaiValid,
        activeGemini: res.geminiValid,
        openaiApiKey: null, // The validation endpoint does not return the keys
        geminiApiKey: null, // The validation endpoint does not return the keys
        provider: null,
        aiBackendEndpoint: null,
      })),
      catchError(error => {
        console.error('SettingsService: Erro ao validar chaves de IA:', error);
        return of({
          activeOpenAI: false,
          activeGemini: false,
          openaiApiKey: null,
          geminiApiKey: null,
          provider: null,
          aiBackendEndpoint: null,
        });
      })
    );
  }

  updateAISettings(settings: AIAccessSettings): boolean {
    this.storage.set('ai.provider', settings.provider ?? null);
    this.storage.set('ai.key.gemini', settings.geminiApiKey ?? null);
    this.storage.set('ai.key.openai', settings.openaiApiKey ?? null);
    this.storage.set('ai.backendEndpoint', settings.aiBackendEndpoint ?? null);
    this.storage.set('ai.active.openai', settings.activeOpenAI ?? null);
    this.storage.set('ai.active.gemini', settings.activeGemini ?? null);
    this.aiSettingsUpdated.next(); // Emitir evento após a atualização
    return true;
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

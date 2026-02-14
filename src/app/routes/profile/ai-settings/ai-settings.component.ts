import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule } from '@ngx-translate/core';
import { SettingsService, AIProvider, AIAccessSettings } from '../settings/settings.service';
import { AuthService, User } from '@core/authentication';
import { MtxAlertModule } from '@ng-matero/extensions/alert';
import { MtxLoaderModule } from '@ng-matero/extensions/loader';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { LocalStorageService } from '@shared';
import { of } from 'rxjs';
import { distinctUntilChanged, catchError, switchMap, tap } from 'rxjs/operators';
import { ControlsOf } from '@shared/interfaces';

@Component({
  selector: 'app-ai-settings',
  templateUrl: './ai-settings.component.html',
  styleUrl: './ai-settings.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    TranslateModule,
    MtxAlertModule,
    MtxLoaderModule,
    MtxSelectModule,
  ],
  providers: [SettingsService],
})
export class AiSettingsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(LocalStorageService);

  aiForm!: FormGroup;
  userId: number | null = null;
  llmKeys: { gemini?: boolean; openai?: boolean } = {};
  hasValidGemini = false;
  hasValidOpenAI = false;
  isLoginLoading = false;
  formSubmitted = false;
  showGeminiKey = false;
  showOpenAIKey = false;
  private messageHandler = (event: MessageEvent) => this.onPopupMessage(event);
  private oauthPopup: Window | null = null;

  ngOnInit(): void {
    this.auth
      .user()
      .pipe(
        distinctUntilChanged((prev, curr) => prev.id === curr.id),
        tap((user: User) => {
          this.userId = user.id || null;
          if (this.userId) {
            this.checkAIKeysValidity();
          }
        }),
        switchMap((user: User) => {
          if (user.id) {
            return this.settingsService.getAISettings(user.id);
          }
          return of({} as AIAccessSettings);
        }),
        tap((settings: AIAccessSettings) => {
          this.aiForm.patchValue({
            openaiApiKey: settings.openaiApiKey || '',
            geminiApiKey: settings.geminiApiKey || '',
          });
        })
      )
      .subscribe();

    this.aiForm = this.fb.group({
      openaiApiKey: ['', Validators.maxLength(200)],
      geminiApiKey: ['', Validators.maxLength(200)],
    });
  }

  checkAIKeysValidity(): void {
    if (!this.userId) {
      this.hasValidGemini = false;
      this.hasValidOpenAI = false;
      return;
    }

    this.http.get<{ openaiValid: boolean; geminiValid: boolean; openaiMessage: string; geminiMessage: string }>(`/api/usuarios/${this.userId}/llm/keys/validate`).pipe(
      catchError(() => of({ openaiValid: false, geminiValid: false, openaiMessage: '', geminiMessage: '' }))
    ).subscribe(res => {
      console.warn('API LLM Keys Validate Response (ai-settings):', res);
      this.hasValidOpenAI = res.openaiValid;
      this.hasValidGemini = res.geminiValid;
    });
  }

  ngOnDestroy(): void {
    if (this.oauthPopup) {
      this.oauthPopup.close();
    }
    window.removeEventListener('message', this.messageHandler);
  }

  getAIKeyErrorMessage(controlName: 'geminiApiKey' | 'openaiApiKey'): string {
    const control = this.aiForm.get(controlName);
    const val = control?.value || '';
    const masked = typeof val === 'string' && val.includes('...');

    if (masked) {
      return ''; // Não exibe mensagem de erro se a chave estiver mascarada
    }

    if (!control || !control.touched) {
      return '';
    }
    if (control.hasError('required')) {
      return 'API key é obrigatória.';
    }

    return '';
  }

  // endpoint removido: não há mensagens de erro associadas

  onSubmit(): void {
    this.formSubmitted = true;
    this.aiForm.markAllAsTouched();
    if (this.aiForm.invalid) {
      return;
    }
    const openai = this.aiForm.get('openaiApiKey')?.value?.trim() || '';
    const gemini = this.aiForm.get('geminiApiKey')?.value?.trim() || '';
    const requests: any[] = [];
    if (this.userId && openai) {
      const body = { provider: 'openai', apiKey: openai };
      if (this.llmKeys.openai) {
        requests.push(this.http.put(`/api/usuarios/${this.userId}/llm/keys`, body));
      } else {
        requests.push(this.http.post(`/api/usuarios/${this.userId}/llm/keys`, body));
      }
    }
    if (this.userId && gemini) {
      const body = { provider: 'gemini', apiKey: gemini };
      if (this.llmKeys.gemini) {
        requests.push(this.http.put(`/api/usuarios/${this.userId}/llm/keys`, body));
      } else {
        requests.push(this.http.post(`/api/usuarios/${this.userId}/llm/keys`, body));
      }
    }
    if (requests.length === 0) {
      alert('Preencha ao menos uma chave para salvar.');
      return;
    }
    const clearForm = () => this.aiForm.patchValue({ openaiApiKey: '', geminiApiKey: '' });
    const successFlow = () => {
      clearForm();
      this.checkAIKeysValidity();
      alert('Chaves de AI atualizadas com sucesso.');
    };
    const errorFlow = (msg?: string) => {
      this.checkAIKeysValidity();
      alert(msg || 'Falha ao salvar no servidor. As chaves foram armazenadas localmente para uso temporário.');
    };
    if (requests.length === 1) {
      requests[0].subscribe({
        next: () => successFlow(),
        error: (err: HttpErrorResponse) => {
          const msg = typeof err?.error === 'string' ? err.error : (err?.message || 'Falha ao salvar no servidor.');
          errorFlow(msg);
        }
      });
    } else {
      requests[0].pipe(switchMap(() => requests[1])).subscribe({
        next: () => successFlow(),
        error: (err: HttpErrorResponse) => {
          const msg = typeof err?.error === 'string' ? err.error : (err?.message || 'Falha ao salvar no servidor.');
          errorFlow(msg);
        }
      });
    }
  }

  toggleKeyVisibility(provider: 'gemini' | 'openai') {
    if (provider === 'gemini') {
      this.showGeminiKey = !this.showGeminiKey;
    } else {
      this.showOpenAIKey = !this.showOpenAIKey;
    }
  }

  clearKey(type: 'openai' | 'gemini'): void {
    if (type === 'openai') {
      this.aiForm.get('openaiApiKey')?.setValue('');
    } else {
      this.aiForm.get('geminiApiKey')?.setValue('');
    }
  }

  openGeminiPortal(): void {
    window.open('https://ai.google.dev/gemini-api/docs/api-key', '_blank');
  }

  openOpenAIPortal(): void {
    window.open('https://platform.openai.com/settings/organization/api-keys', '_blank');
  }




  // This function has been updated with console.log statements.

  loginWithProvider(provider: AIProvider): void {}

  private onPopupMessage(event: MessageEvent): void {
    try {
      const data = event.data || {};
      if (!data || data.type !== 'llm-auth') return;
      this.isLoginLoading = false;
    } catch {
      this.isLoginLoading = false;
    }
  }

 



}

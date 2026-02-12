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
import { SettingsService, AIProvider } from '../settings/settings.service';
import { AuthService } from '@core/authentication';
import { MtxAlertModule } from '@ng-matero/extensions/alert';
import { MtxLoaderModule } from '@ng-matero/extensions/loader';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { LocalStorageService } from '@shared';
import { of } from 'rxjs';
import { distinctUntilChanged, catchError, switchMap } from 'rxjs/operators';
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

  aiForm!: FormGroup<ControlsOf<{
    openaiApiKey: string;
    geminiApiKey: string;
  }>>;
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
    this.aiForm = this.fb.group<ControlsOf<{
      openaiApiKey: string;
      geminiApiKey: string;
    }>>({
      openaiApiKey: this.fb.control('', { nonNullable: true }),
      geminiApiKey: this.fb.control('', { nonNullable: true }),
    });

    const geminiCtrl = this.aiForm.get('geminiApiKey');
    const openaiCtrl = this.aiForm.get('openaiApiKey');
    // endpoint removido

    geminiCtrl?.setValidators([Validators.pattern(/^AIza[0-9A-Za-z-_]{20,40}$/)]);

    openaiCtrl?.setValidators([Validators.pattern(/^sk-[A-Za-z0-9-]{20,}$/)]);

    // validação de endpoint removida

    this.aiForm.patchValue({
      openaiApiKey: '',
      geminiApiKey: '',
    });

    const u = this.auth.getCurrentUserValue?.() ?? null;
    this.userId = (u && (u.id as number | null)) ?? null;
    window.addEventListener('message', this.messageHandler);
    this.fetchLlmKeys();
  }

  ngOnDestroy(): void {
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
    if (control.hasError('pattern')) {
      return 'Formato de API key inválido.';
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
    if (this.userId && openai && /^sk-[A-Za-z0-9-]{20,}$/.test(openai)) {
      const body = { provider: 'openai', apiKey: openai };
      if (this.llmKeys.openai) {
        requests.push(this.http.put(`/api/usuarios/${this.userId}/llm/keys`, body));
      } else {
        requests.push(this.http.post(`/api/usuarios/${this.userId}/llm/keys`, body));
      }
    }
    if (this.userId && gemini && /^AIza[0-9A-Za-z-_]{20,40}$/.test(gemini)) {
      const body = { provider: 'gemini', apiKey: gemini };
      if (this.llmKeys.gemini) {
        requests.push(this.http.put(`/api/usuarios/${this.userId}/llm/keys`, body));
      } else {
        requests.push(this.http.post(`/api/usuarios/${this.userId}/llm/keys`, body));
      }
    }
    if (requests.length === 0) {
      alert('Preencha ao menos uma chave válida para salvar.');
      return;
    }
    const clearForm = () => this.aiForm.patchValue({ openaiApiKey: '', geminiApiKey: '' });
    const successFlow = () => {
      clearForm();
      this.fetchLlmKeys();
      alert('Chaves de AI atualizadas com sucesso.');
    };
    const errorFlow = (msg?: string) => {
      this.fetchLlmKeys();
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

  private fetchLlmKeys(): void {
    if (!this.userId) {
      this.hasValidOpenAI = false;
      this.hasValidGemini = false;
      this.aiForm.patchValue({
        openaiApiKey: '',
        geminiApiKey: ''
      });
      return;
    }
    this.http.get<any>(`/api/usuarios/${this.userId}/llm/keys`).pipe(
      catchError(() => of(null))
    ).subscribe(keys => {
      const k = keys || {};
      const geminiVal = k?.gemini;
      const openaiVal = k?.openai;
      const geminiMasked = k?.geminiKeyMasked as string | null;
      const openaiMasked = k?.openaiKeyMasked as string | null;
      const backendGeminiValid = typeof geminiVal === 'boolean' ? geminiVal : this.validateKey('gemini', geminiVal || '');
      console.log(`fetchLlmKeys - backendGeminiValid: ${backendGeminiValid}`);
      const backendOpenaiValid = typeof openaiVal === 'boolean' ? openaiVal : this.validateKey('openai', openaiVal || '');
      this.llmKeys = { gemini: backendGeminiValid, openai: backendOpenaiValid };
      this.hasValidGemini = this.llmKeys.gemini || false;
      console.log(`fetchLlmKeys - this.hasValidGemini (after assignment): ${this.hasValidGemini}`);
      this.hasValidOpenAI = this.llmKeys.openai || false;
      const nextOpenai = (typeof openaiMasked === 'string' && openaiMasked) ? openaiMasked : (typeof openaiVal === 'string' ? openaiVal : '');
      const nextGemini = (typeof geminiMasked === 'string' && geminiMasked) ? geminiMasked : (typeof geminiVal === 'string' ? geminiVal : '');
      this.aiForm.patchValue({ openaiApiKey: nextOpenai, geminiApiKey: nextGemini });
      const openaiCtrl = this.aiForm.get('openaiApiKey');
      const geminiCtrl = this.aiForm.get('geminiApiKey');

      // As linhas abaixo (markAsUntouched/Touched) não são mais necessárias
      // pois a validade será controlada pelos validadores dinâmicos e pela função isInvalid.
      // if (backendOpenaiValid || isMasked(nextOpenai) || !openaiInvalid) {
      //   openaiCtrl?.markAsUntouched();
      // } else {
      //   openaiCtrl?.markAsTouched();
      // }
      // if (backendGeminiValid || isMasked(nextGemini) || !geminiInvalid) {
      //   geminiCtrl?.markAsUntouched();
      // } else {
      //   geminiCtrl?.markAsTouched();
      // }
    });
  }

  private validateKey(provider: AIProvider, key: string): boolean {
    console.log(`validateKey called for provider: ${provider}, key: ${key}`);
    if (!key || typeof key !== 'string') {
      console.log(`validateKey - Invalid key type or empty for ${provider}`);
      return false;
    }
    // A validação de chaves mascaradas não deve ocorrer aqui,
    // pois esta função é para validar chaves reais.
    if (key.includes('...')) {
      console.log(`validateKey - Key for ${provider} is masked, returning true.`);
      return true; // Considera mascarado como válido para evitar erros
    }
    if (provider === 'gemini') {
      const isValid = /^AIza[0-9A-Za-z-_]{20,40}$/.test(key);
      console.log(`validateKey - Gemini key validation result: ${isValid}`);
      return isValid;
    }
    if (provider === 'openai') {
      const isValid = /^sk-[A-Za-z0-9-]{20,}$/.test(key);
      console.log(`validateKey - OpenAI key validation result: ${isValid}`);
      return isValid;
    }
    console.log(`validateKey - Unknown provider: ${provider}, returning false.`);
    return false;
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

 

  isInvalid(controlName: 'geminiApiKey' | 'openaiApiKey'): boolean {
    const control = this.aiForm.get(controlName);
    const val = control?.value || '';
    const masked = typeof val === 'string' && val.includes('...');
    if (masked) return false;
    return !!control?.invalid;
  }

}

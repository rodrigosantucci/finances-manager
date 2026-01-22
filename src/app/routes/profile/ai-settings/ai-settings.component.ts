import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { SettingsService, AIAccessSettings, AIProvider } from '../settings/settings.service';
import { AuthService } from '@core/authentication';
import { MtxAlertModule } from '@ng-matero/extensions/alert';
import { MtxLoaderModule } from '@ng-matero/extensions/loader';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { distinctUntilChanged, map, catchError } from 'rxjs/operators';
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

  aiForm!: FormGroup<ControlsOf<{
    provider: AIProvider | null;
    geminiApiKey: string;
    openaiApiKey: string;
    aiBackendEndpoint: string;
  }>>;

  aiProviderOptions: AIProvider[] = ['gemini', 'openai'];
  userId: number | null = null;
  llmKeys: { gemini?: string; openai?: string } = {};
  hasValidGemini = false;
  hasValidOpenAI = false;
  isLoginLoading = false;
  private messageHandler = (event: MessageEvent) => this.onPopupMessage(event);
  private oauthPopup: Window | null = null;

  ngOnInit(): void {
    this.aiForm = this.fb.group<ControlsOf<{
      provider: AIProvider | null;
      geminiApiKey: string;
      openaiApiKey: string;
      aiBackendEndpoint: string;
    }>>({
      provider: this.fb.control(null as AIProvider | null),
      geminiApiKey: this.fb.control('', { nonNullable: true }),
      openaiApiKey: this.fb.control('', { nonNullable: true }),
      aiBackendEndpoint: this.fb.control('', { nonNullable: true, validators: [Validators.pattern(/^https?:\/\/.+/)] }),
    });

    const providerCtrl = this.aiForm.get('provider');
    const geminiCtrl = this.aiForm.get('geminiApiKey');
    const openaiCtrl = this.aiForm.get('openaiApiKey');
    const endpointCtrl = this.aiForm.get('aiBackendEndpoint');

    providerCtrl?.valueChanges.pipe(distinctUntilChanged()).subscribe((prov: AIProvider | null) => {
      if (prov === 'gemini') {
        geminiCtrl?.setValidators([Validators.required, Validators.minLength(20), Validators.pattern(/^AIza[0-9A-Za-z-_]{20,40}$/)]);
        openaiCtrl?.clearValidators();
        openaiCtrl?.setValue(openaiCtrl?.value || '');
      } else if (prov === 'openai') {
        openaiCtrl?.setValidators([Validators.required, Validators.minLength(20), Validators.pattern(/^sk-[A-Za-z0-9-]{20,}$/)]);
        geminiCtrl?.clearValidators();
        geminiCtrl?.setValue(geminiCtrl?.value || '');
      } else {
        geminiCtrl?.clearValidators();
        openaiCtrl?.clearValidators();
      }
      geminiCtrl?.updateValueAndValidity({ emitEvent: false });
      openaiCtrl?.updateValueAndValidity({ emitEvent: false });
    });

    endpointCtrl?.setAsyncValidators([
      (control: AbstractControl) => {
        const val = (control.value as string) || '';
        if (!val || !/^https?:\/\/.+/.test(val)) {
          return of(null);
        }
        const base = val.replace(/\/+$/, '');
        return this.http.get(`${base}/q/openapi`, { observe: 'response' }).pipe(
          map((res: HttpResponse<any>) => (res.status === 200 ? null : { invalidEndpoint: true })),
          catchError(() => of({ invalidEndpoint: true }))
        );
      }
    ]);

    const ai = this.settingsService.getAISettings();
    this.aiForm.patchValue({
      provider: ai.provider ?? null,
      geminiApiKey: ai.geminiApiKey ?? '',
      openaiApiKey: ai.openaiApiKey ?? '',
      aiBackendEndpoint: ai.aiBackendEndpoint ?? '',
    });
    providerCtrl?.updateValueAndValidity({ emitEvent: true });

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
    if (!control || !control.touched) {
      return '';
    }
    if (control.hasError('required')) {
      return 'API key é obrigatória.';
    }
    if (control.hasError('minlength')) {
      return 'Deve ter no mínimo 20 caracteres.';
    }
    if (control.hasError('pattern')) {
      return 'Formato de API key inválido.';
    }
    return '';
  }

  getErrorMessage(controlName: string): string {
    const control = this.aiForm.get(controlName);
    if (!control || !control.touched) {
      return '';
    }
    if (control.hasError('pattern')) {
      return 'Por favor, insira uma URL válida.';
    }
    if (control.hasError('invalidEndpoint')) {
      return 'Endpoint inválido ou indisponível.';
    }
    return '';
  }

  onSubmit(): void {
    this.aiForm.markAllAsTouched();
    if (this.aiForm.invalid) {
      return;
    }
    const aiSettings: AIAccessSettings = {
      provider: this.aiForm.get('provider')?.value ?? null,
      geminiApiKey: this.aiForm.get('geminiApiKey')?.value ?? null,
      openaiApiKey: this.aiForm.get('openaiApiKey')?.value ?? null,
      aiBackendEndpoint: this.aiForm.get('aiBackendEndpoint')?.value ?? null,
    };
    this.settingsService.updateAISettings(aiSettings);
    alert('Configurações de AI salvas com sucesso!');
  }

  openGeminiPortal(): void {
    window.open('https://ai.google.dev/gemini-api/docs/api-key', '_blank');
  }

  openOpenAIPortal(): void {
    window.open('https://platform.openai.com/settings/organization/api-keys', '_blank');
  }

  private fetchLlmKeys(): void {
    if (!this.userId) {
      this.hasValidGemini = false;
      this.hasValidOpenAI = false;
      return;
    }
    this.http.get<any>(`/api/usuarios/${this.userId}/llm/keys`).pipe(
      catchError(() => of(null))
    ).subscribe(keys => {
      const k = keys || {};
      this.llmKeys = { gemini: k?.gemini || '', openai: k?.openai || '' };
      this.hasValidGemini = this.validateKey('gemini', this.llmKeys.gemini || '');
      this.hasValidOpenAI = this.validateKey('openai', this.llmKeys.openai || '');
      if (this.hasValidGemini && !this.hasValidOpenAI) {
        this.aiForm.get('provider')?.setValue('gemini');
        this.aiForm.get('geminiApiKey')?.setValue(this.llmKeys.gemini || '');
      } else if (this.hasValidOpenAI && !this.hasValidGemini) {
        this.aiForm.get('provider')?.setValue('openai');
        this.aiForm.get('openaiApiKey')?.setValue(this.llmKeys.openai || '');
      }
    });
  }

  private validateKey(provider: AIProvider, key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    if (provider === 'gemini') {
      return /^AIza[0-9A-Za-z-_]{20,40}$/.test(key);
    }
    if (provider === 'openai') {
      return /^sk-[A-Za-z0-9-]{20,}$/.test(key);
    }
    return false;
  }

  loginWithProvider(provider: AIProvider): void {
    const endpoint = (this.aiForm.get('aiBackendEndpoint')?.value || '').trim();
    const base = endpoint ? String(endpoint).replace(/\/+$/, '') : '';
    const url = base ? `${base}/llm/oauth/${provider}?native=true` : `/api/llm/oauth/${provider}?native=true`;
    this.oauthPopup = window.open(url, 'llm-oauth', 'width=600,height=700');
    this.isLoginLoading = true;
  }

  private onPopupMessage(event: MessageEvent): void {
    try {
      const data = event.data || {};
      if (!data || data.type !== 'llm-auth') return;
      const provider: AIProvider = data.provider;
      const apiKey: string = data.apiKey;
      if (!provider || !apiKey) return;
      if (!this.validateKey(provider, apiKey)) return;
      if (provider === 'gemini') {
        this.aiForm.get('provider')?.setValue('gemini');
        this.aiForm.get('geminiApiKey')?.setValue(apiKey);
      } else if (provider === 'openai') {
        this.aiForm.get('provider')?.setValue('openai');
        this.aiForm.get('openaiApiKey')?.setValue(apiKey);
      }
      this.settingsService.updateAISettings({
        provider: this.aiForm.get('provider')?.value ?? null,
        geminiApiKey: this.aiForm.get('geminiApiKey')?.value ?? null,
        openaiApiKey: this.aiForm.get('openaiApiKey')?.value ?? null,
        aiBackendEndpoint: this.aiForm.get('aiBackendEndpoint')?.value ?? null,
      });
      alert('Autenticação concluída e chave API recebida.');
      if (this.oauthPopup && !this.oauthPopup.closed) {
        this.oauthPopup.close();
      }
      this.fetchLlmKeys();
      this.isLoginLoading = false;
    } catch {
      // silenciar erros do postMessage
      this.isLoginLoading = false;
    }
  }
}

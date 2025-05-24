// src/app/modules/settings/settings.component.ts
import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl, // <<-- Certifique-se de que está importado
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ControlsOf } from '@shared/interfaces'; // Ajuste o caminho se necessário
import { AuthService } from '@core/authentication/auth.service';
import { User } from '@core/authentication/interface';
import { IProfileReduced, SettingsService } from './settings.service'; // Importe a interface e o serviço

// Validador customizado para confirmar senha (pode ser movido para um arquivo de utilitários de validação)
export function confirmPasswordValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) {
    return null;
  }

  // Se ambos os campos de senha estão vazios, a validação de mismatch não se aplica.
  // A validação 'required' para confirmPassword quando password é preenchida será feita no onSubmit.
  if (!password.value && !confirmPassword.value) {
    confirmPassword.setErrors(null);
    return null;
  }

  if (password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  } else {
    // Limpa o erro se as senhas agora coincidem, caso tenha sido definido anteriormente
    if (confirmPassword.hasError('passwordMismatch')) {
      confirmPassword.setErrors(null);
    }
    return null;
  }
}

@Component({
  selector: 'app-profile-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  providers: [provideNativeDateAdapter(), SettingsService], // Forneça o serviço aqui ou em app.config.ts
})
export class ProfileSettingsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService); // Injete o serviço

  reactiveForm!: FormGroup<ControlsOf<IProfileReduced>>;

  selectedFile: File | null = null;
  avatarPreviewUrl: string | ArrayBuffer | null = null;
  avatarError: string | null = null;

  defaultAvatarPlaceholder: string = 'images/avatar.jpg'; // Caminho para seu placeholder

  // O user é necessário aqui para obter o ID no ngOnInit e outras lógicas do componente
  user!: User;

  ngOnInit(): void {
    // O subscribe aqui é principalmente para ter o objeto 'user' disponível no componente
    // para exibir informações ou para a lógica do formulário, não para acionar diretamente as chamadas de API.
    // As chamadas de API são acionadas pelos métodos do SettingsService, que internamente buscam o ID.
    this.auth.user().subscribe(user => {
      this.user = user;
      // Se o usuário já estiver disponível, tente carregar os dados
      // settingsService.getProfile() já lida com a ausência de ID internamente
      this.loadUserData();
    });

    this.reactiveForm = this.fb.group<ControlsOf<IProfileReduced>>({
      username: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
      email: this.fb.control('', { validators: [Validators.required, Validators.email], nonNullable: true }),
      password: this.fb.control('', { nonNullable: true }),
      confirmPassword: this.fb.control('', { nonNullable: true }),
      estrategia: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
      perfil: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
      avatarIdentifier: this.fb.control(undefined as any), // Campo para o identificador do avatar (ex: ID do usuário)
      id: this.fb.control(undefined as any) // ID do usuário, para propósitos internos
    }, { validators: confirmPasswordValidator });
  }

  loadUserData(): void {
    // Componente chama o serviço para obter os dados. Não passa o ID diretamente.
    this.settingsService.getProfile().subscribe({
      next: (data: IProfileReduced | null) => {
        if (data) {
          this.reactiveForm.patchValue({
            username: data.username,
            email: data.email,
            estrategia: data.estrategia,
            perfil: data.perfil,
            id: data.id, // Atualiza o ID no formulário também
          });

          // Verifica se há um avatarIdentifier vindo do backend
          if (data.avatarIdentifier !== undefined && data.avatarIdentifier !== null) {
            // Constrói a URL completa do avatar usando o serviço
            this.avatarPreviewUrl = this.settingsService.getFullAvatarUrl(data.avatarIdentifier);
            // Salva o identificador no formulário para uso posterior se necessário
            this.reactiveForm.get('avatarIdentifier')?.patchValue(data.avatarIdentifier);
          } else {
            this.avatarPreviewUrl = this.defaultAvatarPlaceholder;
          }
        } else {
          console.warn('Não foi possível carregar os dados do perfil ou usuário não encontrado. Exibindo placeholder.');
          this.avatarPreviewUrl = this.defaultAvatarPlaceholder;
        }
      },
      error: (err) => {
        // Erro já tratado no serviço para retornar null, mas é bom ter um fallback aqui
        console.error('Erro inesperado ao carregar dados do usuário no componente:', err);
        this.avatarPreviewUrl = this.defaultAvatarPlaceholder;
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.avatarError = null;

      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.avatarError = 'Apenas arquivos JPEG e PNG são permitidos.';
        this.selectedFile = null;
        this.avatarPreviewUrl = this.defaultAvatarPlaceholder;
        input.value = ''; // Limpa o input do arquivo para permitir nova seleção
        return;
      }

      const maxSize = 2 * 1024 * 1024; // 2 MB
      if (file.size > maxSize) {
        this.avatarError = 'O tamanho do arquivo não pode exceder 2MB.';
        this.selectedFile = null;
        this.avatarPreviewUrl = this.defaultAvatarPlaceholder;
        input.value = ''; // Limpa o input do arquivo
        return;
      }

      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.avatarPreviewUrl = reader.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedFile = null;
      // Se nenhum arquivo foi selecionado, mantém o avatar existente se houver, ou o placeholder
      const currentAvatarIdentifier = this.reactiveForm.get('avatarIdentifier')?.value;
      this.avatarPreviewUrl = currentAvatarIdentifier !== undefined && currentAvatarIdentifier !== null ?
                              this.settingsService.getFullAvatarUrl(currentAvatarIdentifier) :
                              this.defaultAvatarPlaceholder;
    }
  }

  // === MÉTODOS DE MENSAGENS DE ERRO ===
  // O erro indicava que estes métodos estavam faltando ou inacessíveis.
  getErrorMessage(controlName: string): string {
    const control = this.reactiveForm.get(controlName);
    if (!control || !control.touched) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Este campo é obrigatório.';
    }
    if (control.hasError('email')) {
      return 'Por favor, insira um e-mail válido.';
    }
    // Adicione mais mensagens de erro conforme suas validações
    return '';
  }

  getPasswordErrorMessage(): string {
    const confirmPasswordControl = this.reactiveForm.get('confirmPassword');

    if (!confirmPasswordControl || !confirmPasswordControl.touched) {
      return '';
    }

    if (confirmPasswordControl.hasError('passwordMismatch')) {
      return 'As senhas não coincidem.';
    }
    // Adicione outras validações de senha, se houver (ex: minLength)
    return '';
  }
  // === FIM DOS MÉTODOS DE MENSAGENS DE ERRO ===


  onSubmit(): void {
    this.reactiveForm.markAllAsTouched(); // Marca todos os controles como 'touched' para exibir validações

    // Verificação de senha e confirmação de senha
    const password = this.reactiveForm.get('password')?.value;
    const confirmPassword = this.reactiveForm.get('confirmPassword')?.value;

    // Se a senha foi preenchida, a confirmação é obrigatória e deve coincidir
    if (password && password.length > 0) {
      if (!confirmPassword || confirmPassword.length === 0) {
        this.reactiveForm.get('confirmPassword')?.setErrors({ 'required': true });
        this.reactiveForm.get('confirmPassword')?.markAsTouched();
        console.log('Confirmação de senha é obrigatória quando a senha é preenchida.');
        return; // Sai da função para que o usuário corrija
      }
      if (password !== confirmPassword) {
        this.reactiveForm.get('confirmPassword')?.setErrors({ 'passwordMismatch': true });
        this.reactiveForm.get('confirmPassword')?.markAsTouched();
        console.log('As senhas não coincidem.');
        return; // Sai da função
      }
    } else {
      // Se a senha está vazia, limpa erros de confirmação de senha
      this.reactiveForm.get('confirmPassword')?.setErrors(null);
    }

    // Após todas as verificações manuais de senhas, verifica a validade geral do formulário
    // Se o formulário está inválido E NÃO HÁ um arquivo selecionado para upload (que não é validado pelo formGroup),
    // então não prossegue. Se o form está inválido mas tem um arquivo, pode ser um update de avatar apenas.
    if (this.reactiveForm.invalid && !this.selectedFile) {
        console.log('Formulário inválido e nenhum arquivo de avatar selecionado. Não será enviado.');
        return;
    }

    const formData = new FormData();
    const formValue = this.reactiveForm.getRawValue(); // Usa getRawValue para pegar todos os valores, mesmo desabilitados

    // Anexa os campos do formulário ao FormData
    formData.append('username', formValue.username);
    formData.append('email', formValue.email);
    formData.append('estrategia', formValue.estrategia);
    formData.append('perfil', formValue.perfil);

    // Anexa a senha apenas se ela foi preenchida e as validações passaram
    if (formValue.password && formValue.password.length > 0) {
      formData.append('password', formValue.password);
    }

    // Anexa o arquivo de avatar se um novo arquivo foi selecionado
    if (this.selectedFile) {
      formData.append('avatar', this.selectedFile, this.selectedFile.name);
    }

    this.settingsService.updateProfile(formData).subscribe({
      next: (response: IProfileReduced | null) => {
        if (response) {
          console.log('Perfil atualizado com sucesso!', response);
          alert('Perfil atualizado com sucesso!');
          // Se o backend retorna o novo avatarIdentifier após o upload
          if (response.avatarIdentifier !== undefined && response.avatarIdentifier !== null) {
            this.avatarPreviewUrl = this.settingsService.getFullAvatarUrl(response.avatarIdentifier);
            this.reactiveForm.get('avatarIdentifier')?.patchValue(response.avatarIdentifier); // Atualiza o identificador no formulário
          } else {
            // Se o backend não retorna o avatarIdentifier no response de update,
            // ou se ele não foi atualizado (ex: nenhum novo arquivo),
            // recarregue os dados do usuário para garantir que o avatar atualizado seja exibido.
            // Isso é um fallback seguro.
            this.loadUserData();
          }
        } else {
          console.error('Erro ao atualizar perfil: Resposta nula ou erro no serviço.');
          alert('Erro ao atualizar perfil. Verifique o console.');
        }

        // Limpa campos de senha e estado do arquivo selecionado após a tentativa de submit
        this.selectedFile = null;
        this.reactiveForm.get('password')?.reset('');
        this.reactiveForm.get('confirmPassword')?.reset('');
        // Marcar como 'pristine' e 'untouched' para resetar o estado de validação visual
        this.reactiveForm.markAsPristine();
        this.reactiveForm.markAsUntouched();
      },
      error: (err) => {
        console.error('Erro inesperado ao atualizar perfil no componente:', err);
        alert('Erro ao atualizar perfil. Verifique o console.');
      }
    });
  }
}

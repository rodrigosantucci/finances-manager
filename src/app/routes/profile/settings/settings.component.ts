import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ControlsOf } from '@shared/interfaces';
import { AuthService, User } from '@core';
import { IProfileReduced, SettingsService } from './settings.service';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { environment } from '@env/environment';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs';

export function confirmPasswordValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) {
    return null;
  }

  if (!password.value && !confirmPassword.value) {
    confirmPassword.setErrors(null);
    return null;
  }

  if (password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  } else {
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
    MatProgressSpinnerModule,
  ],
  providers: [provideNativeDateAdapter(), SettingsService],
})
export class ProfileSettingsComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  reactiveForm!: FormGroup<ControlsOf<IProfileReduced>>;
  selectedFile: File | null = null;
  avatarPreviewUrl: SafeUrl | string | ArrayBuffer | null = null;
  avatarError: string | null = null;
  defaultAvatarPlaceholder: string = 'images/avatar.jpg';
  private avatarObjectUrl: string | null = null;
  isLoadingAvatar: boolean = true;

  user!: User;

  ngOnInit(): void {
    console.log('ProfileSettingsComponent: Initializing');
    this.auth
      .user()
      .pipe(
        distinctUntilChanged((prev, curr) => prev.id === curr.id),
        tap(user => {
          console.log('ProfileSettingsComponent: User received', user);
          this.user = user;
          this.loadUserData();
          this.loadAvatar(user.id);
        }),
        debounceTime(100)
      )
      .subscribe();

    this.reactiveForm = this.fb.group<ControlsOf<IProfileReduced>>({
      username: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
      email: this.fb.control('', { validators: [Validators.required, Validators.email], nonNullable: true }),
      password: this.fb.control('', { nonNullable: true }),
      confirmPassword: this.fb.control('', { nonNullable: true }),
      estrategia: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
      perfil: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
      avatarIdentifier: this.fb.control(undefined as any),
      id: this.fb.control(undefined as any),
    }, { validators: confirmPasswordValidator });
  }

  loadUserData(): void {
    console.log('ProfileSettingsComponent: Loading user data');
    this.settingsService.getProfile().subscribe({
      next: (data: IProfileReduced | null) => {
        if (data) {
          console.log('ProfileSettingsComponent: Profile data loaded', data);
          this.reactiveForm.patchValue({
            username: data.username,
            email: data.email,
            estrategia: data.estrategia,
            perfil: data.perfil,
            id: data.id,
            avatarIdentifier: data.avatarIdentifier,
          });
        } else {
          console.warn('ProfileSettingsComponent: No profile data loaded, using placeholder');
          this.avatarPreviewUrl = this.defaultAvatarPlaceholder;
          this.isLoadingAvatar = false;
        }
      },
      error: (err) => {
        console.error('ProfileSettingsComponent: Error loading profile data:', err);
        this.avatarPreviewUrl = this.defaultAvatarPlaceholder;
        this.isLoadingAvatar = false;
      }
    });
  }

  private loadAvatar(userId: number | undefined): void {
    if (!userId) {
      console.warn('ProfileSettingsComponent: No user ID provided for avatar loading');
      this.avatarPreviewUrl = this.defaultAvatarPlaceholder;
      this.isLoadingAvatar = false;
      return;
    }

    console.log('ProfileSettingsComponent: Fetching avatar for ID:', userId);
    this.http.get(`${environment.baseUrl}avatars/${userId}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        console.log('ProfileSettingsComponent: Avatar loaded for ID:', userId);
        this.avatarObjectUrl = URL.createObjectURL(blob);
        this.avatarPreviewUrl = this.sanitizer.bypassSecurityTrustUrl(this.avatarObjectUrl);
        this.isLoadingAvatar = false;
      },
      error: (error) => {
        console.warn('ProfileSettingsComponent: Failed to load avatar:', error);
        this.avatarPreviewUrl = this.defaultAvatarPlaceholder;
        this.isLoadingAvatar = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    console.log('ProfileSettingsComponent: File selected');
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.avatarError = null;

      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.avatarError = 'Apenas arquivos JPEG e PNG são permitidos.';
        this.selectedFile = null;
        this.avatarPreviewUrl = this.defaultAvatarPlaceholder;
        input.value = '';
        this.isLoadingAvatar = false;
        return;
      }

      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        this.avatarError = 'O tamanho do arquivo não pode exceder 2MB.';
        this.selectedFile = null;
        this.avatarPreviewUrl = this.defaultAvatarPlaceholder;
        input.value = '';
        this.isLoadingAvatar = false;
        return;
      }

      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.avatarPreviewUrl = reader.result;
        this.isLoadingAvatar = false;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedFile = null;
      this.loadAvatar(this.user.id);
    }
  }

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
    return '';
  }

  onSubmit(): void {
    console.log('ProfileSettingsComponent: Submitting form');
    this.reactiveForm.markAllAsTouched();

    const password = this.reactiveForm.get('password')?.value;
    const confirmPassword = this.reactiveForm.get('confirmPassword')?.value;

    if (password && password.length > 0) {
      if (!confirmPassword || confirmPassword.length === 0) {
        this.reactiveForm.get('confirmPassword')?.setErrors({ required: true });
        this.reactiveForm.get('confirmPassword')?.markAsTouched();
        console.log('ProfileSettingsComponent: Confirmação de senha é obrigatória');
        return;
      }
      if (password !== confirmPassword) {
        this.reactiveForm.get('confirmPassword')?.setErrors({ passwordMismatch: true });
        this.reactiveForm.get('confirmPassword')?.markAsTouched();
        console.log('ProfileSettingsComponent: As senhas não coincidem');
        return;
      }
    } else {
      this.reactiveForm.get('confirmPassword')?.setErrors(null);
    }

    if (this.reactiveForm.invalid && !this.selectedFile) {
      console.log('ProfileSettingsComponent: Formulário inválido e nenhum arquivo selecionado');
      return;
    }

    const formData = new FormData();
    const formValue = this.reactiveForm.getRawValue();

    formData.append('username', formValue.username);
    formData.append('email', formValue.email);
    formData.append('estrategia', formValue.estrategia);
    formData.append('perfil', formValue.perfil);

    if (formValue.password && formValue.password.length > 0) {
      formData.append('password', formValue.password);
    }

    if (this.selectedFile) {
      formData.append('avatar', this.selectedFile, this.selectedFile.name);
    }

    this.isLoadingAvatar = true;
    this.settingsService.updateProfile(formData).subscribe({
      next: (response: IProfileReduced | null) => {
        if (response) {
          console.log('ProfileSettingsComponent: Perfil atualizado com sucesso', response);
          alert('Perfil atualizado com sucesso!');
          if (response.id) {
            this.loadAvatar(response.id);
          }
          this.reactiveForm.patchValue({
            id: response.id,
            avatarIdentifier: response.avatarIdentifier,
          });
        } else {
          console.error('ProfileSettingsComponent: Erro ao atualizar perfil: Resposta nula');
          alert('Erro ao atualizar perfil');
          this.loadAvatar(this.user.id);
        }

        this.selectedFile = null;
        this.reactiveForm.get('password')?.reset('');
        this.reactiveForm.get('confirmPassword')?.reset('');
        this.reactiveForm.markAsPristine();
        this.reactiveForm.markAsUntouched();
      },
      error: (err) => {
        console.error('ProfileSettingsComponent: Erro ao atualizar perfil:', err);
        alert('Erro ao atualizar perfil');
        this.loadAvatar(this.user.id);
      }
    });
  }

  onImageError(event: Event): void {
    console.warn('ProfileSettingsComponent: Image failed to load:', (event.target as HTMLImageElement).src);
    (event.target as HTMLImageElement).src = this.defaultAvatarPlaceholder;
    this.avatarPreviewUrl = this.defaultAvatarPlaceholder;
    this.isLoadingAvatar = false;
  }

  ngOnDestroy(): void {
    console.log('ProfileSettingsComponent: Destroying');
    if (this.avatarObjectUrl) {
      URL.revokeObjectURL(this.avatarObjectUrl);
      this.avatarObjectUrl = null;
    }
  }
}

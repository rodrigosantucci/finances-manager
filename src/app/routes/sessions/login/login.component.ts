// src/app/routes/sessions/login/login.component.ts
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { MtxButtonModule } from '@ng-matero/extensions/button';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';

import { AuthService } from '@core/authentication';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true, // Adicione standalone: true se este for um componente standalone
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MtxButtonModule,
    TranslateModule,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  isSubmitting = false;

  loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  get username() {
    return this.loginForm.get('username')!;
  }

  get password() {
    return this.loginForm.get('password')!;
  }

  get rememberMe() {
    return this.loginForm.get('rememberMe')!;
  }

  login() {
    this.isSubmitting = true;

    this.auth
      .login(this.username.value, this.password.value, this.rememberMe.value)
      .pipe(filter(authenticated => authenticated))
      .subscribe({
        next: () => {
          this.router.navigateByUrl('/');
        },
        error: (errorRes: HttpErrorResponse) => {
          this.isSubmitting = false; // Importante para reabilitar o botão

          if (errorRes.status === 401) {
            // Defina um erro personalizado para o formulário
            this.loginForm.setErrors({ invalidCredentials: true });
            // Opcional: Marcar os campos como 'touched' para exibir os erros imediatamente
            this.username.markAsTouched();
            this.password.markAsTouched();
            console.log('Login ou senha inválidos.');
          } else if (errorRes.status === 422) {
            // Lógica existente para erros de validação (ex: campos faltando)
            const form = this.loginForm;
            const errors = errorRes.error.errors;
            Object.keys(errors).forEach(key => {
              form.get(key === 'email' ? 'username' : key)?.setErrors({
                remote: errors[key][0],
              });
            });
          } else {
            // Tratamento de outros erros HTTP, se necessário
            console.error('Erro de login:', errorRes);
          }
        },
      });
  }
}

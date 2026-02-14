import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot.component.html',
  styleUrl: './forgot.component.scss',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    HttpClientModule,
    MatSnackBarModule,
    TranslateModule,
  ],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  isSubmitting = false;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get email() {
    return this.form.get('email')!;
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const body = { email: this.email.value };
    this.http.post('/api/usuarios/solicitar-reset-senha', body).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open(this.translate.instant('forgot.messages.reset_instructions_sent'), this.translate.instant('close'), { duration: 5000 });
        this.router.navigateByUrl('/auth/login');
      },
      error: () => {
        this.isSubmitting = false;
        this.snackBar.open(this.translate.instant('forgot.errors.reset_email_failed'), this.translate.instant('close'), { duration: 5000 });
      },
    });
  }
}

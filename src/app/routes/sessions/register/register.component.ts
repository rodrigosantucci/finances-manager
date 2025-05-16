import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router'; // Import Router for navigation
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // Import HttpClient
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Import MatProgressSpinnerModule
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // Import MatSnackBar and MatSnackBarModule
import { catchError, finalize, tap } from 'rxjs/operators'; // Import operators
import { throwError } from 'rxjs'; // Import throwError
import {CommonModule} from '@angular/common'; // Import CommonModule for ngIf and ngFor

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  standalone: true, // Assuming it's a standalone component based on imports
  imports: [
    RouterLink,
    CommonModule, // Add CommonModule for ngIf and ngFor
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule,
    MatProgressSpinnerModule, // Add MatProgressSpinnerModule
    MatSnackBarModule, // Add MatSnackBarModule
  ],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient); // Inject HttpClient
  private readonly router = inject(Router); // Inject Router
  private readonly snackBar = inject(MatSnackBar); // Inject MatSnackBar

loading = false; // Add loading state

  registerForm = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]], // Added email validator
      password: ['', [Validators.required, Validators.minLength(6)]], // Added minLength validator
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [this.matchValidator('password', 'confirmPassword')],
    }
  );



  matchValidator(source: string, target: string) {
    return (control: AbstractControl) => {
      const sourceControl = control.get(source)!;
      const targetControl = control.get(target)!;
      if (targetControl.errors && !targetControl.errors['mismatch']) { // Use bracket notation for error key
        return null;
      }
      if (sourceControl.value !== targetControl.value) {
        targetControl.setErrors({ mismatch: true });
        return { mismatch: true };
      } else {
        targetControl.setErrors(null);
        return null;
      }
    };
  }

  // Method to handle form submission
  onSubmit(): void {
    // Check if the form is valid
    if (this.registerForm.invalid) {
      this.snackBar.open('Por favor, preencha todos os campos obrigatórios e corrija os erros.', 'Fechar', { duration: 3000 });
      // Mark all fields as touched to display validation errors
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true; // Set loading state to true

    // Get form values, excluding confirmPassword
    const { username, email, password } = this.registerForm.getRawValue();
    const registrationData = { username, email, password };

    // Perform the POST request to the registration endpoint
    // Use the relative path. The baseUrlInterceptor will handle adding the base URL.
    const registerUrl = '/api/auth/registro';

    this.http.post(registerUrl, registrationData)
      .pipe(
        tap((response) => {
          // Handle successful registration response
          console.log('Registro bem-sucedido:', response);
          this.snackBar.open('Registro bem-sucedido! Faça login para continuar.', 'Fechar', { duration: 50000 });
          // Navigate to the login page after successful registration
          this.router.navigate(['/auth/login']);
        }),
        catchError((error: HttpErrorResponse) => {
          // Handle registration error
          console.error('Erro no registro:', error);
          let errorMessage = 'Falha no registro. Tente novamente.';
          if (error.status === 409) { // Conflict status code (e.g., username already exists)
             errorMessage = 'Nome de usuário ou e-mail já cadastrado.';
          } else if (error.error && error.error.message) {
             errorMessage = `Erro: ${error.error.message}`; // Use backend error message if available
          } else if (error.statusText) {
             errorMessage = `Erro: ${error.statusText}`;
          }

          this.snackBar.open(errorMessage, 'Fechar', { duration: 5000 });
          // Re-throw the error so it can be handled by other interceptors if needed
          return throwError(() => new Error(errorMessage));
        }),
        finalize(() => {
          // This block runs after the request is completed, regardless of success or error
          this.loading = false; // Set loading state to false
        })
      )
      .subscribe(); // Subscribe to trigger the request
  }
}

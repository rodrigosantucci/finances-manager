import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService, User } from '@core';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent } from '@shared';
import { environment } from '@env/environment';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs';
import { DashboardService } from 'app/routes/dashboard/dashboard.service';

@Component({
  selector: 'app-profile-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: true,
  imports: [
    RouterLink,
    RouterOutlet,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatListModule,
    MatIconModule,
    PageHeaderComponent,
    TranslateModule,
  ],
})
export class ProfileLayoutComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dashboardService = inject(DashboardService);


  defaultAvatarPlaceholder: string = 'images/avatar.jpg';
  private readonly apiUrl: string = environment.baseUrl;
  private avatarObjectUrl: string | null = null;

  user!: User;
  avatarUrl: SafeUrl = this.defaultAvatarPlaceholder;
  isLoadingUser = true;

  ngOnInit(): void {
 //   console.log('ProfileLayoutComponent: Initializing');
    this.auth
      .user()
      .pipe(
        distinctUntilChanged((prev, curr) => prev.id === curr.id),
        tap(user => {
      //    console.log('ProfileLayoutComponent: User received', user);
          this.user = user;
          this.loadAvatar(user.id);
          this.isLoadingUser = false;
        }),
        debounceTime(100)
      )
      .subscribe();
  }

  logout() {
    this.auth.logout().subscribe(() => {
      this.dashboardService.clearPatrimonioCache(); // Limpa o cache do serviço de dashboard
      this.router.navigateByUrl('/auth/login');
    });
  }

private loadAvatar(userId: number | undefined): void {
  if (!userId) {
    console.warn('ProfileLayoutComponent: No user ID provided for avatar loading');
    this.avatarUrl = this.defaultAvatarPlaceholder;
    return;
  }

 // console.log('ProfileLayoutComponent: Fetching avatar for ID:', userId);
  this.http.get(`${this.apiUrl}/api/avatars/${userId}`, { responseType: 'blob' }).subscribe({
    next: (blob) => {
 //     console.log('ProfileLayoutComponent: Avatar loaded for ID:', userId);
      // Libera a URL do objeto anterior se existir, para evitar vazamentos de memória
      if (this.avatarObjectUrl) {
        URL.revokeObjectURL(this.avatarObjectUrl);
      }
      this.avatarObjectUrl = URL.createObjectURL(blob);
      this.avatarUrl = this.sanitizer.bypassSecurityTrustUrl(this.avatarObjectUrl);
    },
    error: (error: HttpErrorResponse) => { // Tipar o erro como HttpErrorResponse
      console.warn('ProfileLayoutComponent: Failed to load avatar:', error);

      // Verifica se o erro é um HttpErrorResponse e se o status é 404
      if (error instanceof HttpErrorResponse && error.status === 404) {
  //      console.log('ProfileLayoutComponent: Avatar not found (404), displaying placeholder.');
        this.avatarUrl = this.defaultAvatarPlaceholder;
      } else {
        // Para outros tipos de erro, você pode querer exibir o placeholder ou lidar de outra forma
        console.error('ProfileLayoutComponent: An unexpected error occurred while loading avatar.');
        this.avatarUrl = this.defaultAvatarPlaceholder; // Ou algum outro placeholder de erro genérico
      }
    }
  });
}

  ngOnDestroy(): void {
  //  console.log('ProfileLayoutComponent: Destroying');
    if (this.avatarObjectUrl) {
      URL.revokeObjectURL(this.avatarObjectUrl);
      this.avatarObjectUrl = null;
    }
  }

  onImageError(event: Event): void {
    console.warn('ProfileLayoutComponent: Image failed to load:', (event.target as HTMLImageElement).src);
    (event.target as HTMLImageElement).src = this.defaultAvatarPlaceholder;
    this.avatarUrl = this.defaultAvatarPlaceholder;
  }
}

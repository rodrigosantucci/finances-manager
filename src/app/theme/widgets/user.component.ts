import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs';
import { AuthService, SettingsService, User } from '@core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { environment } from '@env/environment';

@Component({
  selector: 'app-user',
  template: `
    <button mat-icon-button [matMenuTriggerFor]="menu">
      <img
        class="avatar"
        [src]="avatarUrl"
        alt="avatar"
        width="24"
        (error)="onImageError($event)"
      />
    </button>

    <mat-menu #menu="matMenu">
      <button routerLink="/profile/overview" mat-menu-item>
        <mat-icon>account_circle</mat-icon>
        <span>{{ 'profile' | translate }}</span>
      </button>
      <button routerLink="/profile/settings" mat-menu-item>
        <mat-icon>edit</mat-icon>
        <span>{{ 'edit_profile' | translate }}</span>
      </button>
      <button mat-menu-item (click)="logout()">
        <mat-icon>exit_to_app</mat-icon>
        <span>{{ 'logout' | translate }}</span>
      </button>
    </mat-menu>
  `,
  styles: `
    .avatar {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50rem;
    }
  `,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule, TranslateModule],
})
export class UserComponent implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly settings = inject(SettingsService);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  user!: User;
  defaultAvatarPlaceholder: string = 'images/avatar.jpg';
  avatarUrl: SafeUrl = this.defaultAvatarPlaceholder;
  private avatarObjectUrl: string | null = null;

  ngOnInit(): void {
    console.log('UserComponent: Initializing');
    this.auth
      .user()
      .pipe(
        distinctUntilChanged((prev, curr) => prev.id === curr.id),
        tap(user => {
          console.log('UserComponent: User received', user);
          this.user = user;
          this.loadAvatar(user.id);
        }),
        debounceTime(100)
      )
      .subscribe(() => {
        console.log('UserComponent: Triggering change detection');
        this.cdr.detectChanges();
      });
  }

  private loadAvatar(userId: number | undefined): void {
    if (!userId) {
      console.warn('UserComponent: No user ID provided for avatar loading');
      this.avatarUrl = this.defaultAvatarPlaceholder;
      return;
    }

    console.log('UserComponent: Fetching avatar for ID:', userId);
    this.http.get(`${environment.baseUrl}avatars/${userId}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        console.log('UserComponent: Avatar loaded for ID:', userId);
        this.avatarObjectUrl = URL.createObjectURL(blob);
        this.avatarUrl = this.sanitizer.bypassSecurityTrustUrl(this.avatarObjectUrl);
      },
      error: (error) => {
        console.warn('UserComponent: Failed to load avatar:', error);
        this.avatarUrl = this.defaultAvatarPlaceholder;
      },
      complete: () => this.cdr.detectChanges()
    });
  }

  onImageError(event: Event): void {
    console.warn('UserComponent: Image failed to load:', (event.target as HTMLImageElement).src);
    (event.target as HTMLImageElement).src = this.defaultAvatarPlaceholder;
    this.avatarUrl = this.defaultAvatarPlaceholder;
    this.cdr.detectChanges();
  }

  logout() {
    this.auth.logout().subscribe(() => {
      this.router.navigateByUrl('/auth/login');
    });
  }

  restore() {
    this.settings.reset();
    window.location.reload();
  }

  ngOnDestroy(): void {
    console.log('UserComponent: Destroying');
    if (this.avatarObjectUrl) {
      URL.revokeObjectURL(this.avatarObjectUrl);
      this.avatarObjectUrl = null;
    }
  }
}

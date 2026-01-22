import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@core/authentication';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, MatBadgeModule, MatButtonModule, MatIconModule, MatListModule, MatMenuModule, MatTooltipModule, MatDividerModule, MatSnackBarModule],
  template: `
    <button mat-icon-button [matMenuTriggerFor]="menu" [matBadge]="unreadCount" matBadgeColor="warn" matTooltip="Notificações">
      <mat-icon aria-hidden="false">notifications</mat-icon>
    </button>

    <mat-menu #menu="matMenu" class="notifications-menu">
      <mat-nav-list>
        <mat-list-item class="actions-row">
          <div matListItemTitle class="actions-row-content">
            <div class="pager-group">
              <button mat-icon-button matTooltip="Página anterior" (click)="$event.stopPropagation(); prevPage()" [disabled]="currentPage <= 1">
                <mat-icon>chevron_left</mat-icon>
              </button>
              <span class="page-indicator">Página {{ currentPage }} de {{ totalPages || 0 }}</span>
              <button mat-icon-button matTooltip="Próxima página" (click)="$event.stopPropagation(); nextPage()" [disabled]="currentPage >= totalPages">
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
            <div class="actions-group">
              <button mat-icon-button matTooltip="Visualizar todas" (click)="markAllAsRead()">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Apagar todas" color="warn" (click)="deleteAll()">
                <mat-icon>delete_sweep</mat-icon>
              </button>
            </div>
          </div>
        </mat-list-item>
        <mat-divider></mat-divider>
        @for (n of pageNotifications; track n) {
          <mat-list-item>
            <mat-icon class="m-x-16" matListItemIcon>{{ n.tipoIcon || 'info' }}</mat-icon>
            <div matListItemTitle>{{ n.titulo || 'Notificação' }}</div>
            <div matListItemLine>{{ n.mensagem }}</div>
            <div matListItemMeta>
              <button mat-icon-button matTooltip="Marcar como lida" (click)="markAsRead(n)">
                <mat-icon>done_all</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Excluir" (click)="delete(n)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </mat-list-item>
        }
      </mat-nav-list>
    </mat-menu>
  `,
  styles: `
    :host ::ng-deep .mat-badge-content {
      --mat-badge-background-color: #ef0000;
      --mat-badge-text-color: #fff;
    }
    :host ::ng-deep .notifications-menu .mat-mdc-menu-content {
      width: 1050px;
      max-width: 98vw;
      max-height: 80vh;
      overflow-y: auto;
      padding: 6px 8px;
      box-sizing: border-box;
    }
    :host ::ng-deep .notifications-menu.mat-mdc-menu-panel {
      width: 1050px;
      max-width: 98vw;
    }
    :host ::ng-deep .notifications-menu .mat-mdc-nav-list {
      padding: 0;
    }
    :host ::ng-deep .notifications-menu .mat-mdc-list-item {
      padding: 2px 6px;
      align-items: flex-start;
    }
    :host ::ng-deep .notifications-menu .mdc-list-item {
      min-height: 0;
    }
    :host ::ng-deep .notifications-menu .mat-mdc-list-item .mdc-list-item__content {
      gap: 2px;
    }
    :host ::ng-deep .notifications-menu .mat-mdc-list-item .mdc-list-item__primary-text {
      font-size: 0.76rem;
      line-height: 1.25;
    }
    :host ::ng-deep .notifications-menu .mat-mdc-list-item .mdc-list-item__supporting-text {
      font-size: 0.72rem;
      margin-top: 2px;
    }
    :host ::ng-deep .notifications-menu .mat-mdc-list-item mat-icon,
    :host ::ng-deep .notifications-menu .mat-mdc-list-item [matListItemMeta] mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    :host ::ng-deep .notifications-menu .m-x-16 {
      margin-left: 6px !important;
      margin-right: 6px !important;
    }
    :host ::ng-deep .notifications-menu [matListItemMeta] .mat-mdc-icon-button {
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
    }
    .actions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--mat-sys-surface);
      padding: 4px 8px;
    }
    .actions-row-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .pager-group,
    .actions-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .page-indicator {
      font-size: 0.72rem;
      line-height: 1.2;
      opacity: 0.8;
    }
    :host ::ng-deep .notifications-menu .mat-mdc-list-item .mdc-list-item__supporting-text {
      display: -webkit-box;
      -webkit-line-clamp: 12;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: normal;
      max-width: none;
      width: 100%;
    }
  `,
})
export class NotificationComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  unreadCount = 0;
  notifications: any[] = [];
  pageSize = 5;
  currentPage = 1;
  private userId: number | string | null = null;
  private dataUpdatedHandler = () => this.refresh();

  ngOnInit(): void {
    const u = this.auth.getCurrentUserValue();
    this.userId = u?.id ?? null;
    this.refresh();
    window.addEventListener('app:data-updated', this.dataUpdatedHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('app:data-updated', this.dataUpdatedHandler);
  }

  refresh(): void {
    if (!this.userId) return;
    this.http.get<any[]>(`/api/notificacoes/${this.userId}`).subscribe({
      next: list => {
        const raw = Array.isArray(list) ? list : [];
        this.notifications = raw.filter(n => {
          const fonte =
            n?.fonte ?? n?.sourceType ?? n?.tipoFonte ?? n?.fonteTipo ?? null;
          return fonte === 1;
        });
        this.setPageWithinBounds();
      },
      error: () => {
        this.notifications = [];
        this.setPageWithinBounds();
      },
    });
    this.http.get<any[]>(`/api/notificacoes/${this.userId}/nao-lidas`).subscribe({
      next: list => {
        if (Array.isArray(list)) {
          const filtered = list.filter(n => {
            const rawFonte = n?.fonte ?? n?.sourceType ?? n?.tipoFonte ?? n?.fonteTipo ?? null;
            const fonteNum = typeof rawFonte === 'string' ? parseInt(rawFonte, 10) : rawFonte;
            return fonteNum === 1;
          });
          this.unreadCount = filtered.length;
        } else {
          this.unreadCount = 0;
        }
      },
      error: () => {
        this.unreadCount = 0;
      },
    });
  }

  get totalPages(): number {
    const t = Math.ceil((this.notifications?.length || 0) / this.pageSize);
    return Number.isFinite(t) && t > 0 ? t : 0;
  }

  get pageNotifications(): any[] {
    if (!Array.isArray(this.notifications) || this.notifications.length === 0) return [];
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.notifications.slice(start, end);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  private setPageWithinBounds(): void {
    if (this.totalPages === 0) {
      this.currentPage = 1;
      return;
    }
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

  markAsRead(n: any): void {
    if (!n?.id) return;
    this.http.put<void>(`/api/notificacoes/${n.id}/ler`, {}).subscribe({
      next: () => {
        this.snack.open('Notificação marcada como lida', 'Fechar', { duration: 2000 });
        this.refresh();
      },
      error: () => {
        this.snack.open('Falha ao marcar como lida', 'Fechar', { duration: 2000 });
      },
    });
  }

  delete(n: any): void {
    if (!n?.id) return;
    this.http.delete<void>(`/api/notificacoes/${n.id}`).subscribe({
      next: () => {
        this.snack.open('Notificação excluída', 'Fechar', { duration: 2000 });
        this.refresh();
      },
      error: () => {
        this.snack.open('Falha ao excluir', 'Fechar', { duration: 2000 });
      },
    });
  }

  markAllAsRead(): void {
    const ids = this.notifications.filter(n => !n?.lida && n?.id).map(n => n.id);
    if (ids.length === 0) return;
    const reqs = ids.map(id => this.http.put<void>(`/api/notificacoes/${id}/ler`, {}));
    Promise.all(reqs.map(r => r.toPromise()))
      .then(() => {
        this.snack.open('Todas notificações visualizadas', 'Fechar', { duration: 2500 });
        this.refresh();
      })
      .catch(() => {
        this.snack.open('Falha ao visualizar todas', 'Fechar', { duration: 2500 });
      });
  }

  deleteAll(): void {
    const ids = this.notifications.filter(n => n?.id).map(n => n.id);
    if (ids.length === 0) return;
    const reqs = ids.map(id => this.http.delete<void>(`/api/notificacoes/${id}`));
    Promise.all(reqs.map(r => r.toPromise()))
      .then(() => {
        this.snack.open('Todas notificações excluídas', 'Fechar', { duration: 2500 });
        this.refresh();
      })
      .catch(() => {
        this.snack.open('Falha ao excluir todas', 'Fechar', { duration: 2500 });
      });
  }
}

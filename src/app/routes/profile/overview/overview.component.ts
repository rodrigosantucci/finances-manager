import { Component, inject, OnInit, OnDestroy, PLATFORM_ID, AfterViewInit, Renderer2, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '@core/authentication';
import { isPlatformBrowser } from '@angular/common';
import { SettingsService } from '@core/bootstrap/settings.service';

// Imports do Angular Material para o botão e ícone
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProfileSettingsComponent } from '../settings/settings.component';
import { AiSettingsComponent } from 'app/routes/profile/ai-settings/ai-settings.component';
import { TranslateModule } from '@ngx-translate/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClient } from '@angular/common/http';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDateFnsModule } from '@angular/material-date-fns-adapter';

@Component({
  selector: 'app-profile-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    ProfileSettingsComponent,
    AiSettingsComponent,
    TranslateModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatDateFnsModule
  ],
})
export class ProfileOverviewComponent implements OnInit, OnDestroy, AfterViewInit {

  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly renderer = inject(Renderer2);
  private readonly settings = inject(SettingsService);
  private readonly http = inject(HttpClient);

  public usersDataSource = new MatTableDataSource<any>([]);
  public displayedColumns: string[] = ['id', 'username', 'email', 'roles', 'lastLogin', 'createdAt', 'premiumUntil', 'premium', 'actions'];
  public editingUser: any | null = null;
  public selectedUserId: number | null = null;
  public searchValue = '';
  public pageSize = 5;
  public totalUsers = 0;
  public loadingUsers = false;
  public pageIndex = 0;
  public sortActive = '';
  public sortDirection: 'asc' | 'desc' | '' = '';
  public premiumActivationId: number | null = null;
  public premiumUntilInput: Date | null = null;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
   // console.log('ProfileOverviewComponent OnInit');
    // Sua lógica de OnInit existente (ex: subscrição a mudanças de tema) pode permanecer aqui.
    if (this.isAdmin) {
      this.usersDataSource.filterPredicate = (data, filter) => {
        const f = (filter || '').toLowerCase();
        const id = String(data?.id ?? '').toLowerCase();
        const username = String(data?.username ?? '').toLowerCase();
        const email = String(data?.email ?? '').toLowerCase();
        const roles = Array.isArray(data?.roles) ? data.roles.map((r: any) => String(typeof r === 'string' ? r : (r?.name ?? r?.role ?? r?.id ?? ''))).join(',').toLowerCase() : String(data?.roles ?? '').toLowerCase();
        return id.includes(f) || username.includes(f) || email.includes(f) || roles.includes(f);
      };
      this.loadAllUsers();
    }
  }

  ngAfterViewInit() {
    if (this.isAdmin) {
      this.usersDataSource.paginator = this.paginator;
      this.usersDataSource.sort = this.sort;
    }
  }

  ngOnDestroy() {
    // Sua lógica de OnDestroy existente (ex: cancelar subscrição de tema) pode permanecer aqui.
  }

  get isAdmin(): boolean {
    const user = this.authService.getCurrentUserValue();
    const roles = user?.roles;
    if (!roles || !Array.isArray(roles)) return false;
    return roles.some((r: any) => {
      if (typeof r === 'string') return r.toUpperCase() === 'ADMIN';
      const name = r?.name || r?.role || r?.id || '';
      return String(name).toUpperCase() === 'ADMIN';
    });
  }

  /**
   * Método público para acionar o recarregamento do widget do TradingView.
   * Gerencia o estado de 'isLoading' para feedback visual (ex: ícone girando).
   */
  

  public formatRoles(roles: any): string {
    if (roles === undefined || roles === null) return '';
    if (Array.isArray(roles)) {
      return roles
        .map(r => {
          const v = typeof r === 'string' ? r : (r?.name ?? r?.role ?? r?.id ?? '');
          return String(v);
        })
        .filter(v => v && v.length > 0)
        .join(', ');
    }
    if (typeof roles === 'string') return roles;
    if (typeof roles === 'object') {
      const v = roles?.name ?? roles?.role ?? roles?.id ?? '';
      return String(v);
    }
    return String(roles);
  }

  public startEdit(user: any): void {
    this.editingUser = { ...user };
  }

  public cancelEdit(): void {
    this.editingUser = null;
  }

  public onEditField(field: string, value: any): void {
    if (this.editingUser) {
      this.editingUser[field] = value;
    }
  }

  public saveEdit(): void {
    if (!this.editingUser || !this.editingUser.id) return;
    const id = this.editingUser.id;
    this.http.put<any>(`/api/usuarios/${id}`, this.editingUser).subscribe({
      next: updated => {
        const data = this.usersDataSource.data.map(u => (u.id === id ? updated : u));
        this.usersDataSource.data = data;
        this.editingUser = null;
      },
      error: err => {
        console.error('Erro ao atualizar usuário', err);
      },
    });
  }

  public activatePremium(user: any): void {
    if (!user?.id) return;
    const id = user.id;
    this.http.post<void>(`/api/usuarios/${id}/assinatura/premium/ativar`, {}).subscribe({
      next: () => {
        if (this.isAdmin) {
          this.loadAllUsers();
        } else {
          this.loadCurrentUser();
        }
      },
      error: err => {
        console.error('Erro ao ativar premium', err);
      },
    });
  }
 
  public deactivatePremium(user: any): void {
    if (!user?.id) return;
    const id = user.id;
    this.http.post<void>(`/api/usuarios/${id}/assinatura/premium/desativar`, {}).subscribe({
      next: () => {
        if (this.isAdmin) {
          this.loadAllUsers();
        } else {
          this.loadCurrentUser();
        }
      },
      error: err => {
        console.error('Erro ao desativar premium', err);
      },
    });
  }

  public startActivatePremium(user: any): void {
    this.premiumActivationId = user?.id ?? null;
    this.premiumUntilInput = user?.premiumUntil ? new Date(user.premiumUntil) : null;
  }

  public cancelActivatePremium(): void {
    this.premiumActivationId = null;
    this.premiumUntilInput = null;
  }

  public confirmActivatePremium(user: any): void {
    if (!user?.id) return;
    const id = user.id;
    const body: any = {};
    if (this.premiumUntilInput instanceof Date && !isNaN(this.premiumUntilInput.getTime())) {
      body.premiumUntil = this.premiumUntilInput.toISOString();
    }
    this.http.post<void>(`/api/usuarios/${id}/assinatura/premium/ativar`, body).subscribe({
      next: () => {
        this.premiumActivationId = null;
        this.premiumUntilInput = null;
        if (body.premiumUntil) {
          this.usersDataSource.data = this.usersDataSource.data.map(u => u.id === id ? { ...u, premiumUntil: new Date(body.premiumUntil) } : u);
        }
        if (this.isAdmin) {
          this.loadAllUsers();
        } else {
          this.loadCurrentUser();
        }
      },
      error: err => {
        console.error('Erro ao ativar premium', err);
      },
    });
  }

  private normalizeUser(u: any): any {
    const parse = (v: any): Date | null => {
      if (!v) return null;
      if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
      if (typeof v === 'string' || typeof v === 'number') {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    };
    return {
      ...u,
      createdAt: parse(u?.createdAt),
      lastLogin: parse(u?.lastLogin),
      premiumUntil: parse(u?.premiumUntil),
    };
  }
 
  public deleteUser(user: any): void {
    if (!user || !user.id) return;
    const id = user.id;
    this.http.delete<void>(`/api/usuarios/${id}`).subscribe({
      next: () => {
        this.usersDataSource.data = this.usersDataSource.data.filter(u => u.id !== id);
        this.totalUsers = this.usersDataSource.data.length;
      },
      error: err => {
        console.error('Erro ao excluir usuário', err);
      },
    });
  }
 
  public applyFilter(val: string): void {
    this.searchValue = val;
    this.usersDataSource.filter = (val || '').trim().toLowerCase();
  }
 
  private loadCurrentUser(): void {
    this.loadingUsers = true;
    const current = this.authService.getCurrentUserValue();
    const id = current?.id;
    if (id === undefined || id === null) {
      this.usersDataSource.data = [];
      this.totalUsers = 0;
      this.loadingUsers = false;
      return;
    }
    this.http.get<any>(`/api/usuarios/${id}`).subscribe({
      next: user => {
        const normalized = user ? [this.normalizeUser(user)] : [];
        this.usersDataSource.data = normalized;
        this.totalUsers = this.usersDataSource.data.length;
        this.loadingUsers = false;
        if (this.paginator) {
          this.paginator.pageSize = this.pageSize;
          this.paginator.firstPage();
        }
      },
      error: () => {
        this.usersDataSource.data = [];
        this.totalUsers = 0;
        this.loadingUsers = false;
      },
    });
  }

  private loadAllUsers(): void {
    this.loadingUsers = true;
    this.http.get<any[]>(`/api/usuarios`).subscribe({
      next: users => {
        const normalized = Array.isArray(users) ? users.map(u => this.normalizeUser(u)) : [];
        this.usersDataSource.data = normalized;
        this.totalUsers = this.usersDataSource.data.length;
        this.loadingUsers = false;
        if (this.paginator) {
          this.paginator.pageSize = this.pageSize;
          this.paginator.firstPage();
        }
      },
      error: () => {
        this.usersDataSource.data = [];
        this.totalUsers = 0;
        this.loadingUsers = false;
      },
    });
  }

  public resetPassword(user: any): void {
    if (!user?.id) return;
    this.http.post<void>(`/api/usuarios/resetar-senha`, { id: user.id }).subscribe({
      next: () => {
        console.log('Senha resetada para usuário', user.id);
      },
      error: err => {
        console.error('Erro ao resetar senha', err);
      },
    });
  }

  /**
   * Carrega o script do TradingView e o anexa ao DOM.
   * Retorna uma Promise que resolve quando o script é carregado ou rejeita em caso de erro.
   */
  

  
}

import { Component, EventEmitter, Input, Output, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SmartImportModalComponent } from '../smart-import-modal/smart-import-modal.component';
import { SettingsService } from '@app/routes/profile/settings/settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, of } from 'rxjs';
import { AssistantService } from '@app/routes/ia/assistant/assistant.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@core';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-actions',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, TranslateModule, MatDialogModule],
  templateUrl: './dashboard-actions.component.html',
  styleUrls: ['./dashboard-actions.component.scss']
})
export class DashboardActionsComponent implements OnInit, OnDestroy {
  @Input() isUpdating = false;
  @Output() addTransaction = new EventEmitter<void>();
  @Output() refreshData = new EventEmitter<void>();
  @Input() showCard = true;

  isSmartImportEnabled = false;
  smartImportTooltip = '';

  private readonly settingsService = inject(SettingsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly assistantService = inject(AssistantService);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private settingsSubscription!: Subscription;

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    this.checkSmartImportStatus();
    this.settingsSubscription = this.settingsService.aiSettingsUpdated.subscribe(() => {
      this.checkSmartImportStatus();
    });
  }

  ngOnDestroy(): void {
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
  }

  checkSmartImportStatus(): void {
    const userId = this.authService.user().value?.id;
    if (!userId) {
      this.isSmartImportEnabled = false;
      this.smartImportTooltip = 'Nenhuma API Key encontrada. Só é possível usar funcionalidades de IA com ao menos uma API Key preenchida.';
      return;
    }

    this.http.get<{ openaiValid: boolean; geminiValid: boolean; openaiMessage: string; geminiMessage: string }>(`/api/usuarios/${userId}/llm/keys/validate`).pipe(
      catchError(() => of({ openaiValid: false, geminiValid: false, openaiMessage: '', geminiMessage: '' }))
    ).subscribe(res => {
      if (res.openaiValid || res.geminiValid) {
        this.isSmartImportEnabled = true;
        this.smartImportTooltip = '';
      } else {
        this.isSmartImportEnabled = false;
        this.smartImportTooltip = 'Para usar o Smart Import, configure suas chaves de API OpenAI ou Gemini nas configurações de IA.';
      }
    });
  }

  openSmartImport() {
    if (!this.isSmartImportEnabled) {
      this.snackBar.open(this.smartImportTooltip, 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }
    this.dialog.open(SmartImportModalComponent, {
      width: '400px',
      height: '100vh',
      position: { right: '0px' },
      panelClass: 'smart-import-modal-panel', // Classe CSS para estilização adicional
      autoFocus: false,
    }).afterClosed().subscribe(result => {
      if (result) {
        console.log('File uploaded:', result);
        this.snackBar.open('Processando arquivo com IA...', 'Fechar', { duration: 3000 });
        this.assistantService.processFileWithAI(result).subscribe({
          next: (response: any) => {
            this.snackBar.open('Arquivo processado com sucesso!', 'Fechar', { duration: 5000 });
            this.refreshData.emit(); // Refresh dashboard data after successful import
          },
          error: (error: any) => {
            console.error('Erro ao processar arquivo com IA:', error);
            this.snackBar.open('Erro ao processar arquivo com IA. Verifique suas chaves de API e tente novamente.', 'Fechar', { duration: 5000 });
          }
        });
      }
    });
  }
}

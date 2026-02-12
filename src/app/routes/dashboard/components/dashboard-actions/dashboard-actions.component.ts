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
import { Subscription } from 'rxjs';

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
    const aiSettings = this.settingsService.getAISettings();
    const hasOpenAIKey = aiSettings.openaiApiKey && aiSettings.openaiApiKey.length > 0;
    const hasGeminiKey = aiSettings.geminiApiKey && aiSettings.geminiApiKey.length > 0;

    if (hasOpenAIKey || hasGeminiKey) {
      this.isSmartImportEnabled = true;
      this.smartImportTooltip = '';
    } else {
      this.isSmartImportEnabled = false;
      this.smartImportTooltip = 'Para usar o Smart Import, configure suas chaves de API OpenAI ou Gemini nas configurações de IA.';
    }
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
    });
  }
}

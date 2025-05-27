import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { CommonModule } from '@angular/common'; // Importar CommonModule se não for standalone ou se for usar ngIf/ngFor

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string; // Texto para o botão de confirmar (opcional, padrão "Confirmar")
  cancelText?: string;  // Texto para o botão de cancelar (opcional, padrão "Cancelar")
}

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  standalone: true, // Adicionar standalone: true se for um componente standalone
  imports: [
    CommonModule, // Necessário para diretivas como ngIf, se usadas
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
  ],
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // Importação adicionada
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-transaction-summary-dialog',
  standalone: true,
  imports: [
    CommonModule, // Adicionado aqui
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    TranslateModule
  ],
  templateUrl: './transaction-summary-dialog.component.html',
  styleUrl: './transaction-summary-dialog.component.css'
})
export class TransactionSummaryDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<TransactionSummaryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { transactions: any[], balance: number, totalVendas: number, totalCompras: number }
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }
}
